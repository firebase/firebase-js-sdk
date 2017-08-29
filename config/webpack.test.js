const path = require('path');
const webpack = require('webpack');

module.exports = {
  devtool: 'eval-source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: 'ts-loader'
      },
      {
        test: /\.js$/,
        use: ['source-map-loader'],
        enforce: 'pre'
      }
    ]
  },
  resolve: {
    modules: ['node_modules', path.resolve(__dirname, '../../node_modules')],
    extensions: ['.js', '.ts']
  }
};
