'use strict'

import rollBabel from 'rollup-plugin-babel'
export default {
  input: 'source.js',
  output: [
    {file: 'module.js', format: 'es'},
    {file: 'index.js', format: 'cjs'}
  ],
  plugins: [rollBabel()]
}
