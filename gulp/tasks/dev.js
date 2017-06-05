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
const gulp = require('gulp');
const gutil = require('gulp-util');
const config = require('../config');
const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');

// Ensure that the test tasks get set up
require('./test');

function watchDevFiles() {
  const stream = gulp.watch([
    `${config.root}/src/**/*.ts`,
    config.paths.test.unit
  ], gulp.parallel('test:unit'));

  stream.on('error', () => {});
  return stream;
}

function runDevServer(callback) {
  const config = {
    entry: './src/browser-dev.ts',
    output: {
      filename: 'bundle.js',
      path: __dirname
    },
    module: {
      rules: [
        {
          enforce: 'pre',
          test: /\.tsx?$/,
          use: "source-map-loader"
        },
        {
          test: /\.tsx?$/,
          loader: 'ts-loader',
          exclude: /node_modules/,
          options: {
            compilerOptions: {
              target: 'es5'
            }
          }
        }
      ]
    },
    resolve: {
      extensions: [".tsx", ".ts", ".js"]
    },
    devtool: 'inline-source-map',
  };
  // Start a webpack-dev-server
  const compiler = webpack(config);

  const server = new WebpackDevServer(compiler, {
    stats: { 
      colors: true 
    }
  });

  server.listen(8080, "localhost", function(err) {
    if(err) throw new gutil.PluginError("webpack-dev-server", err);
    // Server listening
    gutil.log("[webpack-dev-server]", "http://localhost:8080/webpack-dev-server/index.html");
  });
}

gulp.task('dev:server', runDevServer);

gulp.task('dev', gulp.parallel([
  'test:unit',
  watchDevFiles
]));