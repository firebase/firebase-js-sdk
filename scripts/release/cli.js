const { createPromptModule } = require('inquirer');
const prompt = createPromptModule();
const { hasUpdatedPackages } = require('./utils/lerna');
const { getOrderedUpdates, updateWorkspaceVersions } = require('./utils/workspace');
const { commitAndTag, pushUpdatesToGithub, cleanTree } = require('./utils/git');
const { releaseType, packageVersionUpdate } = require('./utils/inquirer');

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
     * Commit and tag the version updates
     */
    await commitAndTag(versions, isPrerelease);

    /**
     * Clean install dependencies
     */
    await cleanTree();
    

  } catch(err) {
    console.error(err);
    process.exit(1);
  }
})();
