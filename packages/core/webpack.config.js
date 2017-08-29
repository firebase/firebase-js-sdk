const { resolve } = require('path');
const CompressionPlugin = require('compression-webpack-plugin');
const gitRev = require('git-rev-sync');
const pkg = require('./package');
const webpack = require('webpack');

const licenseHeader = `@license Firebase v${pkg.version}
Build: rev-${gitRev.short()}
Terms: https://firebase.google.com/terms/`;

const baseConfig = {
  devtool: 'source-map',
  output: {
    filename: '[name].js',
    jsonpFunction: 'webpackJsonpFirebase',
    path: resolve(__dirname)
  },
  plugins: [
    new webpack.BannerPlugin(licenseHeader),
    new webpack.optimize.ModuleConcatenationPlugin(),
    new webpack.optimize.UglifyJsPlugin({
      sourceMap: true,
      mangle: {
        props: {
          ignore_quoted: true,
          regex: /^_|_$/
        }
      },
      compress: {
        passes: 3,
        unsafe: true,
        warnings: false
      }
    }),
    new CompressionPlugin({
      test: /\.js$/
    })
  ],
  resolve: {
    modules: ['node_modules', resolve(__dirname, '../../node_modules')],
    extensions: ['.js']
  }
};

const singleExport = Object.assign({}, baseConfig, {
  entry: {
    firebase: resolve(__dirname, 'index.js')
  },
  output: Object.assign({}, baseConfig.output, {
    library: 'firebase',
    libraryTarget: 'window'
  })
});

const multiExport = Object.assign({}, baseConfig, {
  entry: {
    'firebase-app': resolve(__dirname, 'app/index.js'),
    'firebase-storage': resolve(__dirname, 'storage/index.js'),
    'firebase-database': resolve(__dirname, 'database/index.js'),
    'firebase-messaging': resolve(__dirname, 'messaging/index.js')
  },
  plugins: [
    new webpack.optimize.CommonsChunkPlugin({
      name: 'firebase-app'
    }),
    ...baseConfig.plugins
  ]
});

module.exports = [singleExport, multiExport];
