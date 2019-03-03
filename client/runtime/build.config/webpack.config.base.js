'use strict'

const path = require('path')

const entryFile = path.resolve(__dirname, '../index.js')

/**
 * @param {string}buildDir
 * @return {{entry: string, output: {path: string, filename: string}, plugins: *[]}}
 */
const commonConfig = (buildDir) => {
  return {
    entry: [entryFile],
    output: {
      path: path.resolve(__dirname, `../${buildDir}`),
      filename: 'westfield_client.js',
      library: 'westfield_client'
    }
  }
}

module.exports = commonConfig
