const { argv } = require('yargs');
const path = require('path');
const { spawn } = require('child-process-promise');

(async () => {
  const myPath = argv._[0] || '.'; // default to the current directory
  const dir = path.resolve(myPath);
  const { name } = require(`${dir}/package.json`);

  let stdio = '';
  let stderr = '';
  try {
    const testProcess = spawn('yarn', ['--cwd', dir, 'test']);

    testProcess.childProcess.stdout.on('data', data => {
      stdio += data.toString();
    });
    testProcess.childProcess.stderr.on('data', data => {
      stderr += data.toString();
    });

    await testProcess;
    console.log('Success: ' + name);
  } catch (e) {
    console.error('Failure: ' + name);
    console.log(stdio);
    console.error(stderr);
    process.exit(1);
  }
})();
