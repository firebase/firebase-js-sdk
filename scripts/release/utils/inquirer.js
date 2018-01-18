const chalk = require('chalk');
const { inc, prerelease } = require('semver');
const { mapPackageNameToPkgJson } = require('./workspace');

function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

exports.packageVersionUpdate = async (package, isPrerelease) => {
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

exports.releaseType = {
  type: 'list',
  name: 'releaseType',
  message: 'Is this a staging, or a production release?',
  choices: [
    'Staging',
    'Production'
  ],
  default: 'Staging'
};

exports.validateVersions = versionMap => {
  let message = 'Are you sure these are the versions you want to publish?\r\n';
  Object.keys(versionMap)
    .map(name => ({ name, version: versionMap[name] }))
    .forEach(({ name, version }) => {
      message += `${name}@${version}\n`;
    });

  return {
    type: 'confirm',
    name: 'confirmVersions',
    message,
    default: false
  };
}
