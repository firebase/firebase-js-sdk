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

import * as fs from 'fs';
import * as path from 'path';
import * as rollup from 'rollup';
import * as terser from 'terser';

import { execSync } from 'child_process';
import {
  upload,
  runId,
  RequestBody,
  RequestEndpoint
} from './size_report_helper';
import { generateReportForBundles } from '../../repo-scripts/size-analysis/analyze-all-bundles';
import { glob } from 'glob';

import commonjs from '@rollup/plugin-commonjs';

export interface Report {
  sdk: string;
  type: string;
  value: number;
}
interface BinarySizeRequestBody extends RequestBody {
  metric: string;
  results: Report[];
}

function generateReportForCDNScripts(): Report[] {
  const reports = [];
  const firebaseRoot = path.resolve(__dirname, '../../packages/firebase');
  const pkgJson = require(`${firebaseRoot}/package.json`);
  const compatPkgJson = require(`${firebaseRoot}/compat/package.json`);

  const special_files = [
    'firebase-performance-standalone-compat.es2017.js',
    'firebase-performance-standalone-compat.js',
    'firebase-compat.js'
  ];

  const files = [
    ...special_files.map((file: string) => `${firebaseRoot}/${file}`),
    ...pkgJson.components.map(
      (component: string) =>
        `${firebaseRoot}/firebase-${component.replace('/', '-')}.js`
    ),
    ...compatPkgJson.components.map(
      (component: string) => `${firebaseRoot}/firebase-${component}-compat.js`
    )
  ];

  for (const file of files) {
    const { size } = fs.statSync(file);
    const fileName = file.split('/').slice(-1)[0];
    reports.push({ sdk: 'firebase', type: fileName, value: size });
  }

  return reports;
}

async function generateReportForNPMPackages(): Promise<Report[]> {
  const reports: Report[] = [];
  const packageInfo = JSON.parse(
    execSync('npx lerna ls --json --scope @firebase/*').toString()
  );
  for (const info of packageInfo) {
    const packages = await findAllPackages(info.location);
    for (const pkg of packages) {
      try {
        reports.push(...(await collectBinarySize(pkg)));
      } catch (e) {
        // log errors and continue to the next package
        console.log(
          `failed to generate report for ${pkg}.
           error: ${e}`
        );
      }
    }
  }
  return reports;
}

async function findAllPackages(root: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    glob(
      '**/package.json',
      { cwd: root, ignore: '**/node_modules/**' },
      (err, files) => {
        if (err) {
          reject(err);
        } else {
          resolve(files.map(x => path.resolve(root, x)));
        }
      }
    );
  });
}

async function collectBinarySize(pkg: string): Promise<Report[]> {
  const reports: Report[] = [];
  const fields = [
    'main',
    'module',
    'browser',
    'esm5',
    'react-native',
    'cordova',
    'lite',
    'lite-esm5'
  ];
  const json = require(pkg);
  for (const field of fields) {
    if (json[field]) {
      const artifact = path.resolve(path.dirname(pkg), json[field]);

      // Need to create a bundle and get the size of the bundle instead of reading the size of the file directly.
      // It is because some packages might be split into multiple files in order to share code between entry points.
      const bundle = await rollup.rollup({
        input: artifact,
        plugins: [commonjs()]
      });

      const { output } = await bundle.generate({ format: 'es' });
      const rawCode = output[0].code;

      // remove comments and whitespaces, then get size
      const { code } = await terser.minify(rawCode, {
        format: {
          comments: false
        },
        mangle: false,
        compress: false
      });

      const size = Buffer.byteLength(code!, 'utf-8');
      reports.push({ sdk: json.name, type: field, value: size });
    }
  }
  return reports;
}

async function generateSizeReport(): Promise<BinarySizeRequestBody> {
  const reports: Report[] = [
    ...generateReportForCDNScripts(),
    ...(await generateReportForNPMPackages()),
    ...(await generateReportForBundles())
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

generateSizeReport()
  .then(report => {
    upload(report, RequestEndpoint.BINARY_SIZE);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
