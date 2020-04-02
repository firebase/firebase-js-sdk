
const fs = require('fs');
const { execSync } = require('child_process');
const { projectRoot } = require('../release/utils/constants');

/**
 * Prepare the repo before releasing the exp packages and before generating documentation for the exp packages.
 * 
 * Rename packages-exp/ to package/, remove -exp from package names in package.json and source files,
 * so we can use the existing infrastructure to release the exp packages under the existing npm 
 * package names.
 */
const tmpFolder = 'tmp_exp';
const packagesExpDirName = 'packages-exp';
const packagesDirName = 'packages';

const packageInfo = JSON.parse(
    execSync('npx lerna ls --json --scope @firebase/*').toString()
);

// move the following packages into packages-exp folder
const packagesToKeep = [
    "@firebase/util",
    "@firebase/component",
    "@firebase/logger"
];

for (const packageName of packagesToKeep) {
    const package = packageInfo.find(p => p.name === packageName);

    if (!package) {
        throw Error(`couldn't find ${packageName}`);
    }

    const newLocation = `${projectRoot}/${packagesExpDirName}`;

    execSync(`mv ${package.location} ${newLocation}`);
}

// delete packages folder
execSync(`rm -rf ${projectRoot}/${packagesDirName}`);

// rename packages-exp to package

// remove -exp in all files. Hope it doesn't break anything