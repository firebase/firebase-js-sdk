/**
 * @license
 * Copyright 2026 Google LLC
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

import { dirname, resolve } from 'path';
import typescript from 'typescript';

/**
 * Returns a Rollup plugin that transpiles JavaScript modules, which in CDN
 * bundles are mostly third-party dependencies, to the `target` of the given
 * tsconfig, so that a CDN bundle doesn't contain syntax newer than that target.
 *
 * It uses `ts.transpileModule`, which transpiles one file at a time without
 * building a program or a type checker. rollup-plugin-typescript2 can also
 * transpile JavaScript (if its `include` option matches `*.js` files), but it
 * compiles through a TypeScript language service that rebuilds its whole
 * program for every file it adds, which takes minutes for bundles with
 * hundreds of dependency modules, such as the Crashlytics bundle.
 *
 * Use it after `@rollup/plugin-commonjs`, so CommonJS modules have already
 * been converted to ES modules.
 *
 * @param tsconfigPath - Path to the tsconfig to read the target from, relative
 * to the current working directory.
 */
export function transpileJs(tsconfigPath = 'tsconfig.json') {
  const configPath = resolve(tsconfigPath);
  const { config, error } = typescript.readConfigFile(
    configPath,
    typescript.sys.readFile
  );
  if (error) {
    throw new Error(
      typescript.flattenDiagnosticMessageText(error.messageText, '\n')
    );
  }
  const { options } = typescript.parseJsonConfigFileContent(
    config,
    typescript.sys,
    dirname(configPath)
  );
  const compilerOptions = {
    target: options.target,
    // Keep import and export statements for Rollup.
    module: typescript.ModuleKind.ESNext,
    importHelpers: true,
    sourceMap: true
  };

  return {
    name: 'transpile-js',
    transform(code, id) {
      // Skip virtual modules (ids starting with \0) and non-JavaScript files.
      if (id.startsWith('\0') || !id.endsWith('.js')) {
        return null;
      }
      const { outputText, sourceMapText } = typescript.transpileModule(code, {
        fileName: id,
        compilerOptions
      });
      return { code: outputText, map: sourceMapText };
    }
  };
}
