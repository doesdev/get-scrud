import request from 'axios';
import ms from 'pico-ms';

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

function _slicedToArray(arr, i) {
  return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest();
}

function _arrayWithHoles(arr) {
  if (Array.isArray(arr)) return arr;
}

function _iterableToArrayLimit(arr, i) {
  var _arr = [];
  var _n = true;
  var _d = false;
  var _e = undefined;

  try {
    for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
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

function _nonIterableRest() {
  throw new TypeError("Invalid attempt to destructure non-iterable instance");
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
var defTimeout = ms('1m');
var cached;
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
        headers: {
          'Content-Type': 'application/json'
        }
      };
      if (jwt) options.headers.Authorization = "Bearer ".concat(jwt);
      request(options).then(function (res) {
        var out = res.data || {};
        if (out.error) return reject(out.error);
        out = out.hasOwnProperty('data') ? out.data : out;
        return resolve(out);
      }).catch(function (e) {
        e = e || {};
        var res = e.response || {};
        if ((res.data || {}).error) return reject((res.data || {}).error);
        if (res.status === 401) return reject(new Error('Unauthorized'));
        if (e.code === 'ECONNRESET') return reject(new Error('Request timeout'));
        return reject(e);
      });
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

export default source;
