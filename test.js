'use strict'

// setup
import test from 'ava'
import getScrud from './index'
const baseOpts = {host: 'jsonplaceholder.typicode.com', port: 443}
const apiCall = getScrud(baseOpts)
const jwt = 'abbc123'

test('SEARCH', async (assert) => {
  let data = await apiCall('posts', 'search', {})
  assert.truthy(Array.isArray(data))
})

test('CREATE', async (assert) => {
  let body = {
    userId: 1,
    title: `get scrud yo`,
    body: `test scrud api-age`
  }
  let data = await apiCall('posts', 'create', body)
  assert.is(data.userId, 1)
})

test('READ', async (assert) => {
  let data = await apiCall('posts', 'read', 1)
  assert.is(data.id, 1)
})

test('UPDATE', async (assert) => {
  let data = await apiCall('posts', 'update', 1, {userId: 5})
  assert.is(data.userId, 5)
})

test('DELETE', async (assert) => {
  await assert.notThrows(apiCall('posts', 'delete', 2))
})

test(`JWT passed in init is not malformed / doesn't throw`, async (assert) => {
  let apiCallJwtInit = getScrud(Object.assign({jwt}, baseOpts))
  await assert.notThrows(apiCallJwtInit('posts', 'read', 1))
})

test(`JWT passed in call is not malformed / doesn't throw`, async (assert) => {
  let body = {
    userId: 1,
    title: `get scrud yo`,
    body: `test scrud api-age`
  }
  await assert.notThrows(apiCall('posts', 'search', {}, jwt))
  await assert.notThrows(apiCall('posts', 'create', body, jwt))
  await assert.notThrows(apiCall('posts', 'read', 1, jwt))
  await assert.notThrows(apiCall('posts', 'update', 1, {userId: 5}, jwt))
  await assert.notThrows(apiCall('posts', 'delete', 2, jwt))
})
