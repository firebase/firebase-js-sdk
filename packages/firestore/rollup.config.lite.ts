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

import path from 'path';

import type { Plugin, RollupOptions } from 'rollup';
import alias from '@rollup/plugin-alias';
import json from '@rollup/plugin-json';
import replace from 'rollup-plugin-replace';
import sourcemaps from 'rollup-plugin-sourcemaps';
import { terser } from 'rollup-plugin-terser';
import typescriptPlugin from 'rollup-plugin-typescript2';
import typescript from 'typescript';
import { generateBuildTargetReplaceConfig } from '../../scripts/build/rollup_replace_build_target';
import pkg from './lite/package.json';
import {
  resolveNodeExterns,
  manglePrivatePropertiesOptions,
  generateAliasConfig,
  removeAssertAndPrefixInternalTransformer,
  removeAssertTransformer,
  circularDependencyBreakingOnWarn, resolveBrowserExterns, es2017ToEs5Plugins
} from './rollup.shared';

function nodePlugins(): Plugin[] {
  return [
    typescriptPlugin({
      typescript,
      tsconfigOverride: {
        compilerOptions: {
          target: 'es2017'
        }
      },
      abortOnError: true,
      transformers: [removeAssertTransformer],
      verbosity: 2
    }),
    json({ preferConst: true })
  ];
}

function browserPlugins(): Plugin[] {
  return [
    typescriptPlugin({
      typescript,
      tsconfigOverride: {
        compilerOptions: {
          target: 'es2017'
        }
      },
      abortOnError: true,
      transformers: [removeAssertAndPrefixInternalTransformer],
      verbosity: 2
    }),
    json({ preferConst: true }),
    terser(manglePrivatePropertiesOptions)
  ];
}

const allBuilds: RollupOptions[] = [
  // Intermidiate Node ESM build without build target reporting
  // this is an intermidiate build used to generate the actual esm and cjs builds
  // which add build target reporting
  {
    input: './lite/index.ts',
    output: {
      file: path.resolve('./lite', pkg['main-esm']),
      format: 'es',
      sourcemap: true
    },
    plugins: [
      alias(generateAliasConfig('node_lite')),
      ...nodePlugins(),
      replace({
        '__RUNTIME_ENV__': 'node'
      })
    ],
    external: resolveNodeExterns,
    treeshake: {
      moduleSideEffects: false
    },
    onwarn: circularDependencyBreakingOnWarn
  },
  // Node CJS build
  {
    input: path.resolve('./lite', pkg['main-esm']),
    output: {
      file: path.resolve('./lite', pkg.main),
      format: 'cjs',
      sourcemap: true
    },
    plugins: [
      typescriptPlugin({
        typescript,
        include: ['dist/lite/*.js'],
        verbosity: 2
      }),
      json(),
      sourcemaps(),
      replace(generateBuildTargetReplaceConfig('cjs', 5))
    ],
    external: resolveNodeExterns,
    treeshake: {
      moduleSideEffects: false
    }
  },
  // Node ESM build
  {
    input: path.resolve('./lite', pkg['main-esm']),
    output: {
      file: path.resolve('./lite', pkg['main-esm']),
      format: 'es',
      sourcemap: true
    },
    plugins: [
      sourcemaps(),
      replace(generateBuildTargetReplaceConfig('esm', 2017))
    ],
    external: resolveNodeExterns,
    treeshake: {
      moduleSideEffects: false
    }
  },
  // Intermidiate browser build without build target reporting
  // this is an intermidiate build used to generate the actual esm and cjs builds
  // which add build target reporting
  {
    input: './lite/index.ts',
    output: {
      file: path.resolve('./lite', pkg.browser),
      format: 'es',
      sourcemap: true
    },
    plugins: [
      alias(generateAliasConfig('browser_lite')),
      ...browserPlugins(),
      // setting it to empty string because browser is the default env
      replace({
        '__RUNTIME_ENV__': ''
      })
    ],
    external: resolveBrowserExterns,
    treeshake: {
      moduleSideEffects: false
    }
  },
  // Convert es2017 build to ES5
  {
    input: path.resolve('./lite', pkg.browser),
    output: [
      {
        file: path.resolve('./lite', pkg.esm5),
        format: 'es',
        sourcemap: true
      }
    ],
    plugins: [
      ...es2017ToEs5Plugins(/* mangled= */ true),
      replace(generateBuildTargetReplaceConfig('esm', 5))
    ],
    external: resolveBrowserExterns,
    treeshake: {
      moduleSideEffects: false
    }
  },
  // Convert es2017 build to CJS
  {
    input: path.resolve('./lite', pkg.browser),
    output: [
      {
        file: './dist/lite/index.cjs.js',
        format: 'es',
        sourcemap: true
      }
    ],
    plugins: [
      sourcemaps(),
      replace(generateBuildTargetReplaceConfig('cjs', 2017))
    ],
    external: resolveBrowserExterns,
    treeshake: {
      moduleSideEffects: false
    }
  },
  // Browser es2017 build
  {
    input: path.resolve('./lite', pkg.browser),
    output: [
      {
        file: path.resolve('./lite', pkg.browser),
        format: 'es',
        sourcemap: true
      }
    ],
    plugins: [
      sourcemaps(),
      replace(generateBuildTargetReplaceConfig('esm', 2017))
    ],
    external: resolveBrowserExterns,
    treeshake: {
      moduleSideEffects: false
    }
  },
  // RN build
  {
    input: './lite/index.ts',
    output: {
      file: path.resolve('./lite', pkg['react-native']),
      format: 'es',
      sourcemap: true
    },
    plugins: [
      alias(generateAliasConfig('rn_lite')),
      ...browserPlugins(),
      replace({
        ...generateBuildTargetReplaceConfig('esm', 2017),
        '__RUNTIME_ENV__': 'rn'
      })
    ],
    external: resolveBrowserExterns,
    treeshake: {
      moduleSideEffects: false
    }
  }
];

export default function (command: Record<string, unknown>): RollupOptions[] {
  return allBuilds;
}
