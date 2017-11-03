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

const { CheckerPlugin } = require('awesome-typescript-loader')
const { resolve } = require('path');
const webpack = require('webpack');

const baseConfig = {
  devtool: 'source-map',
  entry: resolve(__dirname, 'console.ts'),
  output: {
    filename: 'firestore-standalone.js',
    path: resolve(__dirname, 'dist')
  },
  module: {
    loaders: [
      {
        test: /\.tsx?$/,
        loader: 'awesome-typescript-loader'
      }
    ]
  },
  plugins: [
    new CheckerPlugin(),
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
  ],
  resolve: {
    modules: ['node_modules', resolve(__dirname, '../../node_modules')],
    extensions: ['.js', '.ts']
  }
};

module.exports = baseConfig;
