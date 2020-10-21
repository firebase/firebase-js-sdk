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
import * as tmp from 'tmp';
import {
  existsSync,
  lstatSync,
  readFileSync,
  writeFile,
  writeFileSync
} from 'fs';
import { spawn } from 'child-process-promise';
import { ordinal } from '@firebase/util';
import { bundleWithRollup } from './bundle/rollup';
import { bundleWithWebpack } from './bundle/webpack';
import { calculateContentSize } from './util';
import { minify } from './bundle/minify';
import { extractDeclarations, MemberList } from './analysis-helper';

interface BundleAnalysisArgs {
  input: string;
  bundler: 'webpack' | 'rollup' | 'both';
  mode: 'npm' | 'local';
  output: string;
  debug: boolean;
}

interface BundleAnalysisOptions {
  bundleDefinitions: BundleDefinition[];
  bundler: Bundler;
  mode: Mode;
  output: string;
  debug: boolean;
}

interface DebugOptions {
  output: string; // output folder for debug files
}

interface BundleDefinition {
  name: string;
  dependencies: BundleDependency[];
}

interface BundleDependency {
  packageName: string;
  /**
   * npm version or tag
   */
  versionOrTag: string;
  imports: string | SubModuleImport[];
}

interface SubModuleImport {
  path: string;
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

export async function run({
  input,
  bundler,
  mode,
  output,
  debug
}: BundleAnalysisArgs): Promise<void> {
  const options = {
    bundleDefinitions: loadBundleDefinitions(input),
    bundler: toBundlerEnum(bundler),
    mode: toModeEnum(mode),
    output,
    debug
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
  const bundleDefinitions: BundleDefinition[] = JSON.parse(input);

  const errorMessages = [];
  if (!Array.isArray(bundleDefinitions)) {
    throw new Error('Bundle definition must be defined in an array');
  }

  for (let i = 0; i < bundleDefinitions.length; i++) {
    const bundleDefinition = bundleDefinitions[i];
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

  if (errorMessages.length > 0) {
    throw new Error(errorMessages.join('\n'));
  }

  return bundleDefinitions;
}

async function analyze({
  bundleDefinitions,
  bundler,
  output,
  mode,
  debug
}: BundleAnalysisOptions): Promise<void> {
  const analyses: BundleAnalysis[] = [];

  let debugOptions: DebugOptions | undefined;
  if (debug) {
    const tmpDir = tmp.dirSync();
    debugOptions = {
      output: tmpDir.name
    };
  }

  for (const bundleDefinition of bundleDefinitions) {
    analyses.push(
      await analyzeBundle(bundleDefinition, bundler, mode, debugOptions)
    );
  }

  writeFileSync(output, JSON.stringify(analyses, null, 2), {
    encoding: 'utf-8'
  });
}

async function analyzeBundle(
  bundleDefinition: BundleDefinition,
  bundler: Bundler,
  mode: Mode,
  debugOptions?: DebugOptions
): Promise<BundleAnalysis> {
  const analysis: BundleAnalysis = {
    name: bundleDefinition.name,
    results: []
  };

  let moduleDirectory: string | undefined;
  let tmpDir: tmp.DirResult | undefined;
  if (mode === Mode.Npm) {
    tmpDir = await setupTempProject(bundleDefinition);
    moduleDirectory = `${tmpDir.name}/node_modules`;
  }

  const entryFileContent = createEntryFileContent(bundleDefinition);

  switch (bundler) {
    case Bundler.Rollup:
    case Bundler.Webpack:
      analysis.results.push(
        await analyzeBundleWithBundler(
          bundleDefinition.name,
          entryFileContent,
          bundler,
          moduleDirectory,
          debugOptions
        )
      );
      break;
    case Bundler.Both:
      analysis.results.push(
        await analyzeBundleWithBundler(
          bundleDefinition.name,
          entryFileContent,
          Bundler.Rollup,
          moduleDirectory,
          debugOptions
        )
      );
      analysis.results.push(
        await analyzeBundleWithBundler(
          bundleDefinition.name,
          entryFileContent,
          Bundler.Webpack,
          moduleDirectory,
          debugOptions
        )
      );
      break;
    default:
      throw new Error('impossible!');
  }

  if (tmpDir) {
    tmpDir.removeCallback();
  }

  return analysis;
}

/**
 * Create a temp project and install dependencies the bundleDefinition defines
 * @returns - the path to the temp project
 */
async function setupTempProject(
  bundleDefinition: BundleDefinition
): Promise<tmp.DirResult> {
  /// set up a temporary project to install dependencies
  const tmpDir = tmp.dirSync({ unsafeCleanup: true });
  console.log(tmpDir.name);
  // create package.json
  const pkgJson: {
    name: string;
    version: string;
    dependencies: Record<string, string>;
  } = {
    name: 'size-analysis',
    version: '0.0.0',
    dependencies: {}
  };

  for (const dep of bundleDefinition.dependencies) {
    pkgJson.dependencies[dep.packageName] = dep.versionOrTag;
  }

  writeFileSync(
    `${tmpDir.name}/package.json`,
    `${JSON.stringify(pkgJson, null, 2)}\n`,
    { encoding: 'utf-8' }
  );

  // install dependencies
  await spawn('npm', ['install'], {
    cwd: tmpDir.name,
    stdio: 'inherit'
  });

  return tmpDir;
}

async function analyzeBundleWithBundler(
  bundleName: string,
  entryFileContent: string,
  bundler: Exclude<Bundler, 'both'>,
  moduleDirectory?: string,
  debugOptions?: DebugOptions
): Promise<BundleAnalysisResult> {
  let bundledContent = '';

  // bundle using bundlers
  if (bundler === Bundler.Rollup) {
    bundledContent = await bundleWithRollup(entryFileContent, moduleDirectory);
  } else {
    bundledContent = await bundleWithWebpack(entryFileContent, moduleDirectory);
  }

  const minifiedBundle = await minify(bundledContent);
  const { size, gzipSize } = calculateContentSize(minifiedBundle);

  const analysisResult: BundleAnalysisResult = {
    bundler,
    size,
    gzipSize
  };

  if (debugOptions) {
    const bundleFilePath = `${debugOptions.output}/${bundleName.replace(
      / +/g,
      '-'
    )}.${bundler}.js`;
    const minifiedBundleFilePath = `${debugOptions.output}/${bundleName.replace(
      / +/g,
      '-'
    )}.${bundler}.minified.js`;
    writeFileSync(bundleFilePath, bundledContent, { encoding: 'utf8' });
    writeFileSync(minifiedBundleFilePath, minifiedBundle, { encoding: 'utf8' });

    analysisResult.debugInfo = {
      pathToBundle: bundleFilePath,
      pathToMinifiedBundle: minifiedBundleFilePath,
      dependencies: extractDeclarations(bundleFilePath)
    };
  }

  return analysisResult;
}

function createEntryFileContent(bundleDefinition: BundleDefinition): string {
  const contentArray = [];
  for (const dep of bundleDefinition.dependencies) {
    for (const imp of dep.imports) {
      if (typeof imp === 'string') {
        contentArray.push(`export {${imp}} from '${dep.packageName}';`);
      } else {
        // Import object
        for (const subImp of imp.imports) {
          contentArray.push(
            `export {${subImp}} from '${dep.packageName}/${imp.path}';`
          );
        }
      }
    }
  }

  return contentArray.join('\n');
}

interface BundleAnalysis {
  name: string; // the bundle name defined in the bundle definition
  results: BundleAnalysisResult[];
}

interface BundleAnalysisResult {
  bundler: 'rollup' | 'webpack';
  size: number;
  gzipSize: number;
  debugInfo?: {
    pathToBundle?: string;
    pathToMinifiedBundle?: string;
    dependencies?: MemberList;
  };
}
