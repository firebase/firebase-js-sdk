/**
 * generate API reports in changed packages
 */

const {
  getChangedPackages,
  getPackageInfo,
  projectRoot
} = require('../../scripts/utils');
const { execSync } = require('child_process');
const ora = require('ora');
const simpleGit = require('simple-git/promise');

const git = simpleGit(projectRoot);

async function doApiReports() {
  const changedPackages = await getChangedPackages();
  const packageInfo = await getPackageInfo();
  const packageLocations = [];
  for (const packageName of changedPackages) {
    const packageDesc = packageInfo.find(info => info.name === packageName);
    if (packageDesc) {
      const packageJson = require(`${packageDesc.location}/package.json`);

      if (packageJson && packageJson.scripts['api-report']) {
        const apiReportSpinner = ora(
          ` Creating API report for ${packageName}`
        ).start();
        packageLocations.push(packageDesc.location);
        execSync(`yarn api-report`, { cwd: packageDesc.location });
        apiReportSpinner.stopAndPersist({
          symbol: '✅'
        });
      }
    }
  }

  const hasDiff = await git.diff();

  if (!hasDiff) return;

  const gitSpinner = ora(' Creating automated API reports commit').start();
  await git.add('.');

  await git.commit('[AUTOMATED]: API Reports');
  gitSpinner.stopAndPersist({
    symbol: '✅'
  });
}

exports.doApiReports = doApiReports;
