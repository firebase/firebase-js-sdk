/**
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const { resolve, parse } = require('path');
const CompressionPlugin = require('compression-webpack-plugin');
const gitRev = require('git-rev-sync');
const pkg = require('./package');
const webpack = require('webpack');
const WrapperPlugin = require('wrapper-webpack-plugin');

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
          /**
           * This regex will trigger minification of subproperties that match
           * any of the following use cases:
           *
           * - Prefixed with an underscore (i.e. _)
           * - Suffixed with an underscore (i.e. _)
           *
           * Exceptions:
           * - Double underscore prefix/suffix (we have some props that rely on
           * this naming convention)
           * - `_lat` (we have a property in auth that depends on this name)
           *
           * This will be kept up to date as this changes
           */
          regex: /^_[^_][^lat]|[^_]_$/
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

function isFirebaseApp(fileName) {
  const pathObj = parse(fileName);
  return pathObj.name === 'firebase-app';
}

const multiExport = Object.assign({}, baseConfig, {
  entry: {
    'firebase-app': resolve(__dirname, 'app/index.js'),
    'firebase-auth': resolve(__dirname, 'auth/index.js'),
    'firebase-database': resolve(__dirname, 'database/index.js'),
    'firebase-firestore': resolve(__dirname, 'firestore/index.js'),
    'firebase-functions': resolve(__dirname, 'functions/index.js'),
    'firebase-messaging': resolve(__dirname, 'messaging/index.js'),
    'firebase-storage': resolve(__dirname, 'storage/index.js')
  },
  plugins: [
    new webpack.optimize.CommonsChunkPlugin({
      name: 'firebase-app'
    }),
    new WrapperPlugin({
      header: fileName => {
        return isFirebaseApp(fileName)
          ? `var firebase = (function() {
          var window = typeof window === 'undefined' ? self : window;
        return `
          : `try {
        `;
      },
      footer: fileName => {
        // Note: '.default' needed because of https://github.com/babel/babel/issues/2212
        return isFirebaseApp(fileName)
          ? `
        })().default;`
          : `
        } catch(error) {
          throw new Error(
            'Cannot instantiate ${fileName} - ' +
            'be sure to load firebase-app.js first.'
          )
        }`;
      }
    }),
    ...baseConfig.plugins
  ]
});

module.exports = [multiExport];
