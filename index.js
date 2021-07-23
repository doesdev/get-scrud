'use strict';

var request = require('axios');
var ms = require('pico-ms');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var request__default = /*#__PURE__*/_interopDefaultLegacy(request);
var ms__default = /*#__PURE__*/_interopDefaultLegacy(ms);

function _typeof(obj) {
  "@babel/helpers - typeof";

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

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
  try {
    var info = gen[key](arg);
    var value = info.value;
  } catch (error) {
    reject(error);
    return;
  }

  if (info.done) {
    resolve(value);
  } else {
    Promise.resolve(value).then(_next, _throw);
  }
}

function _asyncToGenerator(fn) {
  return function () {
    var self = this,
        args = arguments;
    return new Promise(function (resolve, reject) {
      var gen = fn.apply(self, args);

      function _next(value) {
        asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
      }

      function _throw(err) {
        asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
      }

      _next(undefined);
    });
  };
}

function _slicedToArray(arr, i) {
  return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest();
}

function _arrayWithHoles(arr) {
  if (Array.isArray(arr)) return arr;
}

function _iterableToArrayLimit(arr, i) {
  var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"];

  if (_i == null) return;
  var _arr = [];
  var _n = true;
  var _d = false;

  var _s, _e;

  try {
    for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) {
      _arr.push(_s.value);

      if (i && _arr.length === i) break;
    }
  } catch (err) {
    _d = true;
    _e = err;
  } finally {
    try {
      if (!_n && _i["return"] != null) _i["return"]();
    } finally {
      if (_d) throw _e;
    }
  }

  return _arr;
}

function _unsupportedIterableToArray(o, minLen) {
  if (!o) return;
  if (typeof o === "string") return _arrayLikeToArray(o, minLen);
  var n = Object.prototype.toString.call(o).slice(8, -1);
  if (n === "Object" && o.constructor) n = o.constructor.name;
  if (n === "Map" || n === "Set") return Array.from(o);
  if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
}

function _arrayLikeToArray(arr, len) {
  if (len == null || len > arr.length) len = arr.length;

  for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];

  return arr2;
}

function _nonIterableRest() {
  throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}

var actionList = ['search', 'create', 'read', 'update', 'delete'];

var bodyToQuery = function bodyToQuery() {
  var body = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  return Object.keys(body).map(function (k) {
    var bodyRef = body[k];
    var isAry = Array.isArray(bodyRef);
    if (isAry) k = k.replace(/\[]$/, '');
    var uK = encodeURIComponent(k);
    return isAry ? bodyRef.map(function (v) {
      return "".concat(uK, "[]=").concat(encodeURIComponent(v));
    }).join('&') : "".concat(uK, "=").concat(encodeURIComponent(bodyRef));
  }).join('&');
};

var actions = {
  search: function search(id, body) {
    return ['GET', "?".concat(bodyToQuery(body))];
  },
  create: function create(id, body) {
    return ['POST', null];
  },
  read: function read(id, body) {
    return ['GET', "/".concat(id).concat(body ? "?".concat(bodyToQuery(body)) : '')];
  },
  update: function update(id, body) {
    return ['PUT', "/".concat(id)];
  },
  delete: function _delete(id, body) {
    return ['DELETE', "/".concat(id)];
  }
};
var defTimeout = ms__default['default']('1m');
var cached;
var source = (function () {
  var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  if (opts.cache && cached) return cached;

  var setOpts = function setOpts(altOpts) {
    opts.port = opts.port || 443;
    opts.timeout = (opts.timeout ? ms__default['default'](opts.timeout) : defTimeout) || defTimeout;
    opts.basePath = opts.basePath ? "/".concat(opts.basePath.replace(/^\//, '')) : '';
    var altPort = opts.host && opts.port !== 80 && opts.port !== 443;

    if (altPort && opts.host.indexOf(":".concat(opts.port)) === -1) {
      opts.host = "".concat(opts.host, ":").concat(opts.port);
    }

    if (altOpts) Object.assign(opts, altOpts);
    opts.before = typeof opts.before === 'function' ? opts.before : null;
  };

  setOpts();

  var sendRequest = /*#__PURE__*/function () {
    var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(api, action, options) {
      var _yield$request, _yield$request$data, data;

      return regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              if (!opts.before) {
                _context.next = 3;
                break;
              }

              _context.next = 3;
              return opts.before(api, action, options);

            case 3:
              _context.next = 5;
              return request__default['default'](options);

            case 5:
              _yield$request = _context.sent;
              _yield$request$data = _yield$request.data;
              data = _yield$request$data === void 0 ? {} : _yield$request$data;

              if (!data.error) {
                _context.next = 10;
                break;
              }

              throw data.error;

            case 10:
              return _context.abrupt("return", 'data' in data ? data.data : data);

            case 11:
            case "end":
              return _context.stop();
          }
        }
      }, _callee);
    }));

    return function sendRequest(_x, _x2, _x3) {
      return _ref.apply(this, arguments);
    };
  }();

  var getScrud = function getScrud(api, action, id, body, jwt) {
    if (api && _typeof(api) === 'object') return setOpts(api);
    return new Promise(function (resolve, reject) {
      if (!Number.isInteger(id) && typeof id !== 'string') {
        jwt = body;
        body = id;
        id = null;
      }

      var handleError = function handleError(e) {
        e = e || {};
        var res = e.response || {};
        if ((res.data || {}).error) return reject(new Error(res.data.error));
        if (res.status === 401) return reject(new Error('Unauthorized'));
        if (e.code === 'ECONNRESET') return reject(new Error('Request timeout'));
        return reject(e);
      };

      if (_typeof(body) !== 'object') {
        jwt = body;
        body = null;
      }

      jwt = jwt || opts.jwt;
      if (!actions[action]) return reject(new Error('Action not SCRUD-y'));

      var _actions$action = actions[action](id, body),
          _actions$action2 = _slicedToArray(_actions$action, 2),
          method = _actions$action2[0],
          path = _actions$action2[1];

      var protocol = opts.protocol || (opts.port === 443 ? 'https' : 'http');
      var reqPath = "".concat(opts.basePath, "/").concat(api.toLowerCase()).concat(path || '');
      var options = {
        url: "".concat(protocol, "://").concat(opts.host).concat(reqPath),
        method: method,
        data: body,
        timeout: opts.timeout,
        maxBodyLength: opts.maxBodyLength,
        maxContentLength: opts.maxContentLength,
        headers: {
          'Content-Type': 'application/json'
        }
      };
      if (jwt) options.headers.Authorization = "Bearer ".concat(jwt);
      sendRequest(api, action, options).then(resolve).catch(handleError);
    });
  };

  actionList.forEach(function (a) {
    getScrud[a] = function (api, id, body, jwt) {
      return getScrud(api, a, id, body, jwt);
    };
  });
  if (opts.cache) cached = getScrud;
  return getScrud;
});

module.exports = source;
