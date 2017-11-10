const { spawn } = require('child-process-promise');
const fs = require('mz/fs');

async function getStdout(process) {
  const { childProcess } = process;
  let stdout = '';
  
  childProcess.stdout.on('data', data => {
    stdout += data.toString();
  });
  
  await process;
  return stdout.trim();
}

async function bumpVersion() {
  const npmbin = await getStdout(spawn('npm', ['bin']));
  return spawn(`${npmbin}/lerna`, [
    'publish', '--skip-npm',
    '--scope', '@firebase/*',
    '--scope', 'firebase',
  ]);
}

async function rebuildSdk() {
  await spawn('git', ['clean', '-xdf']);
  await spawn('yarn');
}

(async function main() {
  await bumpVersion();
  await rebuildSdk();
})();
