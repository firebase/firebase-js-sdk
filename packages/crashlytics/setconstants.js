/**
 * @license
 * Copyright 2025 Google LLC
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

const fs = require('node:fs');
const path = require('node:path');
const child_process = require('node:child_process');

// Ensure that the project is set up as expected.
const rootPath = path.resolve(
  process.cwd(),
  './node_modules/@firebase/crashlytics/dist'
);
if (!fs.existsSync(rootPath)) {
  console.error(
    `Error setting Firebase constants. Directory does not exist: ${rootPath}`
  );
  console.error(
    'Make sure you have run "npm install" or "yarn" in the root of the project.'
  );
  process.exit(1);
}

/** Logs a usage string to the console. */
function logUsageString() {
  console.log(`
Usage: node setconstants.js [options]

Options:
  --appVersion=<version>  Set the app version (e.g. 1.2.0). If not provided, the current git commit
                          hash will be used, or the version from package.json as the fallback.
  --verbose, -v           Enable verbose logging
  --help, -h              Show this help message
`);
}

let verbose = false;

// Collects constants to write to output files.
const CONSTANTS = {};

// Parse args
const args = process.argv.slice(2);
args.forEach(arg => {
  if (arg === '--verbose' || arg === '-v') {
    verbose = true;
    return;
  }
  if (arg === '--help' || arg === '-h') {
    logUsageString();
    process.exit(0);
  }
  if (arg.startsWith('--appVersion')) {
    const parts = arg.substring(2).split('=');
    const value =
      parts.length > 1
        ? parts.slice(1).join('=')?.replaceAll('"', '')
        : undefined;
    if (!value) {
      console.error('Error: --appVersion requires a value.');
      logUsageString();
      process.exit(1);
    }
    CONSTANTS.appVersion = value;
    return;
  }
  console.error(`Error: Unknown argument ${arg}`);
  logUsageString();
  process.exit(1);
});

// Set appVersion if not already set
if (CONSTANTS.appVersion) {
  verbose && console.log(`Using appVersion=${CONSTANTS.appVersion} from args`);
}
if (!CONSTANTS.appVersion) {
  verbose && console.log('Checking git commit hash...');
  try {
    CONSTANTS.appVersion = child_process
      .execSync('git rev-parse HEAD')
      .toString()
      .trim();
    verbose && console.log(`Using appVersion=${CONSTANTS.appVersion} from Git`);
  } catch (e) {
    verbose && console.error('Failed to execute git rev-parse');
  }
}
if (!CONSTANTS.appVersion) {
  verbose && console.log('Checking package.json...');
  try {
    CONSTANTS.appVersion = child_process
      .execSync('npm pkg get version')
      .toString()
      .trim()
      .replaceAll('"', '');
    verbose &&
      console.log(`Using appVersion=${CONSTANTS.appVersion} from package.json`);
  } catch (e) {
    verbose && console.error('Failed to execute npm pkg get version');
  }
}

function stringifyConstants() {
  return Object.entries(CONSTANTS)
    .map(([key, value]) => `\n  ${key}: '${value}'`)
    .join(',');
}

const jsFilePath = path.resolve(rootPath, 'auto-constants.js');
const mjsFilePath = path.resolve(rootPath, 'auto-constants.mjs');

// Update auto-constants.js
if (fs.existsSync(jsFilePath)) {
  const fileContent = `
'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const AUTO_CONSTANTS =  {${stringifyConstants()}
};

exports.AUTO_CONSTANTS = AUTO_CONSTANTS;
`;
  try {
    fs.writeFileSync(jsFilePath, fileContent, 'utf8');
    verbose && console.log(`Successfully updated ${jsFilePath}`);
  } catch (err) {
    verbose && console.error(`Error writing to ${jsFilePath}:`, err);
    process.exit(1);
  }
}

// Update auto-constants.mjs
if (fs.existsSync(mjsFilePath)) {
  const fileContent = `
const AUTO_CONSTANTS = {${stringifyConstants()}
};

export { AUTO_CONSTANTS };
`;
  try {
    fs.writeFileSync(mjsFilePath, fileContent, 'utf8');
    verbose && console.log(`Successfully updated ${mjsFilePath}`);
  } catch (err) {
    verbose && console.error(`Error writing to ${mjsFilePath}:`, err);
    process.exit(1);
  }
}
