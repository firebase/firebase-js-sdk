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
const merge = require('merge2');
const config = require('../config');
const ts = require("gulp-typescript");
const tsProject = ts.createProject('tsconfig.json');
const babel = require('gulp-babel');
const rename = require('gulp-rename');
const through = require('through2');
const path = require('path');
const clone = require('gulp-clone');
const webpack = require('webpack');
const webpackStream = require('webpack-stream');
const named = require('vinyl-named');
const sourcemaps = require('gulp-sourcemaps');
const concat = require('gulp-concat');
const replace = require('gulp-replace');
const uglify = require('gulp-uglify');
const gulpFile = require('gulp-file');
const ignore = require('gulp-ignore');
const rimraf = require('rimraf');
const header = require('gulp-header');
const gitRev = require('git-rev-sync');
const gulpIf = require('gulp-if');
const stripComments = require('gulp-strip-comments');
const filesize = require('filesize');
const glob = require('glob');
const fs = require('fs');
const gzipSize = require('gzip-size');
const WrapperPlugin = require('wrapper-webpack-plugin');

function cleanDist(dir) { 
  return function cleanDistDirectory(done) {
    rimraf(`${config.paths.outDir}${ dir ? `/${dir}` : ''}`, done);
  }
}

function compileTypescriptToES2015() {
  const stream = tsProject.src()
    .pipe(sourcemaps.init({ loadMaps: true }))
    .pipe(tsProject());
  return merge([
    stream.dts
      .pipe(gulp.dest(`${config.paths.outDir}/es2015`)),
    stream.js
      .pipe(sourcemaps.write('.'))
      .pipe(gulp.dest(`${config.paths.outDir}/es2015`))
  ]);
};

function compileES2015ToCJS() {
  return gulp.src('dist/es2015/**/*.js')
    .pipe(sourcemaps.init({ loadMaps: true }))
    .pipe(babel(config.babel))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest(`${config.paths.outDir}/cjs`))
};

function processPrebuiltFilesForBrowser() {
  return gulp.src([
      'src/**/*.build.js',
    ])
    .pipe(stripComments())
    .pipe(rename(_path => {
      _path.basename = `firebase-${_path.basename.replace('.build', '')}`;
      return _path;
    }))
    .pipe(gulp.dest(`${config.paths.outDir}/browser`));
}

function processPrebuiltFilesForCJS() {
  return gulp.src([
      'src/**/*.build.js',
    ])
    .pipe(stripComments())
    .pipe(rename(_path => {
      _path.basename = `${_path.basename.replace('.build', '')}`;
      return _path;
    }))
    .pipe(through.obj(function(file, encoding, cb) {
      const _path = path.parse(file.path);
      const moduleName = _path.name.replace('.build', '').replace('-node', '');

      file.contents = Buffer.concat([
        new Buffer(`var firebase = require('./app');
(function(){`),
        file.contents,
        new Buffer(`}).call(typeof global !== undefined ? global : typeof self !== undefined ? self : typeof window !== undefined ? window : {});`)
      ]);

      this.push(file);
      return cb();
    }))
    .pipe(gulp.dest(`${config.paths.outDir}/cjs`));
}

function compileIndvES2015ModulesToBrowser() {
  const isFirebaseApp = fileName => {
    const pathObj = path.parse(fileName);
    return pathObj.name === 'firebase-app';
  };

  const babelLoader = {
    loader: 'babel-loader',
    options: config.babel
  };

  const tsLoader = {
    loader: 'ts-loader',
    options: {
      compilerOptions: {
        declaration: false
      }
    }
  };

  const webpackConfig = {
    devtool: 'source-map',
    entry: {
      'firebase-app': './src/app.ts',
      'firebase-storage': './src/storage.ts',
      'firebase-messaging': './src/messaging.ts',
      'firebase-database': './src/database.ts',
    },
    output: {
      path: path.resolve(__dirname, './dist/browser'),
      filename: '[name].js',
      jsonpFunction: 'webpackJsonpFirebase'
    },
    module: {
      rules: [{
        test: /\.ts(x?)$/,
        exclude: /node_modules/,
        use: [
          babelLoader,
          tsLoader
        ]
      }, {
        test: /\.js$/,
        exclude: /node_modules/,
        use: [
          babelLoader
        ]
      }]
    },
    plugins: [
      new webpack.optimize.CommonsChunkPlugin({
        name: 'firebase-app'
      }),
      new WrapperPlugin({
        header: fileName => {
          return isFirebaseApp(fileName) ? `var firebase = (function() {
            var window = typeof window === 'undefined' ? self : window;
          return ` : `try {
          `;
        },
        footer: fileName => {
          return isFirebaseApp(fileName) ? `
          })();` : `
          } catch(error) {
            throw new Error(
              'Cannot instantiate ${fileName} - ' +
              'be sure to load firebase-app.js first.'
            )
          }`        
        }
      }),
      new webpack.optimize.UglifyJsPlugin({
        sourceMap: true
      })
    ],
    resolve: {
      extensions: ['.ts', '.tsx', '.js']
    },
  }

  return gulp.src('src/**/*.ts')
    .pipe(webpackStream(webpackConfig, webpack))
    .pipe(gulp.dest(`${config.paths.outDir}/browser`));
}

