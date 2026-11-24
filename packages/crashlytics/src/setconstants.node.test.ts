/**
 * @license
 * Copyright 2026 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';

describe('setconstants.js', () => {
  const originalScriptPath = path.resolve(__dirname, '../setconstants.js');
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'crashlytics-setconstants-test-')
    );
  });

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('updates auto-constants in hoisted dist relative to script __dirname', () => {
    const hoistedPkgDir = path.join(
      tmpDir,
      'hoisted/node_modules/@firebase/crashlytics'
    );
    const distDir = path.join(hoistedPkgDir, 'dist');
    fs.mkdirSync(distDir, { recursive: true });

    const copiedScriptPath = path.join(hoistedPkgDir, 'setconstants.js');
    fs.copyFileSync(originalScriptPath, copiedScriptPath);

    fs.writeFileSync(
      path.join(distDir, 'auto-constants.js'),
      "'use strict';\nexports.AUTO_CONSTANTS = {};\n",
      'utf8'
    );
    fs.writeFileSync(
      path.join(distDir, 'auto-constants.mjs'),
      'export const AUTO_CONSTANTS = {};\n',
      'utf8'
    );

    const workspaceDir = path.join(tmpDir, 'apps/web');
    fs.mkdirSync(workspaceDir, { recursive: true });

    execFileSync(process.execPath, [copiedScriptPath, '--appVersion=2.5.0'], {
      cwd: workspaceDir,
      encoding: 'utf8'
    });

    const jsContent = fs.readFileSync(
      path.join(distDir, 'auto-constants.js'),
      'utf8'
    );
    const mjsContent = fs.readFileSync(
      path.join(distDir, 'auto-constants.mjs'),
      'utf8'
    );

    expect(jsContent).toContain("appVersion: '2.5.0'");
    expect(mjsContent).toContain("appVersion: '2.5.0'");
  });

  it('prints crashlytics-setconstants usage on --help', () => {
    const output = execFileSync(
      process.execPath,
      [originalScriptPath, '--help'],
      {
        encoding: 'utf8'
      }
    );

    expect(output).toContain('Usage: crashlytics-setconstants [options]');
    expect(output).toContain('--appVersion=<version>');
  });

  it('fails with an informative error if dist directory cannot be found', () => {
    const emptyPkgDir = path.join(tmpDir, 'no-dist');
    fs.mkdirSync(emptyPkgDir, { recursive: true });

    const copiedScriptPath = path.join(emptyPkgDir, 'setconstants.js');
    fs.copyFileSync(originalScriptPath, copiedScriptPath);

    try {
      execFileSync(process.execPath, [copiedScriptPath], {
        cwd: emptyPkgDir,
        stdio: 'pipe'
      });
      expect.fail('Expected execFileSync to throw');
    } catch (err: unknown) {
      const errorWithStderr = err as { stderr?: Buffer };
      const stderr = errorWithStderr.stderr?.toString() ?? '';
      expect(stderr).toContain(
        'Error setting Firebase constants. Directory does not exist:'
      );
    }
  });

  describe('bundler cache warnings', () => {
    let copiedScriptPath: string;

    beforeEach(() => {
      const pkgDir = path.join(tmpDir, 'pkg');
      const distDir = path.join(pkgDir, 'dist');
      fs.mkdirSync(distDir, { recursive: true });
      copiedScriptPath = path.join(pkgDir, 'setconstants.js');
      fs.copyFileSync(originalScriptPath, copiedScriptPath);
      fs.writeFileSync(
        path.join(distDir, 'auto-constants.js'),
        "'use strict';\nexports.AUTO_CONSTANTS = {};\n",
        'utf8'
      );
    });

    it('warns about bundler caches when run in a Next.js workspace', () => {
      const nextWorkspace = path.join(tmpDir, 'next-app');
      fs.mkdirSync(path.join(nextWorkspace, '.next'), { recursive: true });
      const child = spawnSync(
        process.execPath,
        [copiedScriptPath, '--appVersion=1.0.0'],
        { cwd: nextWorkspace, encoding: 'utf8' }
      );
      expect(child.status).toBe(0);
      expect(child.stderr).toContain('Next.js webpack (.next/cache) ignores');
      expect(child.stderr).toContain('NEXT_PUBLIC_CRASHLYTICS_APP_VERSION');
    });

    it('warns about bundler caches when run in a Vite workspace', () => {
      const viteWorkspace = path.join(tmpDir, 'vite-app');
      fs.mkdirSync(path.join(viteWorkspace, 'node_modules/.vite'), {
        recursive: true
      });
      const child = spawnSync(
        process.execPath,
        [copiedScriptPath, '--appVersion=1.0.0'],
        { cwd: viteWorkspace, encoding: 'utf8' }
      );
      expect(child.status).toBe(0);
      expect(child.stderr).toContain('Vite dev pre-bundling');
      expect(child.stderr).toContain('CRASHLYTICS_APP_VERSION');
    });

    it('warns about build caches when run in an Angular workspace', () => {
      const angularWorkspace = path.join(tmpDir, 'angular-app');
      fs.mkdirSync(angularWorkspace, { recursive: true });
      fs.writeFileSync(path.join(angularWorkspace, 'angular.json'), '{}');
      const child = spawnSync(
        process.execPath,
        [copiedScriptPath, '--appVersion=1.0.0'],
        { cwd: angularWorkspace, encoding: 'utf8' }
      );
      expect(child.status).toBe(0);
      expect(child.stderr).toContain('Angular build caches (.angular/cache)');
      expect(child.stderr).toContain('ng build --define');
    });
  });
});
