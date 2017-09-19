const path = require('path');

module.exports = {
  entry: path.resolve(__dirname, 'src/namespace.test.js'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'namespace.test.js'
  }
};
