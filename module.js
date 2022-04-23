import request from 'axios';
import ms from 'pico-ms';
import throttler from 'ricks-bricks';

function _typeof(obj) {
  "@babel/helpers - typeof";

  return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) {
    return typeof obj;
  } : function (obj) {
    return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
  }, _typeof(obj);
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

var defTimeout = ms('1m');
var throttleInterval = ms('45s');
var maxCallsPerInterval = 45;
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

var ensurePromise = function ensurePromise(fn) {
  return new Promise(function (resolve, reject) {
    try {
      return resolve(fn());
    } catch (ex) {
      return reject(ex);
    }
  });
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
var cached;
var source = (function () {
  var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  if (opts.cache && cached) return cached;
  opts._instance = "".concat(Date.now()).concat(Math.random().toString(36));

  var setOpts = function setOpts(altOpts) {
    opts.port = opts.port || 443;
    opts.timeout = (opts.timeout ? ms(opts.timeout) : defTimeout) || defTimeout;
    opts.basePath = opts.basePath ? "/".concat(opts.basePath.replace(/^\//, '')) : '';
    var altPort = opts.host && opts.port !== 80 && opts.port !== 443;

    if (altPort && opts.host.indexOf(":".concat(opts.port)) === -1) {
      opts.host = "".concat(opts.host, ":").concat(opts.port);
    }

    if (altOpts) Object.assign(opts, altOpts);
    opts.before = typeof opts.before === 'function' ? opts.before : null;
    opts.throttleOpts = _typeof(opts.throttle) === 'object' ? opts.throttle : {};
    var excludeIn = opts.throttleOpts.exclude;
    var excluded = Array.isArray(excludeIn) ? excludeIn : [];
    opts.throttleExclude = Object.fromEntries(excluded.map(function (excl) {
      if (typeof excl === 'string') return [excl, true];
      var ary = Array.isArray(excl) ? excl : [excl.api, excl.action, excl.path];
      return [ary.filter(function (el) {
        return el;
      }).join(':'), true];
    }));
  };

  setOpts();

  var throttle = function throttle(api, action, path) {
    var _opts$throttleOpts = opts.throttleOpts,
        throttleOpts = _opts$throttleOpts === void 0 ? {} : _opts$throttleOpts;
    var resetAfter = ms(throttleOpts.interval || throttleInterval);
    var threshold = throttleOpts.threshold || maxCallsPerInterval;
    var excluded = opts.throttleExclude || {};

    var throttled = function throttled() {
      throw new Error('API calls have been throttled');
    };

    var sig = "".concat(api, ":").concat(action, ":").concat(path || '');
    if (excluded[sig] || excluded[api] || excluded["".concat(api, ":").concat(action)]) return;
    throttler("".concat(opts._instance, ":").concat(sig), throttled, {
      threshold: threshold,
      resetAfter: resetAfter
    });
  };

  var sendRequest = function sendRequest(options) {
    return request(options).then(function (_ref) {
      var data = _ref.data;
      if (data.error) throw data.error;
      return 'data' in data ? data.data : data;
    });
  };

  var getScrud = function getScrud(api, action, id, body, jwt, contextData) {
    if (api && _typeof(api) === 'object') return setOpts(api);
    return new Promise(function (resolve, reject) {
      if (!Number.isInteger(id) && typeof id !== 'string') {
        contextData = jwt;
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
        body = undefined;
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
      if (opts.throttle) throttle(api, action, path);
      if (jwt) options.headers.Authorization = "Bearer ".concat(jwt);

      if (opts.before) {
        var before = function before() {
          return opts.before(api, action, options, contextData);
        };

        return ensurePromise(before).then(function () {
          return sendRequest(options).then(resolve).catch(handleError);
        }).catch(handleError);
      }

      return sendRequest(options).then(resolve).catch(handleError);
    });
  };

  actionList.forEach(function (action) {
    getScrud[action] = function (api) {
      for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }

      return getScrud.apply(void 0, [api, action].concat(args));
    };
  });
  if (opts.cache) cached = getScrud;
  return getScrud;
});

export { source as default };
