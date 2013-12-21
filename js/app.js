Ember.Handlebars.helper('satoshis_to_btc', function(value, options) {
  return value / 100000000;
});

Ember.Handlebars.helper('format_as_currency', function(value, options) {
  if (typeof value === 'undefined') { return ''; }
  return value.toFixed(2);
});

App = Ember.Application.create({
  bitcoinTransactions: [],
  bitcoinInfo: {},

  drawTransaction: function(transaction) {
    var speed;
    var total = transaction.get('totalBTC');
    var length = total;
    if (length < 2) { length = 2; }

    if (total < 1) {
      speed = 4;
    }
    else if (total < 10) {
      speed = 3;
    }
    else if (total < 50) {
      speed = 2;
    }
    else {
      speed = 1;
    }

    flakeArray[flakeArray.length] = new Flake({
      width: length,
      height: length,
      speed: Math.round(Math.random() * speed) + 1
    });
  }
});

App.Router.map(function() {
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
    var btc = this.get('totalBTC');
    var usd = App.get('bitcoinInfo.market_price_usd');
    return btc * usd;
  }.property('total', 'App.bitcoinInfo'),

  totalBTC: function() {
    return this.get('total') / 100000000;
  }.property('total')
});

App.IndexView = Ember.View.extend({
  didInsertElement: function() {
    initCanvas();
  }
});

// Websocket API

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
  var data = JSON.parse(evt.data);
  if (data.op && data.op === 'utx') {
    var transaction = App.Transaction.create(data.x);
    transaction.set('id', App.bitcoinTransactions.length);

    App.bitcoinTransactions.pushObject(transaction);

    App.drawTransaction(transaction);
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

// Visualization

var canvas = null;
var context = null;
var bufferCanvas = null;
var bufferCanvasCtx = null;
var flakeArray = [];

function initCanvas() {
  canvas = document.getElementById('visualizer');
  context = canvas.getContext("2d");

  bufferCanvas = document.createElement("canvas");
  bufferCanvas.width = canvas.width = window.innerWidth - 40;
  bufferCanvas.height = canvas.height = window.innerHeight / 3;
  bufferCanvasCtx = bufferCanvas.getContext("2d");

  draw();

  setInterval(animate, 30);
}

function animate() {
  update();
  draw();
}

function blank() {
  bufferCanvasCtx.fillStyle = "rgba(18, 18, 18, 1)";
  bufferCanvasCtx.fillRect(0, 0, canvas.width, canvas.height);
}

function update() {
  for (var i = 0; i < flakeArray.length; i++) {
    if (flakeArray[i].y < context.canvas.height) {
      flakeArray[i].y += flakeArray[i].speed;
      if (flakeArray[i].y > context.canvas.height) {
        flakeArray[i].y = -5;
      }
      flakeArray[i].x += flakeArray[i].drift;
      if (flakeArray[i].x > context.canvas.width) {
        flakeArray[i].x = 0;
      }
    }
  }
}

function Flake(options) {
  this.x = Math.round(Math.random() * context.canvas.width);
  this.y = -10;
  this.drift = Math.random();
  this.speed = options.speed || Math.round(Math.random() * 3) + 1;
  this.width = options.width;
  this.height = options.height;
}

function draw() {
  context.save();
  blank();
  for (var i = 0; i < flakeArray.length; i++) {
    bufferCanvasCtx.fillStyle = "rgba(136, 136, 136, 1)";
    bufferCanvasCtx.fillRect(flakeArray[i].x, flakeArray[i].y, flakeArray[i].width, flakeArray[i].height);
  }
  context.drawImage(bufferCanvas, 0, 0, bufferCanvas.width, bufferCanvas.height);
  context.restore();
}

init();
