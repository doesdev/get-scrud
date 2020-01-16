'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var request = _interopDefault(require('superagent'));
var ms = _interopDefault(require('pico-ms'));

function _typeof(obj) {
  if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
    _typeof = function (obj) {
      return typeof obj;
    };
  } else {
    _typeof = function (obj) {
      return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
    };
  }

  return _typeof(obj);
}

var defTimeout = ms('1m');
var hookErr = new Error('Request hook return falsy value, cancelling requst');
var actions = {
  search: {
    method: 'GET',
    hasBody: false,
    getPath: function getPath(id) {
      return '';
    }
  },
  create: {
    method: 'POST',
    hasBody: true,
    getPath: function getPath(id) {
      return '';
    }
  },
  read: {
    method: 'GET',
    hasBody: false,
    getPath: function getPath(id) {
      return "/".concat(id);
    }
  },
  update: {
    method: 'PUT',
    hasBody: true,
    getPath: function getPath(id) {
      return "/".concat(id);
    }
  },
  delete: {
    method: 'DELETE',
    hasBody: false,
    getPath: function getPath(id) {
      return "/".concat(id);
    }
  }
};
var cached;

var hasOwnProperty = function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
};

var source = (function () {
  var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  if (opts.cache && cached) return cached;

  var setOpts = function setOpts(altOpts) {
    opts.port = opts.port || 443;
    opts.timeout = (opts.timeout ? ms(opts.timeout) : defTimeout) || defTimeout;
    opts.basePath = opts.basePath ? "/".concat(opts.basePath.replace(/^\//, '')) : '';
    var altPort = opts.host && opts.port !== 80 && opts.port !== 443;

    if (altPort && opts.host.indexOf(":".concat(opts.port)) === -1) {
      opts.host = "".concat(opts.host, ":").concat(opts.port);
    }

    if (altOpts) Object.assign(opts, altOpts);
  };

  setOpts();

  var getScrud = function getScrud(api, action, id, body, jwt) {
    if (api && _typeof(api) === 'object') return setOpts(api);

    if (typeof opts.hook === 'function') {
      var err = opts.hook(api, action, id, body, jwt || opts.jwt);
      if (!err || err instanceof Error) throw err || hookErr;
    }

    return new Promise(function (resolve, reject) {
      if (!Number.isInteger(id) && typeof id !== 'string') {
        jwt = body;
        body = id;
        id = null;
      }

      if (_typeof(body) !== 'object') {
        jwt = body;
        body = null;
      }

      jwt = jwt || opts.jwt;
      var _actions$action = actions[action],
          method = _actions$action.method,
          hasBody = _actions$action.hasBody,
          getPath = _actions$action.getPath;
      if (!method) return reject(new Error('Action not SCRUD-y'));
      var protocol = opts.protocol || (opts.port === 443 ? 'https' : 'http');
      var reqPath = "".concat(opts.basePath, "/").concat(api.toLowerCase()).concat(getPath(id));
      var url = "".concat(protocol, "://").concat(opts.host).concat(reqPath);
      var req = request(method, url);
      req.set('Content-Type', 'application/json');

      if (hasBody) {
        req.send(body || '');
      } else {
        req.query(body || {});
      }

      if (jwt) req.set('Authorization', "Bearer ".concat(jwt));
      if (opts.timeout) req.timeout(opts.timeout);
      req.then(function (res) {
        var out = res.body || {};
        if (out.error) return reject(out.error);
        out = hasOwnProperty(out, 'data') ? out.data : out;
        return resolve(out);
      }).catch(function (e) {
        e = e || {};
        var res = e.response || {};
        if ((res.body || {}).error) return reject(new Error(res.data.error));
        if (res.status === 401) return reject(new Error('Unauthorized'));
        if (e.code === 'ECONNRESET') return reject(new Error('Request timeout'));
        return reject(e);
      });
    });
  };

  Object.keys(actions).forEach(function (a) {
    getScrud[a] = function (api, id, body, jwt) {
      return getScrud(api, a, id, body, jwt);
    };
  });
  if (opts.cache) cached = getScrud;
  return getScrud;
});

module.exports = source;