function compileSDKES2015ToBrowser() {
  return gulp.src('./dist/es2015/firebase.js')
    .pipe(webpackStream({
      plugins: [
        new webpack.DefinePlugin({
          TARGET_ENVIRONMENT: JSON.stringify('browser')
        })
      ]
    }, webpack))
    .pipe(sourcemaps.init({ loadMaps: true }))
    .pipe(through.obj(function(file, enc, cb) {
      // Dont pipe through any source map files as it will be handled
      // by gulp-sourcemaps
      var isSourceMap = /\.map$/.test(file.path);
      if (!isSourceMap) this.push(file);
      cb();
    }))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest(`${config.paths.outDir}/browser`));
}

function buildBrowserFirebaseJs() {
  return gulp.src('./dist/browser/*.js')
    .pipe(sourcemaps.init({ loadMaps: true }))
    .pipe(concat('firebase.js'))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest(`${config.paths.outDir}/browser`));
}

function buildAltEnvFirebaseJs() {
  const envs = [
    'browser',
    'node',
    'react-native'
  ];

  const streams = envs.map(env => {
    const babelConfig = Object.assign({}, config.babel, {
      plugins: [
        ['inline-replace-variables', {
          'TARGET_ENVIRONMENT': env
        }],
        ...config.babel.plugins
      ]
    });
    return gulp.src('./dist/es2015/firebase.js')
      .pipe(sourcemaps.init({ loadMaps: true }))
      .pipe(babel(babelConfig))
      .pipe(rename({
        suffix: `-${env}`
      }))
      .pipe(sourcemaps.write('.'))
      .pipe(gulp.dest(`${config.paths.outDir}/cjs`));
  });

  return merge(streams);
}

function copyPackageContents() {
  const copyBrowserCode = gulp.src('./dist/browser/**/*')
    .pipe(gulp.dest(`${config.paths.outDir}/package`));

  const copyCJSCode = gulp.src([
      './dist/cjs/**/*',
      '!./dist/cjs/firebase.js*'
    ])
    .pipe(gulp.dest(`${config.paths.outDir}/package`));
  
  return merge([
    copyBrowserCode,
    copyCJSCode
  ]);
}

function compileMetaFiles() {
  const outPkg = (_pkg => {
    // Format the new package.json
    let obj = Object.assign({}, _pkg, {
      scripts: null,
      devDependencies: null,
      main: 'firebase-node.js',
      browser: 'firebase-browser.js',
      'react-native': 'firebase-react-native.js',
      types: 'firebase.d.ts',
      nyc: null,
      babel: null,
    });
    
    // Delete all props that are falsy
    for (let key in obj) {
      if (!obj[key]) delete obj[key];
    }

    // Return formatted JSON string
    return JSON.stringify(obj, null, 2);
  })(config.pkg);

  const pkgJson = gulpFile('package.json', outPkg, {src: true })

  const copyFiles = gulp.src([
    'LICENSE',
    './dist/global/*',
    './typings/**/*'
  ]);

  const copyReadme = gulp.src('README.public.md')
    .pipe(rename({
      basename: 'README'
    }))
    .pipe(gulp.dest(`${config.paths.outDir}/package/`));

  const copyExterns = gulp.src('./externs/**/*')
    .pipe(gulp.dest(`${config.paths.outDir}/package/externs`));

  return merge([
    merge([copyFiles,pkgJson])
      .pipe(gulp.dest(`${config.paths.outDir}/package`)),
    copyExterns,
    copyReadme
  ]);
}

