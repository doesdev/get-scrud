# get-scrud [![NPM version](https://badge.fury.io/js/get-scrud.svg)](https://npmjs.org/package/get-scrud)   [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](https://github.com/feross/standard)   [![Dependency Status](https://dependencyci.com/github/doesdev/get-scrud/badge)](https://dependencyci.com/github/doesdev/get-scrud)

> Client for [SCRUD](https://en.wikipedia.org/wiki/Create,_read,_update_and_delete) style rest APIs

## Install

```sh
$ npm install --save get-scrud
```

## 2.0.0

This is a very breaking change, switching to ES Modules and eliminating babel.
If you are targeting older browsers you will need to include this module in any
babel-ification you're doing.

## API

#### Module ships single function which accepts options and returns main function

#### `const apiCall = require('get-scrud')(*opts)`

- **opts** *[object - required]*
  - **host** *[string - required]* (ex. `'jsonplaceholder.typicode.com'`)
  - **port** *[integer - optional - default: 443]* (ex. `80`)
  - **protocol** *[string - optional - default is based on port]* (ex. `http`)
  - **basePath** *[string - optional - default: null]* (ex. `'api'` or `'/api'`)
  - **timeout** *[string | integer - optional - default: '1m' | 60000]* (ex. `'3m'`)
  - **jwt** *[string - optional - default: null]* (ex. `'abc123'`)
  - **cache** *[boolean - optional - default: false]* use cached instance instead of a fresh one on each invocation of top-level exported function
  - **throttle** *[boolean | object - optional - default: false]* throttle API
  calls, in object form uses the below options, if `true` the defaults are applied
    - **interval** *[string | integer - default: '45s' | 45000]* reset call
    counter every X ms
    - **threshold** *[integer - default: 45]* max calls per interval
    - **exclude** *[array - default: null]* calls that are ignored by throttle
      - Array can contain objects, arrays, or strings
      - The following are all equivalent
        - `[{ api: 'user', action: 'read' }]`
        - `[['user', 'read']]`
        - `['user:read']`

#### Main function returns `Promise` that resolves with JSON parsed response data

#### `apiCall(*resource, *action, [*id, *body, *jwt])`

- **resource** *[string - required]* (ex. `'posts'`)
- **action** *[string - required]* (ex. `'search'`)
- **id** *[integer - optional - default: null]* (ex. `1`)
- **body** *[object - optional - default: null]* (ex. `{userId: 5}`)
- **jwt** *[string - optional - default: null]* (ex. `'abc123'`)

#### Alternatively address each action with `apiCall[action](...)`

#### `apiCall.[search, create, read, update, delete](*resource, [*id, *body, *jwt])`

- **resource** *[string - required]* (ex. `'posts'`)
- **id** *[integer - optional - default: null]* (ex. `1`)
- **body** *[object - optional - default: null]* (ex. `{userId: 5}`)
- **jwt** *[string - optional - default: null]* (ex. `'abc123'`)

#### Change options on an instance

If you need to change any options on an existing instance, you can call the main
function with a single argument, which is the new options you want to
merge (Object.assign) with the original. That call will be synchronous.

#### `apiCall(*opts)`

- **opts** *[object - required]* (same as above)

## Usage

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

## Related

[scrud](https://github.com/doesdev/scrud) - Super opinionated, minimalistic, PG centric API fabric


## License

MIT © [Andrew Carpenter](https://github.com/doesdev)
