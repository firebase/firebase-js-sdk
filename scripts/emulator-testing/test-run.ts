import { spawn } from "child_process";
const port = 3628;

const child = spawn('/Users/mtewani/.cache/firebase-js-sdk/cli-v1.3.2', [
          "--logtostderr",
          'dev',
          `--listen=127.0.0.1:${port},[::1]:${port}`, "--config_dir='../../../packages/data-connect/test/integration/dataconnect'"
        ]);
        // Log the output from the child process
child.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
  });
  
  // Log any errors from the child process
  child.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
  });
  
  // Log when the child process exits
  child.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
  });