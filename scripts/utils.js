const { dirname, resolve } = require('path');
const simpleGit = require('simple-git/promise');
const { exec } = require('child-process-promise');

const projectRoot = dirname(resolve(__dirname, '../package.json'));
exports.projectRoot = projectRoot;

async function getChangedFiles() {
    console.log(projectRoot);
    const git = simpleGit(projectRoot);
    const diff = await git.diff(['--name-only', 'origin/master...HEAD']);
    const changedFiles = diff.split('\n');

    return changedFiles;
}
exports.getChangedFiles = getChangedFiles;

async function getChangedPackages() {
    const changedPackages = new Set();
    for (const filename of await getChangedFiles()) {
        // Check for changed files inside package dirs.
        const match = filename.match('^(packages(-exp)?/[a-zA-Z0-9-]+)/.*');
        if (match && match[1]) {
            const changedPackage = require(resolve(projectRoot, match[1], 'package.json'));
            changedPackages.add(changedPackage.name);
        }
    }
    return Array.from(changedPackages.values());
}
exports.getChangedPackages = getChangedPackages;

exports.getPackageInfo = async function ({ includePrivate } = { includePrivate: true }) {
    const packageInfo = JSON.parse(
        (await exec(`npx lerna ls ${includePrivate ? '-la': ''} --json`)).stdout
    );

    return packageInfo;
}