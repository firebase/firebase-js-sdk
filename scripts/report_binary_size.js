/**
 * @license
 * Copyright 2020 Google LLC
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
const fs = require('fs');
const { execSync } = require('child_process');
const https = require('https');
const terser = require('terser');

const runId = process.env.GITHUB_RUN_ID || 'local-run-id';

const METRICS_SERVICE_URL = process.env.METRICS_SERVICE_URL;

// CDN scripts
function generateReportForCDNScripts() {
  const reports = [];
  const firebaseRoot = resolve(__dirname, '../packages/firebase');

  const pkgJson = require(`${firebaseRoot}/package.json`);

  const special_files = [
    'firebase-performance-standalone.es2017.js',
    'firebase-performance-standalone.js',
    'firebase-firestore.memory.js',
    'firebase.js'
  ];

  const files = [
    ...special_files.map(file => `${firebaseRoot}/${file}`),
    ...pkgJson.components.map(
      component => `${firebaseRoot}/firebase-${component}.js`
    )
  ];

  for (const file of files) {
    const { size } = fs.statSync(file);
    const fileName = file.split('/').slice(-1)[0];
    reports.push(makeReportObject('firebase', fileName, size));
  }

  return reports;
}

// NPM packages
function generateReportForNPMPackages() {
  const reports = [];
  const fields = [
    'main',
    'module',
    'esm2017',
    'browser',
    'react-native',
    'lite',
    'lite-esm2017'
  ];

  const packageInfo = JSON.parse(
    execSync('npx lerna ls --json --scope @firebase/*').toString()
  );

  for (const package of packageInfo) {
    // we traverse the dir in order to include binaries for submodules, e.g. @firebase/firestore/memory
    // Currently we only traverse 1 level deep because we don't have any submodule deeper than that.
    traverseDirs(package.location, collectBinarySize, 0, 1);
  }

  function collectBinarySize(path) {
    const packageJsonPath = `${path}/package.json`;
    if (!fs.existsSync(packageJsonPath)) {
      return;
    }

    const packageJson = require(packageJsonPath);

    for (const field of fields) {
      if (packageJson[field]) {
        const filePath = `${path}/${packageJson[field]}`;
        const rawCode = fs.readFileSync(filePath, 'utf-8');

        // remove comments and whitespaces, then get size
        const { code } = terser.minify(rawCode, {
          output: {
            comments: false
          },
          mangle: false,
          compress: false
        });

        const size = Buffer.byteLength(code, 'utf-8');
        reports.push(makeReportObject(packageJson.name, field, size));
      }
    }
  }

  return reports;
}

function traverseDirs(path, executor, level, levelLimit) {
  if (level > levelLimit) {
    return;
  }

  executor(path);

  for (const name of fs.readdirSync(path)) {
    const p = `${path}/${name}`;

    if (fs.lstatSync(p).isDirectory()) {
      traverseDirs(p, executor, level + 1, levelLimit);
    }
  }
}

function makeReportObject(sdk, type, value) {
  return {
    sdk,
    type,
    value
  };
}

function generateSizeReport() {
  const reports = [
    ...generateReportForCDNScripts(),
    ...generateReportForNPMPackages()
  ];

  for (const r of reports) {
    console.log(r.sdk, r.type, r.value);
  }

  console.log(
    `Github Action URL: https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${runId}`
  );

  return {
    log: `https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${runId}`,
    metric: 'BinarySize',
    results: reports
  };
}

function constructRequestPath() {
  const repo = process.env.GITHUB_REPOSITORY;
  const commit = process.env.GITHUB_SHA;
  let path = `/repos/${repo}/commits/${commit}/reports`;
  if (process.env.GITHUB_EVENT_NAME === 'pull_request') {
    const pullRequestNumber = process.env.GITHUB_PULL_REQUEST_NUMBER;
    const pullRequestBaseSha = process.env.GITHUB_PULL_REQUEST_BASE_SHA;
    path += `?pull_request=${pullRequestNumber}&base_commit=${pullRequestBaseSha}`;
  } else if (process.env.GITHUB_EVENT_NAME === 'push') {
    const ref = process.env.GITHUB_REF; // 'refs/heads/<some-branch-name>'
    const branch = ref.substring('refs/heads/'.length);
    path += `?branch=${branch}`;
  }
  return path;
}

function constructRequestOptions(path) {
  const accessToken = execSync('gcloud auth print-identity-token', {
    encoding: 'utf8'
  }).trim();
  return {
    path: path,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  };
}

function upload(report) {
  if (!process.env.GITHUB_ACTIONS) {
    console.log('Metrics upload is only enabled on CI.');
    return;
  }

  const path = constructRequestPath();
  const options = constructRequestOptions(path);

  console.log(`${report.metric} report:`, report);
  console.log(`Posting to metrics service endpoint: ${path} ...`);

  const request = https.request(METRICS_SERVICE_URL, options, response => {
    response.setEncoding('utf8');
    console.log(`Response status code: ${response.statusCode}`);
    response.on('data', console.log);
    response.on('end', () => {
      if (response.statusCode !== 202) {
        process.exit(1);
      }
    });
  });
  request.write(JSON.stringify(report));
  request.end();
}

const report = generateSizeReport();
upload(report);
