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

    return new Promise<void>((resolve, reject) => {
      tmp.dir((err: Error | null, dir: string) => {
        if (err) reject(err);
        console.log(`Created temporary directory at [${dir}].`);
        const filepath: string = path.resolve(dir, this.binaryName);
        const writer = fs.createWriteStream(filepath);
        console.log(`Downloading emulator from [${this.binaryUrl}] ...`);
        // Map the DOM's fetch Reader to node's streaming file system
        // operations. We will need to access class members `binaryPath` and `copyToCache` after the
        // download completes. It's a compilation error to pass `this` into the named function
        // `readChunk`, so the download operation is wrapped in a promise that we wait upon.
        const downloadPromise = new Promise<void>(
          (downloadComplete, downloadFailed) => {
            fetch(this.binaryUrl)
              .then(resp => {
                if (resp.status !== 200 || resp.body === null) {
                  console.log('Download of emulator failed: ', resp.statusText);
                  downloadFailed();
                } else {
                  const reader = resp.body.getReader();
                  reader.read().then(function readChunk({ done, value }): any {
                    if (done) {
                      console.log('Emulator download is done.');
                      writer.close(err => {
                        if (err) {
                          downloadFailed(
                            `Failed to close the downloaded emulator file: ${err}`
                          );
                        }

                        console.log('Closed downloaded emulator file.');
                        downloadComplete();
                      });
                    } else {
                      writer.write(value);
                      return reader.read().then(readChunk);
                    }
                  });
                }
              })
              .catch(e => {
                console.log(`Download of emulator failed: ${e}`);
                downloadFailed();
              });
          }
        );

        downloadPromise.then(
          () => {
            // Change emulator binary file permission to 'rwxr-xr-x'.
            // The execute permission is required for it to be able to start
            // with 'java -jar'.
            fs.chmod(filepath, 0o755, err => {
              if (err) reject(err);
              console.log(`Changed emulator file permissions to 'rwxr-xr-x'.`);
              this.binaryPath = filepath;
              if (this.copyToCache()) {
                console.log(`Cached emulator at ${this.cacheBinaryPath}`);
              }
              resolve();
            });
          },
          () => {
            reject();
          }
        );
      });
    });
  }

  findDataConnectConfigDir() {
    let path = './';
    const files = fs.readdirSync(path);
    if (files.includes('dataconnect')) {
      return path + 'dataconnect';
    }
    if (files.includes('test')) {
      return path + 'test/dataconnect';
    }
    throw new Error(
      'Max Depth Exceeded. Please run from the data-connect/test folder'
    );
  }

  setUp(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!this.binaryPath) {
        throw new Error('You must call download() before setUp()');
      }
      let promise: ChildProcessPromise<SpawnPromiseResult>;
      if (this.isDataConnect) {
        const dataConnectConfigDir = this.findDataConnectConfigDir();
        const password = process.env['POSTGRES_PASSWORD'];
        promise = spawn(this.binaryPath, [
          '--v=2',
          'dev',
          `--listen=127.0.0.1:${this.port},[::1]:${this.port}`,
          `--local_connection_string=postgresql://postgres:${password}@localhost:5432/dataconnect-integration?sslmode=disable`,
          `--config_dir=${dataConnectConfigDir}`
        ]);
        promise.childProcess.stdout?.on('data', console.log);
        promise.childProcess.stderr?.on('data', res =>
          console.log(res.toString())
        );
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
      console.log(`Deleting the emulator jar at ${this.binaryPath}`);
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
