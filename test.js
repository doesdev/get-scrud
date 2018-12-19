'use strict'

import '@babel/polyfill'
import test from 'ava'
import getScrud from './index'
import http from 'http'
import scrud from 'scrud'
const host = 'jsonplaceholder.typicode.com'
const timeout = '30s'
const baseOpts = { host, port: 443, cache: true, timeout }
const apiCall = getScrud(baseOpts)
const jwt = 'abbc123'

test.serial('SEARCH', async (assert) => {
  let data = await apiCall('posts', 'search', {})
  assert.truthy(Array.isArray(data))
})

test.serial('CREATE', async (assert) => {
  let body = {
    userId: 1,
    title: `get scrud yo`,
    body: `test scrud api-age`
  }
  let data = await apiCall('posts', 'create', body)
  assert.is(data.userId, 1)
})

test.serial('READ', async (assert) => {
  let data = await apiCall('posts', 'read', 1)
  assert.is(data.id, 1)
})

test.serial('UPDATE', async (assert) => {
  let data = await apiCall('posts', 'update', 1, { userId: 5 })
  assert.is(data.userId, 5)
})

test.serial('DELETE', async (assert) => {
  await assert.notThrowsAsync(apiCall('posts', 'delete', 2))
})

test.serial('apiCall.search', async (assert) => {
  let data = await apiCall.search('posts', {})
  assert.truthy(Array.isArray(data))
})

test.serial('apiCall.create', async (assert) => {
  let body = {
    userId: 1,
    title: `get scrud yo`,
    body: `test scrud api-age`
  }
  let data = await apiCall.create('posts', body)
  assert.is(data.userId, 1)
})

test.serial('apiCall.read', async (assert) => {
  let data = await apiCall.read('posts', 1)
  assert.is(data.id, 1)
})

test.serial('apiCall.update', async (assert) => {
  let data = await apiCall.update('posts', 1, { userId: 5 })
  assert.is(data.userId, 5)
})

test.serial('apiCall.delete', async (assert) => {
  await assert.notThrowsAsync(apiCall.delete('posts', 2))
})

test.serial(`JWT passed in init is not malformed / doesn't throw`, async (assert) => {
  let apiCallJwtInit = getScrud(Object.assign({ jwt }, baseOpts))
  await assert.notThrowsAsync(apiCallJwtInit('posts', 'read', 1))
})

test.serial(`JWT passed in call is not malformed / doesn't throw`, async (assert) => {
  let body = {
    userId: 1,
    title: `get scrud yo`,
    body: `test scrud api-age`
  }
  await assert.notThrowsAsync(apiCall('posts', 'search', {}, jwt))
  await assert.notThrowsAsync(apiCall('posts', 'create', body, jwt))
  await assert.notThrowsAsync(apiCall('posts', 'read', 1, jwt))
  await assert.notThrowsAsync(apiCall('posts', 'update', 1, { userId: 5 }, jwt))
  await assert.notThrowsAsync(apiCall('posts', 'delete', 2, jwt))
})

test.serial(`Can change options on an instance`, async (assert) => {
  let handler = (req, res) => {
    let data = req.headers.authorization.replace(/^Bearer\s/, '')
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.statusCode = 200
    return res.end(JSON.stringify({ data, error: null }))
  }
  let server = http.createServer(handler)
  await new Promise((resolve, reject) => { server.listen(7236, resolve) })
  let opts = { host: 'localhost', port: 7236, timeout, jwt }
  let caller = getScrud(opts)
  let initalJwt = await caller('whatevs', 'read', 1)
  assert.is(initalJwt, jwt)
  let localJwt = await caller('whatevs', 'read', 1, 'eff')
  assert.is(localJwt, 'eff')
  caller({ jwt: 'this' })
  let newJwt = await caller('whatevs', 'read', 1)
  assert.is(newJwt, 'this')
  localJwt = await caller('whatevs', 'read', 1, 'noise')
  assert.is(localJwt, 'noise')
})

test.serial(`Can cache instance, use uncached`, async (assert) => {
  let handler = (req, res) => {
    let data = req.headers.authorization.replace(/^Bearer\s/, '')
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.statusCode = 200
    return res.end(JSON.stringify({ data, error: null }))
  }
  let server = http.createServer(handler)
  await new Promise((resolve, reject) => { server.listen(7237, resolve) })
  let opts = { host: 'localhost', port: 7237, timeout, jwt, cache: true }
  await assert.throwsAsync(getScrud(opts)('whatevs', 'read', 1))
  delete opts.cache
  await assert.notThrowsAsync(getScrud(opts)('whatevs', 'read', 1))
})

test.serial(`string resourceId doesn't throw`, async (assert) => {
  let resource = 'someresource'
  let port = 7942
  let read = (req, res) => scrud.sendData(res, { id: req.id })
  await scrud.register(resource, { read })
  await scrud.start({ port })
  let opts = { host: 'localhost', port, timeout, jwt }
  let caller = getScrud(opts)
  let id = 'SOMEIDSTRING'
  let data = await caller.read(resource, id)
  assert.is(data.id, id)
})
