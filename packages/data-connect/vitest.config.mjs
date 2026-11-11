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

import path from 'path';
import { fileURLToPath } from 'url';
import ts from 'typescript';
import createBaseConfig from '../../config/vitest.base.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcIndex = path.resolve(__dirname, 'src/index.ts');
const srcNodeIndex = path.resolve(__dirname, 'src/index.node.ts');

function resolveNodeEntryPlugin() {
  return {
    name: 'resolve-node-entry',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      const resolved = await this.resolve(source, importer, {
        ...options,
        skipSelf: true
      });
      if (resolved?.id === srcIndex) {
        return srcNodeIndex;
      }
      return null;
    }
  };
}

function stripTypeExportsPlugin() {
  let program;
  const enableSourceMap =
    Boolean(process.env.FIREBASE_CI_TEST_START_TIME) ||
    process.env.COVERAGE === 'true' ||
    process.argv.some(arg => arg.startsWith('--coverage'));
  return {
    name: 'strip-type-exports',
    enforce: 'pre',
    watchChange() {
      program = null;
    },
    transform(code, id) {
      const cleanId = id.split('?')[0];
      if (!cleanId.endsWith('.ts') || !code.includes('export {')) {
        return null;
      }
      if (!program) {
        const configPath = path.resolve(__dirname, 'tsconfig.json');
        const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
        const parsedConfig = ts.parseJsonConfigFileContent(
          configFile.config,
          ts.sys,
          __dirname
        );
        program = ts.createProgram(parsedConfig.fileNames, {
          ...parsedConfig.options,
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ESNext,
          sourceMap: enableSourceMap,
          inlineSources: enableSourceMap,
          inlineSourceMap: false
        });
      }
      const sf = program.getSourceFile(cleanId);
      if (!sf) {
        return null;
      }
      let emittedCode = null;
      let emittedMap = null;
      program.emit(sf, (fileName, data) => {
        if (fileName.endsWith('.js')) {
          emittedCode = data;
        } else if (fileName.endsWith('.js.map')) {
          emittedMap = data;
        }
      });
      if (emittedCode !== null) {
        return { code: emittedCode, map: emittedMap };
      }
      return null;
    }
  };
}

const config = createBaseConfig(import.meta.url);

if (config.test?.projects) {
  for (const project of config.test.projects) {
    if (project.test.name === 'node') {
      project.plugins = [...(project.plugins || []), resolveNodeEntryPlugin()];
    } else if (project.test.name === 'browser') {
      if (project.test.browser) {
        project.test.browser.screenshotFailures = false;
      }
      project.plugins = [...(project.plugins || []), stripTypeExportsPlugin()];
      project.define = {
        ...(project.define || {}),
        'process.env.DC_EMULATOR_PORT': JSON.stringify(
          process.env.DC_EMULATOR_PORT ?? ''
        )
      };
    }
  }
}

export default config;
