const path = require('path');

module.exports = {
  entry: path.resolve(__dirname, 'namespace.test.js'),
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'build.js'
  }
}