'use strict'

import rollBabel from 'rollup-plugin-babel'
export default {
  input: 'index.js',
  output: [{file: 'module.js', format: 'es'}],
  plugins: [rollBabel()]
}
