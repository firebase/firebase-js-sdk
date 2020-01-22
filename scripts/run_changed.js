const { resolve } = require('path');
const { spawn } = require('child-process-promise');
const simpleGit = require('simple-git/promise');
const root = resolve(__dirname, '..');
const git = simpleGit(root);

async function runTestsOnChangedPackages() {
  try {
    const diff = await git.diff(['--name-only', 'origin/master...HEAD']);
    const changedFiles = diff.split('\n');
    const changedPackages = {};
    for (const filename of changedFiles) {
      console.log(filename);
      if (filename.match('^packages\/')) {
        console.log(filename);
      }
    }
  
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}

runTestsOnChangedPackages();