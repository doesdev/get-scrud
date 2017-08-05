'use strict'

// Setup
const request = require('axios')
const ms = require('pico-ms')

// helpers
const bodyToQuery = (body) => {
  return Object.keys(body).map((k) => {
    let bodyRef = body[k]
    let isAry = Array.isArray(bodyRef)
    if (isAry) k = k.replace(/\[]$/, '')
    let uK = encodeURIComponent(k)
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

// globals
let defTimeout = ms('1m')

// Exports
module.exports = (opts = {}) => {
  let setOpts = (altOpts) => {
    opts.port = opts.port || 443
    opts.timeout = (opts.timeout ? ms(opts.timeout) : defTimeout) || defTimeout
    opts.basePath = opts.basePath ? `/${opts.basePath.replace(/^\//, '')}` : ''
    if (opts.host && opts.port !== 80 && opts.port !== 443) {
      opts.host = `${opts.host}:${opts.port}`
    }
    if (altOpts) Object.assign(opts, altOpts)
  }
  setOpts()
  return (api, action, id, body, jwt) => {
    if (api && typeof api === 'object') return setOpts(api)
    return new Promise((resolve, reject) => {
      if (!Number.isInteger(id)) {
        jwt = body
        body = id
        id = null
      }
      if (typeof body !== 'object') {
        jwt = body
        body = null
      }
      jwt = jwt || opts.jwt
      if (!actions[action]) return reject(new Error('Action not SCRUD-y'))
      let [method, path] = actions[action](id, body)
      let protocol = opts.protocol || (opts.port === 443 ? 'https' : 'http')
      let reqPath = `${opts.basePath}/${api.toLowerCase()}${(path || '')}`
      let options = {
        url: `${protocol}://${opts.host}${reqPath}`,
        method,
        data: body,
        timeout: opts.timeout,
        headers: {'Content-Type': 'application/json'}
      }
      if (jwt) options.headers.Authorization = `Bearer ${jwt}`

      request(options).then((res) => {
        let out = res.data || {}
        if (out.error) return reject(out.error)
        out = out.hasOwnProperty('data') ? out.data : out
        return resolve(out)
      }).catch((e) => {
        e = e || {}
        let res = e.response || {}
        if ((res.data || {}).error) return reject((res.data || {}).error)
        if (res.status === 401) return reject('Unauthorized')
        if (e.code === 'ECONNRESET') return reject('Request timeout')
        return reject(e)
      })
    })
  }
}
