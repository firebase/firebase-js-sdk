const { spawn } = require('child-process-promise');
const ora = require('ora');
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
const Listr = require('listr');


async function publishExpPackages() {
    try {
        /**
         * Welcome to the firebase release CLI!
         */
        console.log('Welcome to the Firebase Exp Packages release CLI!');

        /**
         * build packages
         */
        await buildPackages();

        /**
         * run tests
         */
        await runTests();

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
        const { version, name } = await readPackageJson(path);
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

    const taskArray = await Promise.all(
        packagePaths.map(async pp => {
            const { version, name } = await readPackageJson(pp);
            return {
                title: `📦  ${name}@${version}`,
                task: () => publishPackage(pp)
            };
        })
    );

    const tasks = new Listr(taskArray, {
        concurrent: false,
        exitOnError: false,
    });

    console.log('\r\nPublishing Packages to NPM:');
    return tasks.run();
}

async function publishPackage(packagePath) {
    // TODO: remove --dry-run
    // const args = ['publish', '--access', 'public', '--dry-run', '--tag', 'exp'];
    const args = ['pack'];
    await spawn('npm', args, { cwd: packagePath });
}

async function resetWorkingTreeAndBumpVersions(packagePaths, versions) {
    await git.checkout('.');

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
        /**
         * Can't require here because it caches the file
         * in memory and it doesn't contain the updates that are made by e.g. git commands
         */
        const packageJson = await readPackageJson(path);

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

async function readPackageJson(packagePath) {
    /**
     * Can't require here because require caches the file
     * in memory and it may not contain the updates that are made by e.g. git commands
     */
    return JSON.parse(
        await readFile(`${packagePath}/package.json`, 'utf8')
    );
}

publishExpPackages();