const path = require('path');

module.exports = {
  entry: path.resolve(__dirname, 'serviceWorker.test.js'),
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'build.js'
  }
}