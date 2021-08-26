/**
 * @license
 * Copyright 2021 Google LLC
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

/**
 * This config is used for the sample app. The tests do not use webpack.
 */
var path = require('path');

module.exports = [
  {
    name: 'compat',
    mode: 'development',
    entry: './sample-apps/compat.js',
    output: {
      path: path.resolve(__dirname, 'build'),
      filename: 'app.bundle.js'
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          loader: 'babel-loader',
          options: {
            presets: [
              [
                '@babel/preset-env',
                {
                  targets: {
                    node: '10'
                  }
                }
              ]
            ]
          }
        }
      ]
    },
    resolve: {
      mainFields: ['browser', 'module', 'main']
    },
    stats: {
      colors: true
    },
    devtool: 'source-map',
    devServer: {
      contentBase: './build'
    }
  },
  {
    name: 'exp',
    mode: 'development',
    entry: './sample-apps/exp.js',
    output: {
      path: path.resolve(__dirname, 'build'),
      filename: 'app.bundle.js'
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          loader: 'babel-loader',
          options: {
            presets: [
              [
                '@babel/preset-env',
                {
                  targets: {
                    node: '10'
                  }
                }
              ]
            ]
          }
        }
      ]
    },
    resolve: {
      mainFields: ['browser', 'module', 'main']
    },
    stats: {
      colors: true
    },
    devtool: 'source-map',
    devServer: {
      contentBase: './build'
    }
  }
];
