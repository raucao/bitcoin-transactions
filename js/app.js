Ember.Handlebars.helper('satoshis_to_btc', function(value, options) {
  return value / 100000000;
});

Ember.Handlebars.helper('format_as_currency', function(value, options) {
  if (typeof value === 'undefined') { return ''; }
  return value.toFixed(2);
});

App = Ember.Application.create({
  bitcoinTransactions: [],
  bitcoinInfo: {}
});

App.Router.map(function() {
  // put your routes here
});

App.IndexRoute = Ember.Route.extend({
});

App.IndexController = Ember.ArrayController.extend({
  contentBinding: 'App.bitcoinTransactions',
  sortProperties: ['id'],
  sortAscending: false
});

App.Transaction = Ember.Object.extend({
  total: function() {
    // TODO don't count value if output address is same as input address
    var output = this.get('out');
    var sum = 0;
    output.forEach(function(tx){
      sum += tx.value;
    });
    return sum;
  }.property('out'),

  totalUSD: function() {
    var btc = this.get('total') / 100000000;
    var usd = App.get('bitcoinInfo.market_price_usd');
    return btc * usd;
  }.property('total', 'App.bitcoinInfo'),
});

// WS

var wsUri = "wss://ws.blockchain.info/inv";

function init() {
  output = document.getElementById("output");
  connectWebSocket();
  fetchGeneralInfo();
}

function connectWebSocket() {
  websocket = new WebSocket(wsUri);
  websocket.onopen = function(evt) { onOpen(evt); };
  websocket.onclose = function(evt) { onClose(evt); };
  websocket.onmessage = function(evt) { onMessage(evt); };
  websocket.onerror = function(evt) { onError(evt); };
}

function onOpen(evt) {
  console.log("CONNECTED");
  doSend( JSON.stringify({"op":"unconfirmed_sub"}) );
}

function onClose(evt) {
  console.log("DISCONNECTED");
}

function onMessage(evt) {
  // console.log(evt.data);
  var data = JSON.parse(evt.data);
  if (data.op && data.op === 'utx') {
    var transaction = App.Transaction.create(data.x);
    transaction.set('id', App.bitcoinTransactions.length);

    App.bitcoinTransactions.pushObject(transaction);
  }
}

function onError(evt) {
  console.error(evt.data);
}

function doSend(message) {
  console.log("SENT: " + message);
  websocket.send(message);
}

function fetchGeneralInfo() {
  $.getJSON("https://cors.5apps.com/?uri=http://blockchain.info/stats?format=json", function(data){
    App.set("bitcoinInfo", data);
  });
  setTimeout(fetchGeneralInfo, 10000);
}

init();
