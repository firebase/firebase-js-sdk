const { resolve } = require('path');
const webpack = require('webpack');

const baseConfig = {
  devtool: 'source-map',
  output: {
    filename: '[name].js',
    jsonpFunction: 'webpackJsonpFirebase',
    path: resolve(__dirname)
  },
  plugins: [new webpack.optimize.ModuleConcatenationPlugin()],
  resolve: {
    modules: ['node_modules', resolve(__dirname, '../../node_modules')],
    extensions: ['.js']
  }
};

const singleExport = Object.assign({}, baseConfig, {
  entry: {
    'firebase-dev': resolve(__dirname, 'index.js')
  },
  output: Object.assign({}, baseConfig.output, {
    library: 'firebase',
    libraryTarget: 'window'
  })
});

module.exports = singleExport;
