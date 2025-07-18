/**
 * @license
 * Copyright 2017 Google LLC
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

const path = require('path');
const webpack = require('webpack');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');

/**
 * A regular expression used to replace Firestore's and Storage's platform-
 * specific modules, which are located under
 * 'packages/(component)/src/platform/'.
 */
const PLATFORM_RE = /^(.*)\/platform\/([^.\/]*)(\.ts)?$/;

module.exports = {
  mode: 'development',
  devtool: 'inline-source-map',
  optimization: {
    runtimeChunk: false,
    splitChunks: false,
    minimize: false
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            compilerOptions: {
              module: 'commonjs',
              target: 'es2020',
              downlevelIteration: true,
              resolveJsonModule: true
            }
          }
        }
      },
      {
        test: /\.[tj]sx?$/,
        use: 'source-map-loader',
        enforce: 'pre'
      },
      {
        test: /\.js$/,
        include: [/node_modules\/chai-as-promised/],
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              [
                '@babel/preset-env',
                {
                  targets: ['ie 11']
                }
              ]
            ]
          }
        }
      },
      /**
       * Transform firebase packages to cjs, so they can be stubbed in tests
       */
      {
        test: /\.js$/,
        include: function (modulePath) {
          const match = /node_modules\/@firebase.*/.test(modulePath);
          return match;
        },
        use: {
          loader: 'babel-loader',
          options: {
            plugins: ['@babel/plugin-transform-modules-commonjs']
          }
        }
      }
    ]
  },
  resolve: {
    modules: ['node_modules', path.resolve(__dirname, '../../node_modules')],
    mainFields: ['browser', 'module', 'main'],
    extensions: ['.js', '.ts'],
    symlinks: true
  },
  plugins: [
    new webpack.NormalModuleReplacementPlugin(PLATFORM_RE, resource => {
      const targetPlatform = process.env.TEST_PLATFORM || 'browser';
      resource.request = resource.request.replace(
        PLATFORM_RE,
        `$1/platform/${targetPlatform}/$2.ts`
      );
    }),
    new NodePolyfillPlugin(),
    new webpack.EnvironmentPlugin({
      'RTDB_EMULATOR_PORT': false,
      'RTDB_EMULATOR_NAMESPACE': false
    })
  ]
};
