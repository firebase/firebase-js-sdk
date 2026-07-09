import { exec } from 'child-process-promise';
import { projectRoot as root } from '../utils';

async function pushReleaseTagsToGithub() {
  // Get tags pointing to HEAD
  // When running the release script, these tags should be release tags created by changeset
  const { stdout: rawTags } = await exec(`git tag --points-at HEAD`);

  const tags = rawTags.split(/\r?\n/);

  let { stdout: currentBranch } = await exec(`git rev-parse --abbrev-ref HEAD`);
  currentBranch = currentBranch.trim();

  await exec(
    `git -c http.extraHeader="Authorization: Bearer ${process.env.GITHUB_TOKEN}"` +
      ` push origin ${currentBranch} ${tags.join(' ')} --no-verify`,
    {
      cwd: root
    }
  );
}

pushReleaseTagsToGithub();
