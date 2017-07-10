const path = require('path')

module.exports = {
  entry: './public.src/browser.js',
  output: {
    path: path.resolve(__dirname, 'public'),
    filename: 'browser.bundle.js'
  }
}
