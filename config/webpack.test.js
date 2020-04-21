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

/**
 * A regular expression used to replace Firestore's platform specific modules,
 * which are located under 'packages/firestore/src/platform/'.
 */
const FIRESTORE_PLATFORM_RE = /^(.*)\/platform\/([^.\/]*)(\.ts)?$/;

module.exports = {
  mode: 'development',
  devtool: 'source-map',
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
              target: 'es5',
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
        test: /\.tsx?$/,
        use: {
          loader: 'istanbul-instrumenter-loader',
          options: { esModules: true }
        },
        enforce: 'post',
        exclude: [/\.test\.ts$/, /\btest(ing)?\//]
      },
      {
        test: /\.js$/,
        include: [/node_modules\/chai-as-promised/, /webchannel-wrapper/],
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
      }
    ]
  },
  resolve: {
    modules: ['node_modules', path.resolve(__dirname, '../../node_modules')],
    mainFields: ['browser', 'main', 'module'],
    extensions: ['.js', '.ts']
  },
  plugins: [
    new webpack.NormalModuleReplacementPlugin(
      FIRESTORE_PLATFORM_RE,
      resource => {
        resource.request = resource.request.replace(
          FIRESTORE_PLATFORM_RE,
          '$1/platform/browser/$2.ts'
        );
      }
    ),
    new webpack.EnvironmentPlugin([
      'RTDB_EMULATOR_PORT',
      'RTDB_EMULATOR_NAMESPACE'
    ])
  ]
};
