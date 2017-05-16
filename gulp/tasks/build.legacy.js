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
const path = require('path');
const config = require('../config');
const closureJar = path.resolve(`${config.root}/tools/third_party/closure-compiler.jar`);
const spawn = require('child-process-promise').spawn;
const mkdirp = require('mkdirp');

const getClosureOptions = env => {
  const baseOptions = [
    '-jar', closureJar,
    '--closure_entry_point', 'fb.core.registerService',
    '--only_closure_dependencies',
    '--warning_level', 'VERBOSE',
    '--language_in', 'ECMASCRIPT5',
    '--compilation_level', 'ADVANCED',
    '--generate_exports', 'true',
    '--externs', `${config.root}/externs/firebase-externs.js`,
    '--externs', `${config.root}/externs/firebase-app-externs.js`,
    '--externs', `${config.root}/externs/firebase-app-internal-externs.js`,
    '--source_map_location_mapping', `${config.root}|`,
    `${config.root}/src/database/third_party/closure-library/**.js`,
    `${config.root}/src/database/common/**.js`,
    `${config.root}/src/database/js-client/**.js`,
    `!${config.root}/src/database/js-client/**-externs.js`,
    `!${config.root}/src/database/js-client/**-wrapper.js`,
  ]

  let finalOptions = [];
  switch (env) {
    case 'node':
      finalOptions = [
        ...baseOptions,
        '--define', 'NODE_CLIENT=true',
        '--define', 'NODE_ADMIN=false',
        '--js_output_file', `${config.root}/dist/cjs/database-node.js`,
        '--output_wrapper', `(function() {
          var firebase = require('./app');
          %output%
          module.exports = firebase.database;
        })();
        //# sourceMappingURL=database-node.js.map
        `,
        '--create_source_map', `${config.root}/dist/cjs/database-node.js.map`,
      ];
      break;
    case 'browser-cdn':
      finalOptions = [
        ...baseOptions,
          '--jscomp_warning', 'checkDebuggerStatement',
          '--jscomp_warning', 'const',
          '--jscomp_warning', 'strictModuleDepCheck',
          '--jscomp_warning', 'undefinedNames',
          '--jscomp_warning', 'visibility',
          '--jscomp_warning', 'missingProperties',
          '--jscomp_warning', 'accessControls',
          '--jscomp_warning', 'checkRegExp',
          '--jscomp_warning', 'missingRequire',
          '--jscomp_warning', 'missingProvide',
          '--define', 'NODE_CLIENT=false',
          '--define', 'NODE_ADMIN=false',
          '--js_output_file', `${config.root}/dist/browser/firebase-database.js`,
          '--output_wrapper', `(function() {%output%})();
          //# sourceMappingURL=firebase-database.js.map`,
          '--create_source_map', `${config.root}/dist/browser/firebase-database.js.map`,
      ];
      break;
    case 'browser-built':
      finalOptions = [
        ...baseOptions,
          '--jscomp_warning', 'checkDebuggerStatement',
          '--jscomp_warning', 'const',
          '--jscomp_warning', 'strictModuleDepCheck',
          '--jscomp_warning', 'undefinedNames',
          '--jscomp_warning', 'visibility',
          '--jscomp_warning', 'missingProperties',
          '--jscomp_warning', 'accessControls',
          '--jscomp_warning', 'checkRegExp',
          '--jscomp_warning', 'missingRequire',
          '--jscomp_warning', 'missingProvide',
          '--define', 'NODE_CLIENT=false',
          '--define', 'NODE_ADMIN=false',
          '--js_output_file', `${config.root}/dist/cjs/database.js`,
          '--output_wrapper', `(function() {
            var firebase = require('./app');
            %output%
            module.exports = firebase.database;
          })();
          //# sourceMappingURL=database.js.map
          `,
          '--create_source_map', `${config.root}/dist/cjs/database.js.map`,
      ]
      break;
  }
  return finalOptions;
};

function compileDatabaseForBrowser() {
  return new Promise(resolve => {
    mkdirp(`${config.root}/dist/browser`, err => {
      if (err) throw err;
      resolve();
    });
  })
  .then(() => spawn(`java`, getClosureOptions('browser-cdn')));
}

function compileDatabaseForCJS() {
  return new Promise(resolve => {
    mkdirp(`${config.root}/dist/cjs`, err => {
      if (err) throw err;
      resolve();
    });
  })
  .then(() => {
    return Promise.all([
      spawn(`java`, getClosureOptions('node')),
      spawn(`java`, getClosureOptions('browser-built'))
    ]);
  })
}

exports.compileDatabaseForBrowser = compileDatabaseForBrowser

exports.compileDatabaseForCJS = compileDatabaseForCJS;

gulp.task('compile-database', gulp.parallel(compileDatabaseForBrowser, compileDatabaseForCJS));
