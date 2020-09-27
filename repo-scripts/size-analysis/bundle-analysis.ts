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

import { existsSync, lstatSync, readFileSync } from 'fs';
import { ordinal } from '@firebase/util';

interface BundleAnalysisArgs {
  input: string;
  bundler: string;
  output: string;
}

interface BundleAnalysisOptions {
  bundleDefinitions: BundleDefinition[];
  bundler: string;
  output: string;
}

interface BundleDefinition {
  description: string;
  dependencies: BundleDependency[];
}

interface BundleDependency {
  packageName: string; // TODO: support local packages
  imports: string[];
}

export async function analyzeBundleSize({
  input,
  bundler,
  output
}: BundleAnalysisArgs): Promise<void> {
  const options = {
    bundleDefinitions: loadBundleDefinitions(input),
    bundler: bundler,
    output: output
  };

  return analyze(options);
}

function loadBundleDefinitions(path: string): BundleDefinition[] {
  if (!existsSync(path)) {
    throw new Error(
      `${path} doesn't exist. Please provide a valid path to the bundle defintion file.`
    );
  }

  if (lstatSync(path).isDirectory()) {
    throw new Error(
      `Expecting a file, but ${path} is a directory. Please provide a valid path to the bundle definition file.`
    );
  }

  const def = JSON.parse(readFileSync(path, { encoding: 'utf-8' }));

  const errorMessages = validateBundleDefinition(def);

  if (errorMessages.length > 0) {
    throw new Error(errorMessages.join('\n'));
  }

  return def;
}

/**
 *
 * @param input
 * @returns - an array of error messages. Empty if the bundle definition is valid
 */
function validateBundleDefinition(input: BundleDefinition[]): string[] {
  const errorMessages = [];
  if (!Array.isArray(input)) {
    errorMessages.push('Bundle definition must be defined in an array');
    return errorMessages;
  }

  for (let i = 0; i < input.length; i++) {
    const bundleDefinition = input[i];
    if (!bundleDefinition.description) {
      errorMessages.push(
        `Missing field 'description' in the ${ordinal(i + 1)} bundle definition`
      );
    }

    if (!bundleDefinition.dependencies) {
      errorMessages.push(
        `Missing field 'dependencies' in the ${ordinal(
          i + 1
        )} bundle definition`
      );
    }

    if (!Array.isArray(bundleDefinition.dependencies)) {
      errorMessages.push(
        `Expecting an array for field 'dependencies', but it is not an array in the ${ordinal(
          i + 1
        )} bundle definition`
      );
    }

    for (let j = 0; j < bundleDefinition.dependencies.length; j++) {
      const dependency = bundleDefinition.dependencies[j];

      if (!dependency.packageName) {
        errorMessages.push(
          `Missing field 'packageName' in the ${ordinal(
            j + 1
          )} dependency of the ${ordinal(i + 1)} bundle definition`
        );
      }

      if (!dependency.imports) {
        errorMessages.push(
          `Missing field 'imports' in the ${ordinal(
            j + 1
          )} dependency of the ${ordinal(i + 1)} bundle definition`
        );
      }

      if (!Array.isArray(dependency.imports)) {
        errorMessages.push(
          `Expecting an array for field 'imports', but it is not an array in the ${ordinal(
            j + 1
          )} dependency of the ${ordinal(i + 1)} bundle definition`
        );
      }
    }
  }

  return errorMessages;
}

async function analyze(options: BundleAnalysisOptions) {}
