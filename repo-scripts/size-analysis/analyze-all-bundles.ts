/**
 * @license
 * Copyright 2021 Google LLC
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
import * as tmp from 'tmp';

import { Bundler, Mode, run as runBundleAnalysis } from './bundle-analysis';
import { Report } from '../../scripts/size_report/report_binary_size';

export async function generateReportForBundles(version?: string) {
  const definitionDir = `${__dirname}/bundle-definitions`;
  const outputDir = tmp.dirSync().name;
  console.log(`Bundle definitions are located at "${definitionDir}".`);
  console.log(`Analysis output are located at "${outputDir}".`);

  const bundles = fs.readdirSync(definitionDir);
  const results: Report[] = [];
  for (const bundle of bundles) {
    const product = path.basename(bundle, '.json');
    const output = `${outputDir}/${product}.analysis.json`;
    if (version) {
      overwriteVersion(definitionDir, bundle, outputDir, version);
    }
    const option = {
      input: version ? `${outputDir}/${bundle}` : `${definitionDir}/${bundle}`,
      bundler: Bundler.Rollup,
      mode: version ? Mode.Npm : Mode.Local,
      output: output,
      debug: true
    };
    console.log(`Running for bundle "${bundle}" with mode "${option.mode}".`);
    await runBundleAnalysis(option);
    const measurements = parseAnalysisOutput(product, output);
    results.push(...measurements);
  }
  console.log(results);
  return results;
}

function overwriteVersion(
  definitionDir: string,
  bundle: string,
  temp: string,
  version: string
) {
  const definitions = JSON.parse(
    fs.readFileSync(`${definitionDir}/${bundle}`, { encoding: 'utf-8' })
  );
  for (const definition of definitions) {
    const dependencies = definition.dependencies;
    for (const dependency of dependencies) {
      dependency.versionOrTag = version;
    }
  }
  fs.writeFileSync(`${temp}/${bundle}`, JSON.stringify(definitions, null, 2), {
    encoding: 'utf-8'
  });
}

function parseAnalysisOutput(product: string, output: string) {
  const analyses = JSON.parse(fs.readFileSync(output, { encoding: 'utf-8' }));
  const results: Report[] = [];
  for (const analysis of analyses) {
    const sdk = 'bundle';
    const value = analysis.results[0].size;
    const type = `${product} (${analysis.name})`;
    results.push({ sdk, type, value });
  }
  return results;
}
