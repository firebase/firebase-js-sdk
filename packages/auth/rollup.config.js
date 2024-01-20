/**
 * @license
 * Copyright 2019 Google LLC
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

import strip from '@rollup/plugin-strip';
import typescriptPlugin from 'rollup-plugin-typescript2';
import json from '@rollup/plugin-json';
import replace from 'rollup-plugin-replace';
import typescript from 'typescript';
import alias from '@rollup/plugin-alias';
import { generateBuildTargetReplaceConfig } from '../../scripts/build/rollup_replace_build_target';
import { emitModulePackageFile } from '../../scripts/build/rollup_emit_module_package_file';
import pkg from './package.json';

const deps = Object.keys(
  Object.assign({}, pkg.peerDependencies, pkg.dependencies)
);

/**
 * Node has the same entry point as browser, but browser-specific exports
 * are turned into either no-ops or errors. See src/platform_node/index.ts for
 * more info. This regex tests explicitly ./src/platform_browser so that the
 * only impacted file is the main index.ts
 */
const nodeAliasPlugin = alias({
  entries: [
    {
      find: /^\.\/src\/platform_browser(\/.*)?$/,
      replacement: `./src/platform_node`
    }
  ]
});

const es5BuildPlugins = [
  json(),
  strip({
    functions: ['debugAssert.*']
  }),
  typescriptPlugin({
    typescript
  })
];

const es2017BuildPlugins = [
  json(),
  strip({
    functions: ['debugAssert.*']
  }),
  typescriptPlugin({
    typescript,
    tsconfigOverride: {
      compilerOptions: {
        target: 'es2017'
      }
    }
  })
];

const browserBuilds = [
  {
    input: {
      index: 'index.ts',
      internal: 'internal/index.ts'
    },
    output: [{ dir: 'dist/esm5', format: 'es', sourcemap: true }],
    plugins: [
      ...es5BuildPlugins,
      replace(generateBuildTargetReplaceConfig('esm', 5))
    ],
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`))
  },
  {
    input: {
      index: 'index.ts',
      internal: 'internal/index.ts'
    },
    output: {
      dir: 'dist/esm2017',
      format: 'es',
      sourcemap: true
    },
    plugins: [
      ...es2017BuildPlugins,
      replace(generateBuildTargetReplaceConfig('esm', 2017))
    ],
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`))
  },
  {
    input: {
      index: 'index.ts',
      internal: 'internal/index.ts'
    },
    output: [{ dir: 'dist/browser-cjs', format: 'cjs', sourcemap: true }],
    plugins: [
      ...es2017BuildPlugins,
      replace(generateBuildTargetReplaceConfig('cjs', 2017))
    ],
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`))
  }
];

const browserExtensionBuilds = [
  {
    input: {
      index: 'index.extension.ts',
      internal: 'internal/index.ts'
    },
    output: [{ dir: 'dist/extension-esm5', format: 'es', sourcemap: true }],
    plugins: [
      ...es5BuildPlugins,
      replace(generateBuildTargetReplaceConfig('esm', 5))
    ],
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`))
  },
  {
    input: {
      index: 'index.extension.ts',
      internal: 'internal/index.ts'
    },
    output: {
      dir: 'dist/extension-esm2017',
      format: 'es',
      sourcemap: true
    },
    plugins: [
      ...es2017BuildPlugins,
      replace(generateBuildTargetReplaceConfig('esm', 2017))
    ],
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`))
  },
  {
    input: {
      index: 'index.extension.ts',
      internal: 'internal/index.ts'
    },
    output: [{ dir: 'dist/extension-cjs', format: 'cjs', sourcemap: true }],
    plugins: [
      ...es2017BuildPlugins,
      replace(generateBuildTargetReplaceConfig('cjs', 2017))
    ],
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`))
  }
];

const nodeBuilds = [
  {
    input: {
      index: 'index.node.ts',
      internal: 'internal/index.ts'
    },
    output: [{ dir: 'dist/node', format: 'cjs', sourcemap: true }],
    plugins: [
      nodeAliasPlugin,
      ...es5BuildPlugins,
      replace(generateBuildTargetReplaceConfig('cjs', 5))
    ],
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`))
  },
  {
    input: {
      index: 'index.node.ts',
      internal: 'internal/index.ts'
    },
    output: [{ dir: 'dist/node-esm', format: 'es', sourcemap: true }],
    plugins: [
      nodeAliasPlugin,
      ...es2017BuildPlugins,
      replace(generateBuildTargetReplaceConfig('esm', 2017)),
      emitModulePackageFile()
    ],
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`))
  }
];

const cordovaBuild = {
  input: {
    index: 'index.cordova.ts',
    internal: 'internal/index.ts'
  },
  output: [{ dir: 'dist/cordova', format: 'es', sourcemap: true }],
  plugins: [
    ...es5BuildPlugins,
    replace(generateBuildTargetReplaceConfig('esm', 5))
  ],
  external: id =>
    [...deps, 'cordova'].some(dep => id === dep || id.startsWith(`${dep}/`))
};

const rnBuild = {
  input: {
    index: 'index.rn.ts',
    internal: 'internal/index.ts'
  },
  output: [{ dir: 'dist/rn', format: 'cjs', sourcemap: true }],
  plugins: [
    ...es5BuildPlugins,
    replace(generateBuildTargetReplaceConfig('cjs', 5))
  ],
  external: id =>
    [...deps, 'react-native'].some(
      dep => id === dep || id.startsWith(`${dep}/`)
    )
};

const webWorkerBuild = {
  input: 'index.webworker.ts',
  output: [{ file: pkg.webworker, format: 'es', sourcemap: true }],
  plugins: [
    json(),
    strip({
      functions: ['debugAssert.*']
    }),
    typescriptPlugin({
      typescript,
      compilerOptions: {
        lib: [
          // Remove dom after we figure out why navigator stuff doesn't exist
          'dom',
          'es2015',
          'webworker'
        ]
      }
    }),
    replace(generateBuildTargetReplaceConfig('esm', 5))
  ],
  external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`))
};

export default [
  ...browserBuilds,
  ...browserExtensionBuilds,
  ...nodeBuilds,
  cordovaBuild,
  rnBuild,
  webWorkerBuild,
];
