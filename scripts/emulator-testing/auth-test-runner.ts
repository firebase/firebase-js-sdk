import { spawn } from 'child-process-promise';
import * as path from 'path';

/** Wrapper for executing arbitrary scripts under Auth emulation */
const TEST_UNDER_EMULATION_COMMAND = [
  'firebase',
  'emulators:exec',
  '--project',
  'auth-emulator-test',
  '--only',
  'auth',
  'yarn test:integration:local'
];

async function run(): Promise<void> {
  const options = {
    cwd: path.resolve(__dirname, '../../packages-exp/auth-exp'),
    stdio: 'inherit' as const
  };
  
  const [command, ...params] = TEST_UNDER_EMULATION_COMMAND;
  await spawn(command, params, options);
}

run().catch(err => {
  console.error(err);
  process.exitCode = 1;
});