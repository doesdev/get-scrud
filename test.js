'use strict'

require('@babel/polyfill')

const test = require('mvt')
const getScrud = require('./index')
const http = require('http')
const scrud = require('scrud')

const host = 'jsonplaceholder.typicode.com'
const timeout = '30s'
const baseOpts = { host, port: 443, cache: true, timeout }
const apiCall = getScrud(baseOpts)
const jwt = 'abbc123'

test('SEARCH', async (assert) => {
  const data = await apiCall('posts', 'search', {})
  assert.truthy(Array.isArray(data))
})

test('CREATE', async (assert) => {
  const body = {
    userId: 1,
    title: `get scrud yo`,
    body: `test scrud api-age`
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
    title: `get scrud yo`,
    body: `test scrud api-age`
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

test(`JWT passed in init is not malformed / doesn't throw`, async (assert) => {
  const apiCallJwtInit = getScrud(Object.assign({ jwt }, baseOpts))
  await assert.notThrowsAsync(() => apiCallJwtInit('posts', 'read', 1))
})

test(`JWT passed in call is not malformed / doesn't throw`, async (assert) => {
  const body = {
    userId: 1,
    title: `get scrud yo`,
    body: `test scrud api-age`
  }

  await assert.notThrowsAsync(() => apiCall('posts', 'search', {}, jwt))
  await assert.notThrowsAsync(() => apiCall('posts', 'create', body, jwt))
  await assert.notThrowsAsync(() => apiCall('posts', 'read', 1, jwt))
  await assert.notThrowsAsync(() => apiCall('posts', 'update', 1, { userId: 5 }, jwt))
  await assert.notThrowsAsync(() => apiCall('posts', 'delete', 2, jwt))
})

test(`Can change options on an instance`, async (assert) => {
  const handler = (req, res) => {
    const data = req.headers.authorization.replace(/^Bearer\s/, '')
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.statusCode = 200
    return res.end(JSON.stringify({ data, error: null }))
  }

  const server = http.createServer(handler)
  await new Promise((resolve, reject) => { server.listen(7236, resolve) })

  const opts = { host: 'localhost', port: 7236, timeout, jwt }
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

test(`Can cache instance, use uncached`, async (assert) => {
  const handler = (req, res) => {
    const data = req.headers.authorization.replace(/^Bearer\s/, '')
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.statusCode = 200
    return res.end(JSON.stringify({ data, error: null }))
  }

  const server = http.createServer(handler)
  await new Promise((resolve, reject) => { server.listen(7237, resolve) })

  const opts = { host: 'localhost', port: 7237, timeout, jwt, cache: true }

  await assert.throwsAsync(() => getScrud(opts)('whatevs', 'read', 1))

  delete opts.cache

  await assert.notThrowsAsync(() => getScrud(opts)('whatevs', 'read', 1))
})

test(`string resourceId doesn't throw`, async (assert) => {
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
