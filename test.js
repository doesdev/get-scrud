'use strict'

require('@babel/polyfill')
const { runTests, testAsync, test } = require('mvt')
const getScrud = require('./index')
const http = require('http')
const scrud = require('scrud')
const host = 'jsonplaceholder.typicode.com'
const timeout = '30s'
const baseOpts = { host, port: 443, cache: true, timeout }
const apiCall = getScrud(baseOpts)
const jwt = 'abbc123'

runTests(`Testing my app`, async () => {
  await testAsync('SEARCH', async () => {
    let data = await apiCall('posts', 'search', {})
    return Array.isArray(data)
  })

  await testAsync('CREATE', async () => {
    let body = {
      userId: 1,
      title: `get scrud yo`,
      body: `test scrud api-age`
    }
    let data = await apiCall('posts', 'create', body)
    return data.userId === 1
  })

  await testAsync('READ', async () => {
    let data = await apiCall('posts', 'read', 1)
    return data.id === 1
  })

  await testAsync('UPDATE', async () => {
    let data = await apiCall('posts', 'update', 1, { userId: 5 })
    return data.userId === 5
  })

  await testAsync('DELETE', async () => {
    await apiCall('posts', 'delete', 2)
    return true
  })

  await testAsync('apiCall.search', async () => {
    let data = await apiCall.search('posts', {})
    return Array.isArray(data)
  })

  await testAsync('apiCall.create', async () => {
    let body = {
      userId: 1,
      title: `get scrud yo`,
      body: `test scrud api-age`
    }
    let data = await apiCall.create('posts', body)
    return data.userId === 1
  })

  await testAsync('apiCall.read', async () => {
    let data = await apiCall.read('posts', 1)
    return data.id === 1
  })

  await testAsync('apiCall.update', async () => {
    let data = await apiCall.update('posts', 1, { userId: 5 })
    return data.userId === 5
  })

  await testAsync('apiCall.delete', async () => {
    await apiCall.delete('posts', 2)
    return true
  })

  await testAsync(`JWT passed in init is not malformed / doesn't throw`, async () => {
    let apiCallJwtInit = getScrud(Object.assign({ jwt }, baseOpts))
    await apiCallJwtInit('posts', 'read', 1)
    return true
  })

  await testAsync(`JWT passed in call is not malformed / doesn't throw`, async () => {
    let body = {
      userId: 1,
      title: `get scrud yo`,
      body: `test scrud api-age`
    }
    await apiCall('posts', 'search', {}, jwt)
    await apiCall('posts', 'create', body, jwt)
    await apiCall('posts', 'read', 1, jwt)
    await apiCall('posts', 'update', 1, { userId: 5 }, jwt)
    await apiCall('posts', 'delete', 2, jwt)

    return true
  })

  await testAsync(`Can change options on an instance`, async () => {
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

    test('initialJwt matches jwt', initalJwt, jwt)

    let localJwt = await caller('whatevs', 'read', 1, 'eff')
    test(`localJwt equals 'eff'`, localJwt, 'eff')

    caller({ jwt: 'this' })
    let newJwt = await caller('whatevs', 'read', 1)
    test(`newJwt equals 'this'`, newJwt, 'this')

    localJwt = await caller('whatevs', 'read', 1, 'noise')
    return test(`localJwt equals 'noise'`, localJwt, 'noise')
  })

  await testAsync(`Can cache instance, use uncached`, async () => {
    let handler = (req, res) => {
      let data = req.headers.authorization.replace(/^Bearer\s/, '')
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.statusCode = 200
      return res.end(JSON.stringify({ data, error: null }))
    }
    let server = http.createServer(handler)
    await new Promise((resolve, reject) => { server.listen(7237, resolve) })

    let opts = { host: 'localhost', port: 7237, timeout, jwt, cache: true }

    let error
    try {
      await getScrud(opts)('whatevs', 'read', 1)
    } catch (ex) {
      error = ex
    }

    delete opts.cache

    await getScrud(opts)('whatevs', 'read', 1)

    return !!error
  })

  await testAsync(`string resourceId doesn't throw`, async () => {
    let resource = 'someresource'
    let port = 7942
    let read = (req, res) => scrud.sendData(res, { id: req.id })

    await scrud.register(resource, { read })
    await scrud.start({ port })

    let opts = { host: 'localhost', port, timeout, jwt }
    let caller = getScrud(opts)
    let id = 'SOMEIDSTRING'
    let data = await caller.read(resource, id)

    return data.id === id
  })
})
