const { createPromptModule } = require('inquirer');
const prompt = createPromptModule();
const { hasUpdatedPackages } = require('./utils/lerna');
const { getOrderedUpdates, updateWorkspaceVersions } = require('./utils/workspace');
const { commitAndTag, pushUpdatesToGithub, cleanTree, resetWorkingTree } = require('./utils/git');
const { releaseType, packageVersionUpdate } = require('./utils/inquirer');
const { reinstallDeps } = require('./utils/yarn');
const { runTests } = require('./utils/tests');

(async () => {
  try {
    /**
     * If there are no packages that have been updated
     * skip the release cycle
     */
    if (!await hasUpdatedPackages()) return;

    /**
     * Prompt for the release type (i.e. staging/prod)
     */
    const responses = await prompt([
      releaseType
    ]);
    const isPrerelease = responses.releaseType === 'Staging';

    /**
     * Prompt user for the new versions
     */
    const updates = await getOrderedUpdates();
    const versionUpdates = await Promise.all(updates.map(pkg => packageVersionUpdate(pkg, isPrerelease)));
    const versions = await prompt(versionUpdates);

    /**
     * Update the package.json dependencies throughout the SDK
     */
    await updateWorkspaceVersions(versions);

    /**
     * Clean install dependencies
     */
    await cleanTree();
    await reinstallDeps();

    /**
     * Ensure all tests are passing
     */
    await runTests();

    /** 
     * Commit and tag the version updates
     */
    await commitAndTag(versions, isPrerelease);
    

  } catch(err) {
    console.error(err);
    await resetWorkingTree();
    process.exit(1);
  }
})();
