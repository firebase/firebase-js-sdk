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
import { existsSync, lstatSync, readFileSync, writeFileSync } from 'fs';
import { spawn } from 'child-process-promise';
import { ordinal } from '@firebase/util';
import { bundleWithRollup } from './bundle/rollup';
import { bundleWithWebpack } from './bundle/webpack';
import { calculateContentSize } from './util';
import { minify } from './bundle/minify';
import { extractAllTopLevelSymbols, MemberList } from './analysis-helper';

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
  description?: string;
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

export enum Bundler {
  Rollup = 'rollup',
  Webpack = 'webpack',
  Both = 'both'
}

export enum Mode {
  Npm = 'npm',
  Local = 'local'
}

enum SpecialImport {
  Default = 'default import',
  Sizeeffect = 'side effect import',
  Namespace = 'namespace import'
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
    description: bundleDefinition.description ?? '',
    results: [],
    dependencies: bundleDefinition.dependencies
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
      dependencies: extractAllTopLevelSymbols(bundleFilePath)
    };
  }

  return analysisResult;
}

function createEntryFileContent(bundleDefinition: BundleDefinition): string {
  const contentArray = [];
  // cache used symbols. Used to avoid symbol collision when multiple modules export symbols with the same name.
  const symbolsCache = new Set<string>();
  for (const dep of bundleDefinition.dependencies) {
    for (const imp of dep.imports) {
      if (typeof imp === 'string') {
        contentArray.push(
          ...createImportExport(imp, dep.packageName, symbolsCache)
        );
      } else {
        // submodule imports
        for (const subImp of imp.imports) {
          contentArray.push(
            ...createImportExport(
              subImp,
              `${dep.packageName}/${imp.path}`,
              symbolsCache
            )
          );
        }
      }
    }
  }

  return contentArray.join('\n');
}

function createImportExport(
  symbol: string,
  modulePath: string,
  symbolsCache: Set<string>
): string[] {
  const contentArray = [];

  switch (symbol) {
    case SpecialImport.Default: {
      const nameToUse = createSymbolName('default_import', symbolsCache);
      contentArray.push(`import ${nameToUse} from '${modulePath}';`);
      contentArray.push(`console.log(${nameToUse})`); // prevent import from being tree shaken
      break;
    }
    case SpecialImport.Namespace: {
      const nameToUse = createSymbolName('namespace', symbolsCache);
      contentArray.push(`import * as ${nameToUse} from '${modulePath}';`);
      contentArray.push(`console.log(${nameToUse})`); // prevent import from being tree shaken
      break;
    }
    case SpecialImport.Sizeeffect:
      contentArray.push(`import '${modulePath}';`);
      break;
    default:
      // named imports
      const nameToUse = createSymbolName(symbol, symbolsCache);

      if (nameToUse !== symbol) {
        contentArray.push(
          `export {${symbol} as ${nameToUse}} from '${modulePath}';`
        );
      } else {
        contentArray.push(`export {${symbol}} from '${modulePath}';`);
      }
  }

  return contentArray;
}

/**
 * In case a symbol with the same name is already imported from another module, we need to give this symbol another name
 * using "originalname as anothername" syntax, otherwise it returns the original symbol name.
 */
function createSymbolName(symbol: string, symbolsCache: Set<string>): string {
  let nameToUse = symbol;
  const max = 100;
  while (symbolsCache.has(nameToUse)) {
    nameToUse = `${symbol}_${Math.floor(Math.random() * max)}`;
  }

  symbolsCache.add(nameToUse);
  return nameToUse;
}

interface BundleAnalysis {
  name: string; // the bundle name defined in the bundle definition
  description: string;
  dependencies: BundleDependency[];
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
