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
    'firebase-dev': resolve(__dirname, 'index.dev.js')
  },
  output: Object.assign({}, baseConfig.output, {
    library: 'firebase',
    libraryTarget: 'window'
  })
});

module.exports = singleExport;
