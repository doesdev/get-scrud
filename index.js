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

const actions = {
  search: (id, body) => ['GET', `?${bodyToQuery(body)}`],
  create: (id, body) => ['POST', null],
  read: (id, body) => ['GET', `/${id}${body ? `?${bodyToQuery(body)}` : ''}`],
  update: (id, body) => ['PUT', `/${id}`],
  delete: (id, body) => ['DELETE', `/${id}`]
}

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

        if ((res.data || {}).error) return reject(new Error(res.data.error))
        if (res.status === 401) return reject(new Error('Unauthorized'))
        if (e.code === 'ECONNRESET') return reject(new Error('Request timeout'))

        return reject(e)
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
