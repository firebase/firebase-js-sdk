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

import {
  generateReportForModules,
  Report
} from '../repo-scripts/size-analysis/analysis-helper';

import { execSync } from 'child_process';
import * as https from 'https';
import { mapWorkspaceToPackages } from './release/utils/workspace';
import { projectRoot } from './utils';

interface RequestBody {
  log: string;
  modules: Report[];
}
const runId: string = process.env.GITHUB_RUN_ID || 'local-run-id';

const METRICS_SERVICE_URL: string = process.env.METRICS_SERVICE_URL;
//const METRICS_SERVICE_URL: string = 'https://size-analysis-test-tv5rmd4a6q-uc.a.run.app';

async function generateReport(): Promise<RequestBody> {
  const requestBody: RequestBody = {
    log: `https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${runId}`,
    modules: []
  };
  try {
    let allModulesLocation: string[] = await mapWorkspaceToPackages([
      `${projectRoot}/packages-exp/*`
    ]);

    allModulesLocation = allModulesLocation.filter(path => {
      const json = require(`${path}/package.json`);
      return json.name.startsWith('@firebase');
    });
    const reports: Report[] = await generateReportForModules(
      allModulesLocation
    );

    for (const report of reports) {
      requestBody.modules.push(report);
    }

    return requestBody;
  } catch (error) {
    console.log(error);
    return requestBody;
  }
}

function constructRequestPath(): string {
  const repo = process.env.GITHUB_REPOSITORY;
  const commit = process.env.GITHUB_SHA;
  let path = `/repos/${repo}/commits/${commit}/size_analysis`;
  if (process.env.GITHUB_EVENT_NAME === 'pull_request') {
    const pullRequestNumber = process.env.GITHUB_PULL_REQUEST_NUMBER;
    const pullRequestBaseSha = process.env.GITHUB_PULL_REQUEST_BASE_SHA;
    path += `?pull_request=${pullRequestNumber}&base_commit=${pullRequestBaseSha}`;
  } else if (process.env.GITHUB_EVENT_NAME === 'push') {
    const ref = process.env.GITHUB_REF; // 'refs/heads/<some-branch-name>'
    const branch = ref!.substring('refs/heads/'.length);
    path += `?branch=${branch}`;
  }
  return path;
}

function constructRequestOptions(path: string) {
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

function upload(report: RequestBody): void {
  if (!process.env.GITHUB_ACTIONS) {
    console.log('Metrics upload is only enabled on CI.');
    return;
  }

  const path = constructRequestPath();
  const options = constructRequestOptions(path);
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

async function main(): Promise<void> {
  const report: RequestBody = await generateReport();
  upload(report);
}
main();
