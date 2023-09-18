'use strict'

import request from 'axios'
import ms from 'pico-ms'
import throttler from 'ricks-bricks'

const defTimeout = ms('1m')
const throttleInterval = ms('45s')
const maxCallsPerInterval = 45
const actionList = ['search', 'create', 'read', 'update', 'delete']

const bodyToQuery = (body) => {
  if (typeof body !== 'object') return ''

  return Object.keys(body).map((k) => {
    const bodyRef = body[k]
    const isAry = Array.isArray(bodyRef)
    if (isAry) k = k.replace(/\[]$/, '')
    const uK = encodeURIComponent(k)
    return isAry
      ? bodyRef.map((v) => `${uK}[]=${encodeURIComponent(v)}`).join('&')
      : `${uK}=${encodeURIComponent(bodyRef)}`
  }).join('&')
}

const ensurePromise = (fn) => new Promise((resolve, reject) => {
  try {
    return resolve(fn())
  } catch (ex) {
    return reject(ex)
  }
})

let cached

export default (opts = {}) => {
  if (opts.cache && cached) return cached

  opts._instance = `${Date.now()}${Math.random().toString(36)}`

  const setOpts = (altOpts) => {
    opts.port = opts.port || 443
    opts.timeout = (opts.timeout ? ms(opts.timeout) : defTimeout) || defTimeout
    opts.basePath = opts.basePath ? `/${opts.basePath.replace(/^\//, '')}` : ''

    const altPort = opts.host && opts.port !== 80 && opts.port !== 443

    if (altPort && opts.host.indexOf(`:${opts.port}`) === -1) {
      opts.host = `${opts.host}:${opts.port}`
    }

    if (altOpts) Object.assign(opts, altOpts)

    opts.before = typeof opts.before === 'function' ? opts.before : null
    opts.throttleOpts = typeof opts.throttle === 'object' ? opts.throttle : {}

    const { exclude: excludeIn } = opts.throttleOpts
    const excluded = Array.isArray(excludeIn) ? excludeIn : []

    opts.throttleExclude = Object.fromEntries(excluded.map((excl) => {
      if (typeof excl === 'string') return [excl, true]

      const ary = Array.isArray(excl) ? excl : [excl.api, excl.action, excl.path]

      return [ary.filter((el) => el).join(':'), true]
    }))
  }

  setOpts()

  const throttle = (api, action, path) => {
    const { throttleOpts = {} } = opts
    const resetAfter = ms(throttleOpts.interval || throttleInterval)
    const threshold = throttleOpts.threshold || maxCallsPerInterval
    const excluded = opts.throttleExclude || {}
    const throttled = () => { throw new Error('API calls have been throttled') }
    const sig = `${api}:${action}:${path || ''}`

    if (excluded[sig] || excluded[api] || excluded[`${api}:${action}`]) return

    throttler(`${opts._instance}:${sig}`, throttled, { threshold, resetAfter })
  }

  const actions = {
    search: (id, body) => {
      const qStr = bodyToQuery(body)
      const usePost = opts.autoPostSearch && qStr.length > 1500
      return usePost ? ['POST', '?_search=true'] : ['GET', `?${qStr}`]
    },
    create: (id, body) => ['POST', null],
    read: (id, body) => ['GET', `/${id}${body ? `?${bodyToQuery(body)}` : ''}`],
    update: (id, body) => ['PUT', `/${id}`],
    delete: (id, body) => ['DELETE', `/${id}`]
  }

  const sendRequest = (options) => {
    return request(options).then(({ data }) => {
      if (data.error) throw data.error

      return 'data' in data ? data.data : data
    })
  }

  const getScrud = (api, action, id, body, jwt, contextData) => {
    if (api && typeof api === 'object') return setOpts(api)

    return new Promise((resolve, reject) => {
      const idWellFormed = Number.isFinite(+id) || typeof id === 'string'

      if (!idWellFormed) {
        if (jwt) contextData = jwt
        if (typeof body === 'string') jwt = body
        if (typeof id === 'object') body = id

        id = undefined
      }

      const handleError = (e) => {
        e = e || {}
        const res = e.response || {}

        const errMap = {
          400: 'Bad Request',
          401: 'Unauthorized',
          402: 'Payment Required',
          403: 'Forbidden',
          404: 'Not Found',
          405: 'Method Not Allowed',
          406: 'Not Acceptable',
          407: 'Proxy Authentication Required',
          408: 'Request Timeout',
          409: 'Conflict',
          410: 'Gone',
          411: 'Length Required',
          412: 'Precondition Failed',
          413: 'Content Too Large',
          414: 'URI Too Long',
          415: 'Unsupported Media Type',
          416: 'Range Not Satisfiable',
          417: 'Expectation Failed',
          418: "I'm a teapot",
          421: 'Misdirected Request',
          422: 'Unprocessable Content',
          423: 'Locked',
          424: 'Failed Dependency',
          425: 'Too Early',
          426: 'Upgrade Required',
          428: 'Precondition Required',
          429: 'Too Many Requests',
          431: 'Request Header Fields Too Large',
          451: 'Unavailable For Legal Reasons',
          500: 'Internal Server Error',
          501: 'Not Implemented',
          502: 'Bad Gateway',
          503: 'Service Unavailable',
          504: 'Gateway Timeout',
          505: 'HTTP Version Not Supported',
          506: 'Variant Also Negotiates',
          507: 'Insufficient Storage',
          508: 'Loop Detected',
          510: 'Not Extended',
          511: 'Network Authentication Required'
        }

        const rejectError = (errIn, httpCode = res.status || 500) => {
          const httpError = res.statusText || errMap[httpCode] || 'Other error'
          return reject(Object.assign(new Error(errIn), { httpCode, httpError }))
        }

        if ((res.data || {}).error) return rejectError(res.data.error)
        if (res.status === 401) return rejectError('Unauthorized')
        if (e.code === 'ECONNRESET') return rejectError('Request timeout', 408)

        const filteredJson = (Boolean(jwt) && JSON.stringify(e)) || ''

        if (filteredJson.indexOf(jwt) !== -1) {
          try {
            e = JSON.parse(filteredJson.replaceAll(jwt, 'xxxxx'))
          } catch (ex) {
            delete e.config
            delete e.request
          }
        }

        return rejectError(e)
      }

      if (typeof body !== 'object') {
        if (jwt) contextData = jwt
        if (typeof body === 'string') jwt = body
        body = undefined
      }

      jwt = jwt || opts.jwt

      if (!actions[action]) return reject(new Error('Action not SCRUD-y'))

      const [method, path] = actions[action](id, body)
      const protocol = opts.protocol || (opts.port === 443 ? 'https' : 'http')
      const reqPath = `${opts.basePath}/${api.toLowerCase()}${(path || '')}`
      const options = {
        url: `${protocol}://${opts.host}${reqPath}`,
        method,
        data: body,
        timeout: opts.timeout,
        maxBodyLength: opts.maxBodyLength,
        maxContentLength: opts.maxContentLength,
        headers: { 'Content-Type': 'application/json' }
      }

      if (opts.throttle) throttle(api, action, path)

      if (jwt) options.headers.Authorization = `Bearer ${jwt}`

      if (opts.before) {
        const before = () => opts.before(api, action, options, contextData)

        return ensurePromise(before).then(() => {
          return sendRequest(options).then(resolve).catch(handleError)
        }).catch(handleError)
      }

      return sendRequest(options).then(resolve).catch(handleError)
    })
  }

  actionList.forEach((action) => {
    getScrud[action] = (api, id, body, jwt, contextData) => {
      return getScrud(api, action, id, body, jwt, contextData)
    }
  })

  if (opts.cache) cached = getScrud

  return getScrud
}
