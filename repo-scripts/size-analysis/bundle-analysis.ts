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

import { existsSync, lstatSync, readFileSync, writeFileSync } from 'fs';
import { ordinal } from '@firebase/util';

interface BundleAnalysisArgs {
  input: string;
  bundler: 'webpack' | 'rollup' | 'both';
  mode: 'npm' | 'local';
  output: string;
}

interface BundleAnalysisOptions {
  bundleDefinitions: BundleDefinition[];
  bundler: Bundler;
  mode: Mode;
  output: string;
}

interface BundleDefinition {
  name: string;
  dependencies: BundleDependency[];
}

interface BundleDependency {
  packageName: string; // TODO: support local packages
  /**
   * npm version or tag
   */
  versionOrTag: string;
  imports: string[];
}

enum Bundler {
  Rollup = 'rollup',
  Webpack = 'webpack',
  Both = 'both'
}

enum Mode {
  Npm = 'npm',
  Local = 'local'
}

export async function analyzeBundleSize({
  input,
  bundler,
  mode,
  output
}: BundleAnalysisArgs): Promise<void> {
  const options = {
    bundleDefinitions: loadBundleDefinitions(input),
    bundler: toBundlerEnum(bundler),
    mode: toModeEnum(mode),
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

  const def = parseBundleDefinition(readFileSync(path, { encoding: 'utf-8' }));

  return def;
}

function toBundlerEnum(bundler: 'webpack' | 'rollup' | 'both'): Bundler {
  switch (bundler) {
    case 'rollup':
      return Bundler.Rollup;
    case 'webpack':
      return Bundler.Webpack;
    case 'both':
      return Bundler.Both;
    default:
      throw new Error('impossible!');
  }
}

function toModeEnum(mode: 'npm' | 'local'): Mode {
  switch (mode) {
    case 'npm':
      return Mode.Npm;
    case 'local':
      return Mode.Local;
    default:
      throw new Error('impossible');
  }
}

/**
 *
 * @param input
 * @returns - an array of error messages. Empty if the bundle definition is valid
 */
function parseBundleDefinition(input: string): BundleDefinition[] {
  const inputDefinitions: BundleDefinition[] = JSON.parse(input);

  const errorMessages = [];
  if (!Array.isArray(inputDefinitions)) {
    throw new Error('Bundle definition must be defined in an array');
  }

  for (let i = 0; i < inputDefinitions.length; i++) {
    const bundleDefinition = inputDefinitions[i];
    if (!bundleDefinition.name) {
      errorMessages.push(
        `Missing field 'name' in the ${ordinal(i + 1)} bundle definition`
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

      if (!dependency.versionOrTag) {
        dependency.versionOrTag = 'latest';
      }
    }
  }

  return errorMessages;
}

async function analyze({
  bundleDefinitions,
  bundler,
  output
}: BundleAnalysisOptions) {
  const analyses: BundleAnalysis[] = [];
  for (const bundleDefinition of bundleDefinitions) {
    analyses.push(await analyzeBundle(bundleDefinition, bundler));
  }

  writeFileSync(output, JSON.stringify(analyses, null, 2), {
    encoding: 'utf-8'
  });
}

async function analyzeBundle(
  bundleDefinition: BundleDefinition,
  bundler: Bundler
): Promise<BundleAnalysis> {}

interface BundleAnalysis {
  name: string; // the bundle name defined in the bundle definition
  results: BundleAnalysisResult[];
}

interface BundleAnalysisResult {
  bundler: 'rollup' | 'webpack';
  size: number;
  gzipSize: number;
}
