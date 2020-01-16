'use strict'

import request from 'superagent'
import ms from 'pico-ms'

const defTimeout = ms('1m')
const hookErr = new Error('Request hook return falsy value, cancelling requst')

const actions = {
  search: { method: 'GET', hasBody: false, getPath: (id) => '' },
  create: { method: 'POST', hasBody: true, getPath: (id) => '' },
  read: { method: 'GET', hasBody: false, getPath: (id) => `/${id}` },
  update: { method: 'PUT', hasBody: true, getPath: (id) => `/${id}` },
  delete: { method: 'DELETE', hasBody: false, getPath: (id) => `/${id}` }
}

let cached

const hasOwnProperty = (obj, prop) => {
  return Object.prototype.hasOwnProperty.call(obj, prop)
}

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
  }

  setOpts()

  const getScrud = (api, action, id, body, jwt) => {
    if (api && typeof api === 'object') return setOpts(api)

    if (typeof opts.hook === 'function') {
      const err = opts.hook(api, action, id, body, jwt || opts.jwt)
      if (!err || err instanceof Error) throw err || hookErr
    }

    return new Promise((resolve, reject) => {
      if (!Number.isInteger(id) && typeof id !== 'string') {
        jwt = body
        body = id
        id = null
      }
      if (typeof body !== 'object') {
        jwt = body
        body = null
      }
      jwt = jwt || opts.jwt

      const { method, hasBody, getPath } = actions[action]

      if (!method) return reject(new Error('Action not SCRUD-y'))

      const protocol = opts.protocol || (opts.port === 443 ? 'https' : 'http')
      const reqPath = `${opts.basePath}/${api.toLowerCase()}${getPath(id)}`
      const url = `${protocol}://${opts.host}${reqPath}`

      const req = request(method, url)
      req.set('Content-Type', 'application/json')

      if (hasBody) {
        req.send(body || '')
      } else {
        req.query(body || {})
      }

      if (jwt) req.set('Authorization', `Bearer ${jwt}`)

      if (opts.timeout) req.timeout(opts.timeout)

      req.then((res) => {
        let out = res.body || {}
        if (out.error) return reject(out.error)
        out = hasOwnProperty(out, 'data') ? out.data : out
        return resolve(out)
      }).catch((e) => {
        e = e || {}
        const res = e.response || {}
        if ((res.body || {}).error) return reject(new Error(res.data.error))
        if (res.status === 401) return reject(new Error('Unauthorized'))
        if (e.code === 'ECONNRESET') return reject(new Error('Request timeout'))
        return reject(e)
      })
    })
  }

  Object.keys(actions).forEach((a) => {
    getScrud[a] = (api, id, body, jwt) => getScrud(api, a, id, body, jwt)
  })

  if (opts.cache) cached = getScrud

  return getScrud
}
