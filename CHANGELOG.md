### Changelog

All notable changes to this project will be documented in this file. Dates are displayed in UTC.

### [3.2.1](https://github.com/doesdev/get-scrud/compare/3.2.0...3.2.1)

> 2023-09-18

- [Feature] Add httpError text
- [Feature] Ensure httpCode and httpError are set on all error returns

### [3.2.0](https://github.com/doesdev/get-scrud/compare/3.1.0...3.2.0)

> 2023-09-18

- [Feature] Add httpCode to custom errors

### [3.1.0](https://github.com/doesdev/get-scrud/compare/3.0.0...3.1.0)

> 2023-07-26

- [Feature] Filter authorization from Axios errors

### [3.0.0](https://github.com/doesdev/get-scrud/compare/2.0.0...3.0.0)

> 2023-07-26

- [Feature] Add autoPostSearch option, which switches to POST for SEARCH when querystring over 1500 chars
- [Breaking] Update axios to 1.x.x (1.1.2 to be exact)
- [Dev] Switch to yarn

### [2.0.0](https://github.com/doesdev/get-scrud/compare/1.9.2...2.0.0)

> 2022-04-25

- [Breaking] Change to ES Module

### [1.9.2](https://github.com/doesdev/get-scrud/compare/1.9.1...1.9.2)

> 2022-04-23

- Handle case where body is not object

### [1.9.1](https://github.com/doesdev/get-scrud/compare/1.9.0...1.9.1)

> 2022-04-23

- Handle case where `contextData` becomes unset

### [1.9.0](https://github.com/doesdev/get-scrud/compare/1.8.1...1.9.0)

> 2022-04-23

- Add `throttle` option
- Pass `contextData` through to `before` function call

### [1.8.1](https://github.com/doesdev/get-scrud/compare/1.8.0...1.8.1)

> 2022-04-07

- Update `axios` to 0.26.1

### [1.8.0](https://github.com/doesdev/get-scrud/compare/1.7.1...1.8.0)

> 2022-02-16

- Update dependencies
- Move ghooks to dev deps, that sneaky bastard

### [1.7.1](https://github.com/doesdev/get-scrud/compare/1.7.0...1.7.1)

> 2022-01-17

- Update dependencies

### [1.7.0](https://github.com/doesdev/get-scrud/compare/1.6.2...1.7.0)

> 2021-09-22

- Update dependencies
- Set body to `undefined` instead of `null`

### [1.6.2](https://github.com/doesdev/get-scrud/compare/1.6.1...1.6.2)

> 2021-07-23

- Avoid async funcs, don't want to include regenerator runtime

### [1.6.1](https://github.com/doesdev/get-scrud/compare/1.6.0...1.6.1)

> 2021-07-23

- Add `before` hook option
- Update dev dependencies (rollup, babel)

### [1.6.0](https://github.com/doesdev/get-scrud/compare/1.5.2...1.6.0)

> 2021-07-19

- Expose `maxBodyLength` and `maxContentLength` axios options
- Update dev dependencies (rollup, babel, mvt)

### [1.5.2](https://github.com/doesdev/get-scrud/compare/1.5.1...1.5.2)

> 2021-03-16

- Update axios to 0.21.1
- Update several development dependencies

### [1.5.1](https://github.com/doesdev/get-scrud/compare/1.5.0...1.5.1)

> 2020-10-23

- Update axios to 0.21.0

### [1.5.0](https://github.com/doesdev/get-scrud/compare/1.4.6...1.5.0)

> 2020-08-23

- Update axios to 0.20.0
- Begin keeping changelog :/
