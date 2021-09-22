'use strict'

import request from 'axios'
import ms from 'pico-ms'
const actionList = ['search', 'create', 'read', 'update', 'delete']

const bodyToQuery = (body = {}) => {
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

const actions = {
  search: (id, body) => ['GET', `?${bodyToQuery(body)}`],
  create: (id, body) => ['POST', null],
  read: (id, body) => ['GET', `/${id}${body ? `?${bodyToQuery(body)}` : ''}`],
  update: (id, body) => ['PUT', `/${id}`],
  delete: (id, body) => ['DELETE', `/${id}`]
}

const defTimeout = ms('1m')
let cached

export default (opts = {}) => {
  if (opts.cache && cached) return cached

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
  }

  setOpts()

  const sendRequest = (options) => {
    return request(options).then(({ data }) => {
      if (data.error) throw data.error

      return 'data' in data ? data.data : data
    })
  }

  const getScrud = (api, action, id, body, jwt) => {
    if (api && typeof api === 'object') return setOpts(api)

    return new Promise((resolve, reject) => {
      if (!Number.isInteger(id) && typeof id !== 'string') {
        jwt = body
        body = id
        id = null
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
        jwt = body
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

      if (jwt) options.headers.Authorization = `Bearer ${jwt}`

      if (opts.before) {
        return opts.before(api, action, options).then(() => {
          return sendRequest(options).then(resolve).catch(handleError)
        }).catch(handleError)
      }

      return sendRequest(options).then(resolve).catch(handleError)
    })
  }

  actionList.forEach((a) => {
    getScrud[a] = (api, id, body, jwt) => getScrud(api, a, id, body, jwt)
  })

  if (opts.cache) cached = getScrud

  return getScrud
}
