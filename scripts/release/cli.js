const { createPromptModule } = require('inquirer');
const prompt = createPromptModule();
const { hasUpdatedPackages } = require('./utils/lerna');
const { getOrderedUpdates, mapPackageNameToPkgJson, updateWorkspaceVersions } = require('./utils/workspace');
const { inc, prerelease } = require('semver');
const { commitAndTag } = require('./utils/git');
const chalk = require('chalk');

const releaseType = {
  type: 'list',
  name: 'releaseType',
  message: 'Is this a staging, or a production release?',
  choices: [
    'Staging',
    'Production'
  ],
  default: 'Staging'
};

function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

async function packageVersionUpdate(package, isPrerelease) {
  /**
   * Get the current package version
   */
  const { version } = await mapPackageNameToPkgJson(package);

  /**
   * If the current version is a prerelease allow the developer to
   * bump the prerelease version
   */
  let prereleaseVersions = ['prepatch', 'preminor', 'premajor'];
  if (prerelease(version)) {
    prereleaseVersions = [
      'prerelease',
      ...prereleaseVersions
    ]
  }

  /**
   * Determine which set of increments we will be using
   */
  const increments = isPrerelease ? 
    prereleaseVersions :
    ['patch', 'minor', 'major'];

  /**
   * Create prompts
   */
  return {
    type: 'list',
    name: `${package}`,
    message: `Select semver increment for ${package}`,
    choices: increments.map(increment => { 
      const newVersion = inc(version, increment);
      return { 
        name: chalk`${capitalize(increment)} {gray ${newVersion}}`, 
        value: newVersion
      };
    }),
  };
}

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
    updateWorkspaceVersions(versions);

    /** 
     * Commit and tag the version updates
     */
    commitAndTag(versions, isPrerelease);

  } catch(err) {
    console.error(err);
    process.exit(1);
  }
})();
