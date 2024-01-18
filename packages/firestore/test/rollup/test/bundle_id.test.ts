import { expect } from 'chai';
import { execFileSync } from 'node:child_process';

// The path of the directory containing this file.
const bundleIdDir = `${__dirname}/../bundle_id`;

describe('bundle id in firestore bundles should match the expected', () => {
  before(() => {
    runNpmInstall(bundleIdDir);
    runNpmRollup(bundleIdDir);
  });

  it('node.js cjs scripts should use node cjs bundle', () => {
    verifyBundleId({
      jsScriptFile: `${bundleIdDir}/index.cjs`,
      expectedBundleId: 'fstrbid_node_cjs'
    });
  });

  it('node.js esm scripts should use node esm bundle', () => {
    verifyBundleId({
      jsScriptFile: `${bundleIdDir}/index.mjs`,
      expectedBundleId: 'fstrbid_node_esm'
    });
  });

  it('rollup browser cjs scripts should use browser cjs bundle', () => {
    verifyBundleId({
      jsScriptFile: `${bundleIdDir}/dist/index.browser.cjs`,
      expectedBundleId: 'fstrbid_browser_cjs'
    });
  });

  it('rollup browser esm scripts should use browser esm bundle', () => {
    verifyBundleId({
      jsScriptFile: `${bundleIdDir}/dist/index.browser.mjs`,
      expectedBundleId: 'fstrbid_browser_esm'
    });
  });

  it('rollup browser esm5 scripts should use browser esm5 bundle', () => {
    verifyBundleId({
      jsScriptFile: `${bundleIdDir}/dist/index.browser.esm5.mjs`,
      expectedBundleId: 'fstrbid_browser_esm5'
    });
  });

  it('rollup node cjs scripts should use node cjs bundle', () => {
    verifyBundleId({
      jsScriptFile: `${bundleIdDir}/dist/index.node.cjs`,
      expectedBundleId: 'fstrbid_node_cjs'
    });
  });

  it('rollup node esm scripts should use node esm bundle', () => {
    verifyBundleId({
      jsScriptFile: `${bundleIdDir}/dist/index.node.mjs`,
      expectedBundleId: 'fstrbid_node_esm'
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
