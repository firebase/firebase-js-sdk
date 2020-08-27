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

import { resolve } from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';
import * as terser from 'terser';
import {
  upload,
  runId,
  RequestBody,
  RequestEndpoint
} from './size_report_helper';

interface Report {
  sdk: string;
  type: string;
  value: number;
}
interface BinarySizeRequestBody extends RequestBody {
  metric: string;
  results: Report[];
}
// CDN scripts
function generateReportForCDNScripts(): Report[] {
  const reports = [];
  const firebaseRoot = resolve(__dirname, '../../packages/firebase');
  const pkgJson = require(`${firebaseRoot}/package.json`);

  const special_files = [
    'firebase-performance-standalone.es2017.js',
    'firebase-performance-standalone.js',
    'firebase-firestore.memory.js',
    'firebase.js'
  ];

  const files = [
    ...special_files.map((file: string) => `${firebaseRoot}/${file}`),
    ...pkgJson.components.map(
      (component: string) => `${firebaseRoot}/firebase-${component}.js`
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
async function generateReportForNPMPackages(): Promise<Report[]> {
  const reports: Report[] = [];
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

  const taskPromises: Promise<void>[] = [];
  for (const pkg of packageInfo) {
    // we traverse the dir in order to include binaries for submodules, e.g. @firebase/firestore/memory
    // Currently we only traverse 1 level deep because we don't have any submodule deeper than that.
    traverseDirs(pkg.location, collectBinarySize, 0, 1);
  }

  await Promise.all(taskPromises);

  return reports;

  function collectBinarySize(path: string) {
    const promise = new Promise<void>(async resolve => {
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
          const { code } = await terser.minify(rawCode, {
            format: {
              comments: false
            },
            mangle: false,
            compress: false
          });

          const size = Buffer.byteLength(code!, 'utf-8');
          reports.push(makeReportObject(packageJson.name, field, size));
        }
      }

      resolve();
    });

    taskPromises.push(promise);
  }
}

function traverseDirs(
  path: string,
  executor: Function,
  level: number,
  levelLimit: number
) {
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

function makeReportObject(sdk: string, type: string, value: number): Report {
  return {
    sdk,
    type,
    value
  };
}

async function generateSizeReport(): Promise<BinarySizeRequestBody> {
  const reports: Report[] = [
    ...generateReportForCDNScripts(),
    ...(await generateReportForNPMPackages())
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

generateSizeReport().then(report => {
  upload(report, RequestEndpoint.BINARY_SIZE);
});