function injectSDKVersion() {
  return gulp.src('./dist/package/**/*', {base: '.'})
    .pipe(replace(/\${JSCORE_VERSION}/g, config.pkg.version))
    .pipe(gulp.dest('.'));
}

function cleanComments() {
  return gulp.src([
      './dist/package/**/*.js',
      '!./dist/package/externs/*'
    ], {base: '.'})
    .pipe(stripComments({
      // TODO: Remove this comment in 3.8.0 release
      ignore: /\/\/# sourceMappingURL=.+\.map/g
    }))
    .pipe(gulp.dest('.'));
}

function injectLicenseInfo() {
  const rev = gitRev.short();

  const licenseHeader = `/*! @license Firebase v${config.pkg.version}
Build: rev-${rev}
Terms: https://firebase.google.com/terms/ */

`;

  const bigLicenseHeader = `/*! @license Firebase v${config.pkg.version}
Build: rev-${rev}
Terms: https://firebase.google.com/terms/

---

typedarray.js
Copyright (c) 2010, Linden Research, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE. */

`;

  return gulp.src('./dist/package/**/*.js', {base: '.'})
    .pipe(gulpIf(file => {
      const _path = path.parse(file.path);
      return _path.base !== 'firebase.js' && !~_path.base.indexOf('database');
    },header(licenseHeader), header(bigLicenseHeader)))
    .pipe(gulp.dest('.'));
}

function logFileSize(done) {
  console.log('\r\n| File | Parsed Size | Gzip Size');
  console.log('|----------|-------------|------|');

  const filePaths = glob.sync('./dist/browser/*.js');
  filePaths
  .map(filePath => {
    const _path = path.parse(filePath);
    return path.resolve(_path.dir, `../package/${_path.base}`);
  })
  .map(filePath => {
    const _path = path.parse(filePath);
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const rawSize = fs.statSync(filePath).size;
    const size = filesize(rawSize);
    const gzip = filesize(gzipSize.sync(fileContents));
    return {
      file: _path.base,
      size,
      gzip
    };
  })
  .forEach(obj => console.log(`| ${obj.file} | ${obj.size} | ${obj.gzip} |`));
  
  console.log('\r\n');
  done();
}

/**
 * GULP TASKS
 * 
 * Gulp tasks in Gulp 4.0 are a description of a series of functions.
 * The functions are all above and are easier to maintain individually
 * 
 * Each "task" is then responsible for wiring up the dep trees itself,
 * because of this you have a finer degree of control of the ordering
 * of your tasks **and** you can optimize the parallelization of each
 * task.
 */

gulp.task('build:es2015', gulp.series([
  compileTypescriptToES2015,
]));

gulp.task('build:cjs', gulp.parallel([
  gulp.series([
    compileTypescriptToES2015,
    gulp.parallel(compileES2015ToCJS, buildAltEnvFirebaseJs)
  ]),
  processPrebuiltFilesForCJS
]));

gulp.task('process:prebuilt', gulp.parallel([
  processPrebuiltFilesForBrowser,
  processPrebuiltFilesForCJS
]));

// This is the optimized build path, we reuse this in
// a couple places so capturing it here
const compileSourceAssets = gulp.series([
  compileTypescriptToES2015,
  gulp.parallel([
    compileIndvES2015ModulesToBrowser, 
    compileES2015ToCJS,
  ])
]);

gulp.task('build:browser', gulp.series([
  // Build the src assets and prebuilt assets in
  // parallel
  gulp.parallel([
    compileSourceAssets,
    processPrebuiltFilesForBrowser,
  ]),
  buildBrowserFirebaseJs
]));

const buildSDK = exports.buildSDK = gulp.series([
  cleanDist(),
  gulp.parallel([
    compileSourceAssets,
    processPrebuiltFilesForBrowser, 
    processPrebuiltFilesForCJS,
    compileMetaFiles
  ]),
  gulp.parallel(buildBrowserFirebaseJs, buildAltEnvFirebaseJs),
  copyPackageContents,
  injectLicenseInfo,
  injectSDKVersion,
  logFileSize
]);

gulp.task('build', buildSDK);