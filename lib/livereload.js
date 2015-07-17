var http = require('http');
var WebSocketServer = require('ws').Server;
var url = require('url');

var LiveReload = function (port) {
  this.httpServer = http.createServer();
  this.httpServer.on('request', this.onRequest.bind(this));
  this.httpServer.listen(port);

  this.webSocketServer = new WebSocketServer({
    server: this.httpServer,
    path: '/livereload'
  });
  this.webSocketServer.on('connection', this.onConnect.bind(this));
  this.webSocketClientMap = {};

  this.lastModifyTimestampMap = {};
};

LiveReload.prototype.onConnect = function (client) {
  var liveReload = this;
  client.on('message', function incoming(message) {
    message = JSON.parse(message);
    var srcPath = message.srcPath;
    var timestamp = message.timestamp;

    var lastModifyTimestamp = liveReload.lastModifyTimestampMap[srcPath];
    if (lastModifyTimestamp && lastModifyTimestamp > timestamp) {
      try {
        client.send(JSON.stringify({
          isExpire: true
        }));
      } catch (err) {
      }
      return;
    }

    var clientList = liveReload.webSocketClientMap[srcPath] || [];
    clientList.push(client);

    liveReload.webSocketClientMap[srcPath] = clientList;

    client.on('close', function close() {
      var index = clientList.indexOf(client);
      if (index !== -1) {
        clientList.splice(clientList.indexOf(client), 1);
      }
    });
  });
};

LiveReload.prototype.onRequest = function (request, response) {
  var urlObj = url.parse(request.url, true);

  if (urlObj.pathname !== '/livereload') {
    response.statusCode = 404;
    response.end();
    return;
  }

  var query = urlObj.query || {};
  var srcPath = query.srcpath;
  var timestamp = query.timestamp;
  var callback = query.callback;
  var isExpire = false;

  if (srcPath && timestamp) {
    var lastModifyTimestamp = this.lastModifyTimestampMap[srcPath];
    if (lastModifyTimestamp && lastModifyTimestamp > timestamp) {
      isExpire = true;
    }
  }

  if (callback) {
    response.end(callback + '(' + (isExpire ? 'true' : 'false') + ');');
  } else {
    response.end(JSON.stringify({
      isExpire: isExpire
    }));
  }
};

LiveReload.prototype.change = function (srcPath, modifyTime) {
  this.lastModifyTimestampMap[srcPath] = modifyTime;

  var clientList = this.webSocketClientMap[srcPath];

  if (clientList && clientList.length) {
    clientList.forEach(function (client) {
      try {
        client.send(JSON.stringify({
          isExpire: true
        }));
      } catch (err) {
      }
    });
  }
};

module.exports = LiveReload;
