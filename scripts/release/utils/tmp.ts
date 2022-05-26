import { exec } from 'child-process-promise';

async function main() {
  const { stdout: version } = await exec('npm info firebase version');
  console.log('-' + version.trim() + '-');
}

main();