import { expect } from 'chai';
import { execFileSync } from 'node:child_process';

// The path of the directory containing this file.
const bundleIdDir = `${__dirname}/bundle_id`;

describe('Rollup Tests', () => {
  before(() => {
    runNpmInstall(bundleIdDir);
    runNpmRollup(bundleIdDir);
  });

  it('node.js commonjs scripts should use node.cjs bundle', () => {
    verifyBundleId({
      jsScriptFile: `${bundleIdDir}/index.cjs`,
      expectedBundleId: 'fstrbid_node_cjs'
    });
  });

  it('node.js esm scripts should use node.mjs bundle', () => {
    verifyBundleId({
      jsScriptFile: `${bundleIdDir}/index.mjs`,
      expectedBundleId: 'fstrbid_node_esm'
    });
  });

  it('browser esm scripts should use browser.mjs bundle', () => {
    verifyBundleId({
      jsScriptFile: `${bundleIdDir}/dist/index.browser.mjs`,
      expectedBundleId: 'fstrbid_browser_esm'
    });
  });

  it('browser commonjs scripts should use browser.cjs bundle', () => {
    verifyBundleId({
      jsScriptFile: `${bundleIdDir}/dist/index.browser.cjs`,
      expectedBundleId: 'fstrbid_browser_cjs'
    });
  });
});

function verifyBundleId(args: {
  jsScriptFile: string;
  expectedBundleId: string;
}): void {
  const rollupBundleId = runNodeScriptAndReturnOutput(args.jsScriptFile);
  expect(rollupBundleId).to.equal(args.expectedBundleId);
}

function runNpmInstall(dir: string): void {
  console.log(`npm install starting in directory: ${dir}`);
  execFileSync('npm', ['install'], { cwd: dir, stdio: 'inherit' });
  console.log(`npm install completed in directory: ${dir}`);
}

function runNpmRollup(dir: string): void {
  console.log(`npm run rollup starting in directory: ${dir}`);
  execFileSync('npm', ['run', 'rollup'], { cwd: dir, stdio: 'inherit' });
  console.log(`npm run rollup completed in directory: ${dir}`);
}

function runNodeScriptAndReturnOutput(file: string): string {
  console.log(`node script starting: ${file}`);
  const output = execFileSync('node', [file], { encoding: 'utf8' });
  console.log(`node script completed: ${file}`);
  return output.trim();
}
