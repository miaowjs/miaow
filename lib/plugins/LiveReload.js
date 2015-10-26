var _ = require('lodash');
var mutil = require('miaow-util');
var console = mutil.console;
var freeport = require('freeport');
var http = require('http');
var WebSocketServer = require('ws').Server;
var url = require('url');

function LiveReload() {
}

LiveReload.prototype.apply = function(compiler) {
  var liveReload = this;

  compiler.plugin('watch', function(callback) {
    freeport(function(err, port) {
      if (err) {
        console.warn('获取端口失败, 不能启动自动刷新功能');
      } else {
        liveReload.liveReloadPort = port;
        liveReload.createServer(port);
      }

      callback();
    });
  });

  compiler.plugin('create-taskContext', function(taskContext) {
    if (liveReload.port) {
      taskContext.liveReloadPort = liveReload.port;
    }
  });

  compiler.plugin('compile-success', this.update.bind(this));
};

LiveReload.prototype.createServer = function(port) {
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
  this.moduleDestHashMap = {};
};

LiveReload.prototype.update = function(compilation, callback) {
  var liveReload = this;
  var modules = compilation.modules;
  var lastModifyTimestampMap = this.lastModifyTimestampMap;
  var moduleDestHashMap = this.moduleDestHashMap;

  function isChanged(module) {
    if (module.destHash !== moduleDestHashMap[module.src]) {
      return true;
    }

    return _.some(module.fileDependencies, function(src) {
      return isChanged(_.find(modules, {src: src}));
    });
  }

  if (_.size(lastModifyTimestampMap) === 0) {
    _.each(modules, function(module) {
      lastModifyTimestampMap[module.src] = compilation.startTime.getTime();
    });
  } else {
    _.each(modules, function(module) {
      if (isChanged(module)) {
        lastModifyTimestampMap[module.src] = compilation.startTime.getTime();
        liveReload.onExpire(module.src);
      }
    });
  }

  _.each(modules, function(module) {
    moduleDestHashMap[module.src] = module.destHash;
  });

  callback();
};

LiveReload.prototype.onConnect = function(client) {
  var liveReload = this;

  client.on('message', function incoming(message) {
    message = JSON.parse(message);
    var src = message.src;
    var timestamp = message.timestamp;

    var clientList = (liveReload.webSocketClientMap[src] = liveReload.webSocketClientMap[src] || []);
    clientList.push(client);

    var lastModifyTimestamp = liveReload.lastModifyTimestampMap[src];
    if (lastModifyTimestamp && lastModifyTimestamp > timestamp) {
      liveReload.onExpire(src);
    }

    // 客户端离线的时候，删除客户端的引用
    client.on('close', function close() {
      var index = clientList.indexOf(client);
      if (index !== -1) {
        clientList.splice(clientList.indexOf(client), 1);
      }
    });
  });
};

LiveReload.prototype.onRequest = function(request, response) {
  var urlObj = url.parse(request.url, true);

  if (urlObj.pathname !== '/livereload') {
    response.statusCode = 404;
    response.end();
    return;
  }

  var query = urlObj.query || {};
  var src = query.src;
  var timestamp = query.timestamp;
  var callback = query.callback;
  var isExpire = false;

  if (src && timestamp) {
    var lastModifyTimestamp = this.lastModifyTimestampMap[src];
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

LiveReload.prototype.onExpire = function(src) {
  var clientList = this.webSocketClientMap[src] || [];

  clientList.forEach(function(client) {
    try {
      client.send(JSON.stringify({
        isExpire: true
      }));
    } catch (err) {
    }
  });
};

module.exports = LiveReload;
