const { exec, spawn } = require('child-process-promise');
const ora = require('ora');
const { createPromptModule } = require('inquirer');
const prompt = createPromptModule();
const { argv } = require('yargs');
const { projectRoot } = require('../utils');
const simpleGit = require('simple-git/promise');
const git = simpleGit(projectRoot);
const { mapWorkspaceToPackages } = require('../release/utils/workspace');
const { inc } = require('semver');
const {
    readFile: _readFile,
    writeFile: _writeFile
} = require('fs');
const { promisify } = require('util');
const readFile = promisify(_readFile);
const writeFile = promisify(_writeFile);
const chalk = require('chalk');


async function publishExpPackages() {
    try {
        /**
         * Welcome to the firebase release CLI!
         */
        console.log('Welcome to the Firebase Exp Packages release CLI!');

        /**
         * build packages
         */
        // await buildPackages();

        // /**
        //  * run tests
        //  */
        // await runTests();

        // path to exp packages
        const packagePaths = await mapWorkspaceToPackages([
            `${projectRoot}/packages-exp/*`
        ]);
        /**
         * Update the package.json dependencies throughout the SDK
         */
        const versions = await updatePackageNamesAndVersions(packagePaths);

        /**
         * Release packages to NPM
         */
        await publishToNpm(packagePaths);

        /**
         * reset the working tree and increase patch version of all exp packages
         */
        await resetWorkingTreeAndBumpVersions(packagePaths, versions);

        /**
         * push to master
         */
        commitAndPush();

    } catch (err) {
        /**
         * Log any errors that happened during the process
         */
        console.error(err);

        /**
         * Reset the working tree (will remove unneeded changes if they weren't
         * committed already)
         */
        await resetWorkingTree();

        /**
         * Exit with an error code
         */
        process.exit(1);
    }
}

async function buildPackages() {
    const spinner = ora(' Building Packages').start();
    await spawn('yarn', ['build:exp'], {
        cwd: projectRoot
    });
    spinner.stopAndPersist({
        symbol: '✅'
    });
}

async function runTests() {
    await spawn('yarn', ['test:exp'], {
        cwd: projectRoot,
        stdio: 'inherit'
    });
}

async function updatePackageNamesAndVersions(packagePaths) {

    // get package name -> next version mapping
    const versions = new Map();
    for (const path of packagePaths) {
        const packageJsonPath = `${path}/package.json`;
        const { version, name } = require(packageJsonPath);
        // increase the patch version of all exp packages
        const nextVersion = inc(version, 'patch');
        versions.set(name, nextVersion);
    }

    await updatePackageJsons(packagePaths, versions, {
        removeExpInName: true,
        updateVersions: true,
        makePublic: true
    });

    return versions;
}

async function publishToNpm(packagePaths) {
    const args = ['publish', '--access', 'public', '--dry-run', '--tag', 'exp'];
    for (const pp of packagePaths) {
        const { version, name } = require(`${pp}/package.json`);
        console.log(`Publishing ${name}@${version}`);
        // spawn('npm', args, { cwd: pp });
    }
}

async function resetWorkingTreeAndBumpVersions(packagePaths, versions) {
    // await git.checkout('.');
    await exec('git checkout .', {
        cwd: projectRoot
    });

    await updatePackageJsons(packagePaths, versions, {
        removeExpInName: false,
        updateVersions: true,
        makePublic: false
    });
}

async function updatePackageJsons(
    packagePaths,
    versions,
    {
        removeExpInName,
        updateVersions,
        makePublic
    }
) {
    for (const path of packagePaths) {
        const packageJsonPath = `${path}/package.json`;
        const packageJson = require(packageJsonPath);
      //  console.log(packageJson);
        // update version
        if (updateVersions) {
            const nextVersion = versions.get(packageJson.name);
            console.log(chalk`Updating {blue ${packageJson.name}} from {green ${packageJson.version}} to {green ${nextVersion}}`);
            packageJson.version = nextVersion;
        }

        // remove -exp in the package name
        if (removeExpInName) {
            const cleanName = removeExpInPackageName(packageJson.name)
            console.log(chalk`Renaming {blue ${packageJson.name}} to {blue ${cleanName}}`);
            packageJson.name = cleanName;

            // update dep version and remove -exp in dep names
            // don't care about devDependencies because they are irrelavant when using the package
            const dependencies = packageJson.dependencies || {};
            const newDependenciesObj = {};
            for (const d of Object.keys(dependencies)) {
                const dNextVersion = versions.get(d);
                const nameWithoutExp = removeExpInPackageName(d);
                if (!dNextVersion) {
                    newDependenciesObj[nameWithoutExp] = dependencies[d];
                } else {
                    newDependenciesObj[nameWithoutExp] = dNextVersion;
                }
            }
            packageJson.dependencies = newDependenciesObj;
        }

        // set private to false
        if (makePublic) {
            packageJson.private = false;
        }

        // update package.json files
        await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}`, { encoding: 'utf-8' });
    }
}

async function commitAndPush() {

}


function removeExpInPackageName(name) {
    const regex = /^(@firebase.*)-exp(.*)$/g;

    const captures = regex.exec(name);
    if (!captures) {
        return name;
    }

    return `${captures[1]}${captures[2]}`;
}

publishExpPackages();