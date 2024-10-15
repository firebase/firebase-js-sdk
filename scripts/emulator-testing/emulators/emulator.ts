/**
 * @license
 * Copyright 2018 Google LLC
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

// @ts-ignore
import {
  ChildProcessPromise,
  spawn,
  SpawnPromiseResult
} from 'child-process-promise';
import { ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
// @ts-ignore
import * as tmp from 'tmp';

export abstract class Emulator {
  binaryPath: string | null = null;
  emulator: ChildProcess | null = null;

  cacheDirectory: string;
  cacheBinaryPath: string;

  isDataConnect = false;

  constructor(
    private binaryName: string,
    private binaryUrl: string,
    public readonly port: number
  ) {
    this.cacheDirectory = path.join(os.homedir(), `.cache/firebase-js-sdk`);
    this.cacheBinaryPath = path.join(this.cacheDirectory, binaryName);
  }

  download(): Promise<void> {
    if (fs.existsSync(this.cacheBinaryPath)) {
      console.log(`Emulator found in cache: ${this.cacheBinaryPath}`);
      this.binaryPath = this.cacheBinaryPath;
      return Promise.resolve();
    }

    const { name: tempDir } = tmp.dirSync({ unsafeCleanup: true });
    const filepath = path.resolve(tempDir, this.binaryName);
    return new Promise<void>((resolve, reject) => {
      /**
       * Once the download is `done` in `readChunk`, we want to set `this.binaryPath` to the path of the
       * downloaded emulator. Unfortunately, we can't access `this` when inside `readChunk`'s scope, since
       * it's a named function expression, and does not inherit the `this` object from it's parent.
       * To work around this, we wrap the fetch in a promise,
       * then once it's resolved we can access `this` in a callback arrow function that *does* inherit
       * `this` from the parent object, allowing us to set `this.binaryPath`.
       * Note that we can't make readChunk an arrow function, since it needs to be named so that we can
       * perform recursion to read the next chunk.
       */
      const downloadPromise = new Promise<Uint8Array>(
        (downloadComplete, downloadFailed) => {
          fetch(this.binaryUrl)
            .then(resp => {
              if (!resp.ok || resp.body === null) {
                return downloadFailed(
                  `Failed to download emulator: [${resp.status}] ${resp.statusText}`
                );
              }

              const buf = new Uint8Array(2 ** 25); // 32Mb
              let cur = 0;
              const reader = resp.body.getReader();
              reader.read().then(function readChunk({ done, value }): any {
                if (done) {
                  return downloadComplete(buf);
                }

                if (!value) {
                  return downloadFailed(
                    'Did not receive chunk in response body'
                  );
                }

                buf.set(value, cur);
                cur += value.length;
                return reader.read().then(readChunk);
              });
            })
            .catch(err => downloadFailed(err));
        }
      );

      downloadPromise.then(buf => {
        fs.writeFileSync(filepath, buf);
        fs.chmod(filepath, 0o755, err => {
          if (err) {
            return reject(err);
          }

          console.log(`Changed emulator file permissions to 'rwxr-xr-x'.`);
          // Since we are now in an arrow function, `this` is inherited from the `download()` method, so it is the Emulator object
          this.binaryPath = filepath;
          if (this.copyToCache()) {
            console.log(`Cached emulator at ${this.cacheBinaryPath}`);
          }

          resolve();
        });
      });
    });
  }

  setUp(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!this.binaryPath) {
        throw new Error('You must call download() before setUp()');
      }
      let promise: ChildProcessPromise<SpawnPromiseResult>;
      if (this.isDataConnect) {
        promise = spawn(this.binaryPath, [
          'dev',
          '--local_connection_string',
          "'postgresql://postgres:secretpassword@localhost:5432/postgres?sslmode=disable'"
        ]);
      } else {
        promise = spawn(
          'java',
          [
            '-jar',
            path.basename(this.binaryPath),
            '--port',
            this.port.toString()
          ],
          {
            cwd: path.dirname(this.binaryPath),
            stdio: 'inherit'
          }
        );
      }

      promise.catch(reject);
      this.emulator = promise.childProcess;

      console.log(`Waiting for emulator to start up ...`);
      // NOTE: Normally the emulator starts up within a few seconds.
      // However, our sdk test suite launches tests from 20+ packages in parallel, which slows
      // down the startup substantially. In such case for the emulator to start, it can take
      // ~17 seconds on a corp macbook, ~7 seconds on a corp workstation, and even 50+ seconds
      // on Travis VMs.
      const timeout = process.env.TRAVIS ? 100 : 30; // seconds
      const start: number = Date.now();

      const wait = (resolve: () => void, reject: (arg0: unknown) => void) => {
        const elapsed = (Date.now() - start) / 1000;
        if (elapsed > timeout) {
          reject(`Emulator not ready after ${timeout}s. Exiting ...`);
        } else {
          console.log(`Ping emulator at [http://127.0.0.1:${this.port}] ...`);
          fetch(`http://127.0.0.1:${this.port}`).then(
            () => {
              // Database and Firestore emulators will return 400 and 200 respectively.
              // As long as we get a response back, it means the emulator is ready.
              console.log(`Emulator has started up after ${elapsed}s!`);
              resolve();
            },
            error => {
              setTimeout(wait, 1000, resolve, reject);
            }
          );
        }
      };
      setTimeout(wait, 1000, resolve, reject);
    });
  }

  tearDown(): void {
    if (this.emulator) {
      console.log(`Shutting down emulator, pid: [${this.emulator.pid}] ...`);
      this.emulator.kill();
    }

    if (this.binaryPath) {
      console.log(`Deleting the emulator at ${this.binaryPath}`);
      fs.unlinkSync(this.binaryPath);
    }
  }

  private copyToCache(): boolean {
    if (!this.binaryPath) {
      return false;
    }

    try {
      if (!fs.existsSync(this.cacheDirectory)) {
        fs.mkdirSync(this.cacheDirectory, { recursive: true });
      }
      fs.copyFileSync(this.binaryPath, this.cacheBinaryPath);

      return true;
    } catch (e) {
      console.warn(`Unable to cache ${this.binaryName}`, e);
    }

    return false;
  }
}
