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
} from '../../repo-scripts/size-analysis/analysis-helper';
import { mapWorkspaceToPackages } from '../release/utils/workspace';
import { projectRoot } from '../utils';
import {
  upload,
  runId,
  RequestBody,
  RequestEndpoint
} from './size_report_helper';
interface ModularExportBinarySizeRequestBody extends RequestBody {
  modules: Report[];
}

async function generateReport(): Promise<ModularExportBinarySizeRequestBody> {
  let allModulesLocation: string[] = await mapWorkspaceToPackages([
    `${projectRoot}/packages-exp/*`
  ]);

  allModulesLocation = allModulesLocation.filter(path => {
    const json = require(`${path}/package.json`);
    return (
      json.name.startsWith('@firebase') &&
      !json.name.includes('-compat') &&
      !json.name.includes('-types')
    );
  });

  const reports: Report[] = await generateReportForModules(allModulesLocation);
  return {
    log: `https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${runId}`,
    modules: reports
  };
}

async function main(): Promise<void> {
  const reports: ModularExportBinarySizeRequestBody = await generateReport();
  console.log(JSON.stringify(reports, null, 4));
  upload(reports, RequestEndpoint.MODULAR_EXPORT_BINARY_SIZE);
}
main();
