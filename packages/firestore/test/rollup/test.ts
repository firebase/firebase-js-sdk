import { expect } from 'chai';
import { execFileSync } from 'node:child_process';

// The path of the directory containing this file.
const bundleIdNodeDir = `${__dirname}/bundle_id_node`;

describe('Rollup Tests', () => {
  it('node.js commonjs scripts should use node.cjs bundle', () => {
    runNpmInstall(bundleIdNodeDir);
    const rollupBundleId = runNodeScriptAndReturnOutput(
      `${bundleIdNodeDir}/test.cjs`
    );
    expect(rollupBundleId).to.equal('node.cjs');
  });

  it('node.js esm scripts should use node.mjs bundle', () => {
    runNpmInstall(bundleIdNodeDir);
    const rollupBundleId = runNodeScriptAndReturnOutput(
      `${bundleIdNodeDir}/test.mjs`
    );
    expect(rollupBundleId).to.equal('node.mjs');
  });
});

function runNpmInstall(dir: string): void {
  console.log(`npm install starting in directory: ${dir}`);
  execFileSync('npm', ['install'], { cwd: dir, stdio: 'inherit' });
  console.log(`npm install completed in directory: ${dir}`);
}

function runNodeScriptAndReturnOutput(file: string): string {
  console.log(`node script starting: ${file}`);
  const output = execFileSync('node', [file], { encoding: 'utf8' });
  console.log(`node script completed: ${file}`);
  return output.trim();
}
