'use strict'

import test from 'mvt'
import http from 'http'
import scrud from 'scrud'
import getScrud from './index.js'

const host = 'jsonplaceholder.typicode.com'
const timeout = '30s'
const baseOpts = { host, port: 443, cache: true, timeout, throttle: true }
const apiCall = getScrud(baseOpts)
const jwt = 'abbc123'

const nextPortGen = (port = 7235) => () => ++port
const nextPort = nextPortGen()
const sleep = (ms) => new Promise((resolve, reject) => setTimeout(resolve, ms))

const getServer = async (port, handler) => {
  handler = handler || ((req, res) => {
    const data = req.headers.authorization.replace(/^Bearer\s/, '')
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.statusCode = 200
    return res.end(JSON.stringify({ data, error: null }))
  })

  const server = http.createServer(handler)
  await new Promise((resolve, reject) => { server.listen(port, resolve) })

  return server
}

test('SEARCH', async (assert) => {
  const data = await apiCall('posts', 'search', {})
  assert.truthy(Array.isArray(data))
})

test('CREATE', async (assert) => {
  const body = {
    userId: 1,
    title: 'get scrud yo',
    body: 'test scrud api-age'
  }
  const data = await apiCall('posts', 'create', body)
  assert.is(data.userId, 1)
})

test('READ', async (assert) => {
  const data = await apiCall('posts', 'read', 1)
  assert.is(data.id, 1)
})

test('UPDATE', async (assert) => {
  const data = await apiCall('posts', 'update', 1, { userId: 5 })
  assert.is(data.userId, 5)
})

test('DELETE', async (assert) => {
  await assert.notThrowsAsync(() => apiCall('posts', 'delete', 2))
})

test('apiCall.search', async (assert) => {
  const data = await apiCall.search('posts', {})
  assert.truthy(Array.isArray(data))
})

test('apiCall.create', async (assert) => {
  const body = {
    userId: 1,
    title: 'get scrud yo',
    body: 'test scrud api-age'
  }
  const data = await apiCall.create('posts', body)
  assert.is(data.userId, 1)
})

test('apiCall.read', async (assert) => {
  const data = await apiCall.read('posts', 1)
  assert.is(data.id, 1)
})

test('apiCall.update', async (assert) => {
  const data = await apiCall.update('posts', 1, { userId: 5 })
  assert.is(data.userId, 5)
})

test('apiCall.delete', async (assert) => {
  await assert.notThrowsAsync(() => apiCall.delete('posts', 2))
})

test('JWT passed in init is not malformed / doesn\'t throw', async (assert) => {
  const apiCallJwtInit = getScrud(Object.assign({ jwt }, baseOpts))
  await assert.notThrowsAsync(() => apiCallJwtInit('posts', 'read', 1))
})

test('JWT passed in call is not malformed / doesn\'t throw', async (assert) => {
  const body = {
    userId: 1,
    title: 'get scrud yo',
    body: 'test scrud api-age'
  }

  await assert.notThrowsAsync(() => apiCall('posts', 'search', {}, jwt))
  await assert.notThrowsAsync(() => apiCall('posts', 'create', body, jwt))
  await assert.notThrowsAsync(() => apiCall('posts', 'read', 1, jwt))
  await assert.notThrowsAsync(() => apiCall('posts', 'update', 1, { userId: 5 }, jwt))
  await assert.notThrowsAsync(() => apiCall('posts', 'delete', 2, jwt))
})

test('Can change options on an instance', async (assert) => {
  const port = nextPort()
  await getServer(port)
  const opts = { host: 'localhost', port, timeout, jwt }
  const caller = getScrud(opts)
  const initalJwt = await caller('whatevs', 'read', 1)

  assert.is(initalJwt, jwt)

  let localJwt = await caller('whatevs', 'read', 1, 'eff')
  assert.is(localJwt, 'eff')

  caller({ jwt: 'this' })
  const newJwt = await caller('whatevs', 'read', 1)
  assert.is(newJwt, 'this')

  localJwt = await caller('whatevs', 'read', 1, 'noise')
  assert.is(localJwt, 'noise')
})

test('Can cache instance, use uncached', async (assert) => {
  const port = nextPort()
  await getServer(port)

  const opts = { host: 'localhost', port, timeout, jwt, cache: true }
  await assert.throwsAsync(() => getScrud(opts)('whatevs', 'read', 1))

  delete opts.cache
  await assert.notThrowsAsync(() => getScrud(opts)('whatevs', 'read', 1))
})

test('string resourceId doesn\'t throw', async (assert) => {
  const resource = 'someresource'
  const port = 7942
  const read = (req, res) => scrud.sendData(res, { id: req.id })

  await scrud.register(resource, { read })
  await scrud.start({ port })

  const opts = { host: 'localhost', port, timeout, jwt }
  const caller = getScrud(opts)
  const id = 'SOMEIDSTRING'
  const data = await caller.read(resource, id)

  assert.is(data.id, id)
})

test('SEARCH switches to POST for URL > 1800 characters', async (assert) => {
  const resource = 'someresource'
  const port = 7943
  const search = (req, res) => scrud.sendData(
    res,
    { ...req.params, method: req.method }
  )

  await scrud.register(resource, { search })
  await scrud.start({ port })

  const opts = { host: 'localhost', port, timeout, jwt }
  const callerNoSwitch = getScrud(opts)
  const query = { a: 'B', madLong: Array(20000).fill('X').join('') }

  await assert.throwsAsync(() => callerNoSwitch.search(resource, query))

  const caller = getScrud({ ...opts, autoPostSearch: true })
  const data = await caller.search(resource, query)

  assert.is(data.a, 'B')
  assert.is(data.method, 'POST')
})

