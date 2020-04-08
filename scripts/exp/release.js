const { exec } = require('child-process-promise');
const { createPromptModule } = require('inquirer');
const prompt = createPromptModule();
const { publishToNpm } = require('./utils/npm');
const { bannerText } = require('./utils/banner');
const { argv } = require('yargs');
const { projectRoot } = require('../utils');
const { mapWorkspaceToPackages } = require('../release/utils/workspace');
const { inc } = require('semver');
const { writeFileSync } = require('fs');


async function publishExpPackages() {
    try {
        /**
         * Welcome to the firebase release CLI!
         */
        await bannerText();


        /**
         * Update the package.json dependencies throughout the SDK
         */
        await updatePackageNamesAndVersions();

        return;

        /**
         * build packages
         */
        await buildPackages();

        /**
         * run tests
         */

        /**
         * Release new versions to NPM
         */
        await publishToNpm(
            updates,
            releaseType,
            argv.canary ? 'canary' : 'default'
        );

        /**
         * reset the working tree and increase patch version of all exp packages
         */
        if (releaseType !== 'Production') {
            await resetWorkingTree();
        }

        /**
         * push to master
         */

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

async function updatePackageNamesAndVersions() {
    const packagePaths = await mapWorkspaceToPackages([
        `${projectRoot}/packages-exp/*`
    ]);

    // get package name -> next version mapping
    const versions = new Map();
    for (const path of packagePaths) {
        const packageJsonPath = `${path}/package.json`;
        const { version, name } = require(packageJsonPath);
        // increase the patch version of all exp packages
        const nextVersion = inc(version, 'patch');
        versions.set(name, nextVersion);
    }

    for (const path of packagePaths) {
        const packageJsonPath = `${path}/package.json`;
        const packageJson = require(packageJsonPath);

        const nextVersion = versions.get(packageJson.name);

        // update version
        packageJson.version = nextVersion;

        // remove -exp in the package name
        packageJson.name = removeExpInPackageName(packageJson.name);

        // set private to false
        packageJson.private = false;

        // update dep version and remove -exp in dep names
        // don't care about devDependencies because they are irrelavant when using the package
        const dependencies = pacakgeJson.dependencies;
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

        // update package.json files
        writeFileSync(packageJsonPath, pacakgeJson);
    }
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