# get-scrud [![NPM version](https://badge.fury.io/js/get-scrud.svg)](https://npmjs.org/package/get-scrud)   [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](https://github.com/feross/standard)   [![Dependency Status](https://dependencyci.com/github/doesdev/get-scrud/badge)](https://dependencyci.com/github/doesdev/get-scrud)

> Client for SCRUD style rest APIs

## install

```sh
$ npm install --save get-scrud
```

## api

#### Module ships single function which accepts options and returns main function

#### `const apiCall = require('get-scrud')(*opts)`

- **opts** *[object - required]*
  - **host** *[string - required]* (ex. `'jsonplaceholder.typicode.com'`)
  - **port** *[integer - optional - default: 443]* (ex. `80`)
  - **basePath** *[string - optional - default: null]* (ex. `'api'` or `'/api'`)
  - **timeout** *[string | integer - optional - default: '1m' / 60000]* (ex. `'3m'`)
  - **jwt** *[string - optional - default: null]* (ex. `'abc123'`)

#### Main function returns `Promise` that resolves with JSON parsed response data

#### `apiCall(*resource, *action, [*id, *body, *jwt])`

- **resource** *[string - required]* (ex. `'posts'`)
- **action** *[string - required]* (ex. `'search'`)
- **id** *[integer - optional - default: null]* (ex. `1`)
- **body** *[object - optional - default: null]* (ex. `{userId: 5}`)
- **jwt** *[string - optional - default: null]* (ex. `'abc123'`)

## usage

```js
const opts = {
  host: 'jsonplaceholder.typicode.com',
  port: 443,
  timeout: '3m', // or '180s' or 180000
  jwt: `abc123`
}
const apiCall = require('get-scrud')(opts)
const body = {userId: 1, title: `get scrud yo`, body: `you're scrud`}
const jwt = `def456`

async function callApis () {

  /* no jwt passed, uses jwt set in init if one was set */

  // SEARCH
  let search = await apiCall('posts', 'search', {userId: 1})
  // CREATE
  let create = await apiCall('posts', 'create', body)
  // READ
  let read = await apiCall('posts', 'read', 1)
  // UPDATE
  let update = await apiCall('posts', 'update', 1, {userId: 5})
  // DELETE
  let deleted = !!(await apiCall('posts', 'delete', 2))

  /* passing in jwt to call, overrides jwt set in init if one was set */

  // SEARCH
  let search = await apiCall('posts', 'search', {userId: 1}, jwt)
  // CREATE
  let create = await apiCall('posts', 'create', body, jwt)
  // READ
  let read = await apiCall('posts', 'read', 1, jwt)
  // UPDATE
  let update = await apiCall('posts', 'update', 1, {userId: 5}, jwt)
  // DELETE
  let deleted = !!(await apiCall('posts', 'delete', 2, jwt))

}
```

## License

MIT © [Andrew Carpenter](https://github.com/doesdev)