test('timeout option is respected', async (assert) => {
  const handler = async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.statusCode = 200
    await new Promise((resolve, reject) => setTimeout(resolve, 50))
    return res.end(JSON.stringify({ data: 'a', error: null }))
  }

  const port = nextPort()
  await getServer(port, handler)

  const optsA = { host: 'localhost', port, jwt, timeout: 1 }
  await assert.throwsAsync(() => getScrud(optsA)('a', 'create', 1, { a: 1 }))

  const optsB = { host: 'localhost', port, jwt, timeout: 30000 }
  await assert.notThrowsAsync(() => getScrud(optsB)('a', 'create', 1, { a: 1 }))
})

test('maxBodyLength option is respected', async (assert) => {
  const port = nextPort()
  await getServer(port)

  const optsA = { host: 'localhost', port, jwt, maxBodyLength: 1 }
  await assert.throwsAsync(() => getScrud(optsA)('a', 'create', 1, { a: 1 }))

  const optsB = { host: 'localhost', port, jwt, maxBodyLength: 1e5 }
  await assert.notThrowsAsync(() => getScrud(optsB)('a', 'create', 1, { a: 1 }))
})

test('maxContentLength option is respected', async (assert) => {
  const port = nextPort()
  await getServer(port)

  const optsA = { host: 'localhost', port, jwt, maxContentLength: 1 }
  await assert.throwsAsync(() => getScrud(optsA)('a', 'create', 1, { a: 1 }))

  const optsB = { host: 'localhost', port, jwt, maxContentLength: 1e5 }
  await assert.notThrowsAsync(() => getScrud(optsB)('a', 'create', 1, { a: 1 }))
})

test('before hook is called', async (assert) => {
  const port = nextPort()
  await getServer(port)

  const withError = async () => { throw new Error() }

  const noError = () => {
    return new Promise((resolve, reject) => setTimeout(resolve, 100))
  }

  const optsA = { host: 'localhost', port, jwt, before: withError }
  await assert.throwsAsync(() => getScrud(optsA)('a', 'create', 1, { a: 1 }))

  const optsB = { host: 'localhost', port, jwt, before: noError }
  await assert.notThrowsAsync(() => getScrud(optsB)('a', 'create', 1, { a: 1 }))

  let contextData

  const setContext = (_0, _1, _3, ctx) => { contextData = ctx }
  const optsC = { host: 'localhost', port, jwt, before: setContext }

  assert.falsy(contextData)
  await getScrud(optsC)('a', 'create', 1, { a: 1 }, undefined, true)
  assert.truthy(contextData)
})

test('throttle options apply as expected', async (assert) => {
  const port = nextPort()
  await getServer(port)

  const interval = 300
  const throttleA = { threshold: 3, exclude: ['b'], interval }
  const optsA = { host: 'localhost', port, jwt, throttle: throttleA }
  const apiClientA = getScrud(optsA)

  await assert.notThrowsAsync(() => apiClientA('a', 'read', 1))
  await assert.notThrowsAsync(() => apiClientA('a', 'read', 1))
  await assert.throwsAsync(() => apiClientA('a', 'read', 1))

  try {
    await apiClientA('a', 'read', 1)
  } catch (ex) {
    assert.is(ex.message, 'API calls have been throttled')
  }

  await sleep(interval * 1.1)

  await assert.notThrowsAsync(() => apiClientA('a', 'read', 1))
  await assert.notThrowsAsync(() => apiClientA('a', 'read', 1))
  await assert.throwsAsync(() => apiClientA('a', 'read', 1))

  await assert.notThrowsAsync(() => apiClientA('b', 'read', 1))
  await assert.notThrowsAsync(() => apiClientA('b', 'read', 1))
  await assert.notThrowsAsync(() => apiClientA('b', 'read', 1))

  const throttleB = { threshold: 3, exclude: [{ api: 'b', action: 'read' }] }
  const optsB = { host: 'localhost', port, jwt, throttle: throttleB }
  const apiClientB = getScrud(optsB)

  await assert.notThrowsAsync(() => apiClientB('a', 'read', 1))
  await assert.notThrowsAsync(() => apiClientB('a', 'read', 1))
  await assert.throwsAsync(() => apiClientB('a', 'read', 1))

  await assert.notThrowsAsync(() => apiClientB('b', 'read', 1))
  await assert.notThrowsAsync(() => apiClientB('b', 'read', 1))
  await assert.notThrowsAsync(() => apiClientB('b', 'read', 1))

  await assert.notThrowsAsync(() => apiClientB('b', 'search', 1))
  await assert.notThrowsAsync(() => apiClientB('b', 'search', 1))
  await assert.throwsAsync(() => apiClientB('b', 'search', 1))

  const throttleC = { threshold: 3, exclude: ['b:read'] }
  const optsC = { host: 'localhost', port, jwt, throttle: throttleC }
  const apiClientC = getScrud(optsC)

  await assert.notThrowsAsync(() => apiClientC('a', 'read', 1))
  await assert.notThrowsAsync(() => apiClientC('a', 'read', 1))
  await assert.throwsAsync(() => apiClientC('a', 'read', 1))

  await assert.notThrowsAsync(() => apiClientC('b', 'read', 1))
  await assert.notThrowsAsync(() => apiClientC('b', 'read', 1))
  await assert.notThrowsAsync(() => apiClientC('b', 'read', 1))

  await assert.notThrowsAsync(() => apiClientC('b', 'search', 1))
  await assert.notThrowsAsync(() => apiClientC('b', 'search', 1))
  await assert.throwsAsync(() => apiClientC('b', 'search', 1))
})
