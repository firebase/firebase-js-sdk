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

import type { Plugin, RollupOptions } from 'rollup';
import { version as grpcVersion } from '@grpc/grpc-js/package.json';
import alias from '@rollup/plugin-alias';
import json from '@rollup/plugin-json';
import dts from 'rollup-plugin-dts';
import replace from 'rollup-plugin-replace';
import { terser } from 'rollup-plugin-terser';
import typescriptPlugin from 'rollup-plugin-typescript2';
import typescript from 'typescript';
import { generateBuildTargetReplaceConfig } from '../../scripts/build/rollup_replace_build_target';
import pkg from './package.json';
import sourcemaps from 'rollup-plugin-sourcemaps';
import {
  resolveNodeExterns,
  manglePrivatePropertiesOptions,
  generateAliasConfig,
  removeAssertAndPrefixInternalTransformer,
  removeAssertTransformer,
  circularDependencyBreakingOnWarn,
  resolveBrowserExterns,
  es2017ToEs5Plugins
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
    json({ preferConst: true }),
    replace({
      '__GRPC_VERSION__': grpcVersion
    })
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
  // Intermediate Node ESM build without build target reporting
  // this is an intermediate build used to generate the actual esm and cjs builds
  // which add build target reporting
  {
    input: './src/index.node.ts',
    output: {
      file: pkg['main-esm'],
      format: 'es',
      sourcemap: true
    },
    plugins: [alias(generateAliasConfig('node')), ...nodePlugins()],
    external: resolveNodeExterns,
    treeshake: {
      moduleSideEffects: false
    },
    onwarn: circularDependencyBreakingOnWarn
  },
  // Node CJS build
  {
    input: pkg['main-esm'],
    output: {
      file: pkg.main,
      format: 'cjs',
      sourcemap: true
    },
    plugins: [
      ...es2017ToEs5Plugins(/* mangled= */ false),
      replace(generateBuildTargetReplaceConfig('cjs', 2017))
    ],
    external: resolveNodeExterns,
    treeshake: {
      moduleSideEffects: false
    }
  },
  // Node ESM build with build target reporting
  {
    input: pkg['main-esm'],
    output: {
      file: pkg['main-esm'],
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
  // Intermediate browser build without build target reporting
  // this is an intermediate build used to generate the actual esm and cjs builds
  // which add build target reporting
  {
    input: './src/index.ts',
    output: {
      file: pkg.browser,
      format: 'es',
      sourcemap: true
    },
    plugins: [alias(generateAliasConfig('browser')), ...browserPlugins()],
    external: resolveBrowserExterns,
    treeshake: {
      moduleSideEffects: false
    }
  },
  // Convert es2017 build to ES5
  {
    input: pkg['browser'],
    output: [
      {
        file: pkg['esm5'],
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
  // Convert es2017 build to cjs
  {
    input: pkg['browser'],
    output: [
      {
        file: './dist/index.cjs.js',
        format: 'cjs',
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
  // es2017 build with build target reporting
  {
    input: pkg['browser'],
    output: [
      {
        file: pkg['browser'],
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
    input: './src/index.rn.ts',
    output: {
      file: pkg['react-native'],
      format: 'es',
      sourcemap: true
    },
    plugins: [
      alias(generateAliasConfig('rn')),
      ...browserPlugins(),
      replace(generateBuildTargetReplaceConfig('esm', 2017))
    ],
    external: resolveBrowserExterns,
    treeshake: {
      moduleSideEffects: false
    }
  },
  {
    input: 'dist/firestore/src/index.d.ts',
    output: {
      file: 'dist/firestore/src/global_index.d.ts',
      format: 'es'
    },
    plugins: [
      dts({
        respectExternal: true
      })
    ]
  }
];

export default function (command: Record<string, unknown>): RollupOptions[] {
  console.log(`zzyzx COMMAND: ${JSON.stringify(command)}`);
  return allBuilds;
}
