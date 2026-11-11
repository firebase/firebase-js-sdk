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
import { execFileSync } from 'node:child_process';

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
});
