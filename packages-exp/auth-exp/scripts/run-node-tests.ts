import { resolve } from 'path';

import { spawn } from 'child-process-promise';
import * as yargs from 'yargs';

const argv = yargs.options({
  local: {
    type: 'boolean'
  },
  integration: {
    type: 'boolean'
  }
}).argv;

const nyc = resolve(__dirname, '../../../node_modules/.bin/nyc');
const mocha = resolve(__dirname, '../../../node_modules/.bin/mocha');

process.env.TS_NODE_COMPILER_OPTIONS = '{"module":"commonjs"}';

let testConfig = ['src/!(platform_browser|platform_react_native|platform_cordova)/**/*.test.ts', '--file', 'index.node.ts'];

if (argv.integration) {
  testConfig = ['test/integration/flows/{email,anonymous}.test.ts'];
}

let args = [
  '--reporter',
  'lcovonly',
  mocha,
  ...testConfig,
  '--config',
  '../../config/mocharc.node.js'
];

if (argv.local) {
  process.env.AUTH_EMULATOR_PORT = '9099';
  process.env.AUTH_EMULATOR_PROJECT_ID = 'test-emulator';
}

args = args.concat(argv._ as string[]);

const childProcess = spawn(nyc, args, {
  stdio: 'inherit',
  cwd: process.cwd()
}).childProcess;

process.once('exit', () => childProcess.kill());
process.once('SIGINT', () => childProcess.kill('SIGINT'));
process.once('SIGTERM', () => childProcess.kill('SIGTERM'));