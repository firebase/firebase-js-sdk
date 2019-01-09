/**
 * Copyright 2018 Google Inc.
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

import { spawn } from 'child-process-promise';
import { ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as request from 'request';
import * as tmp from 'tmp';

export interface ChildProcessPromise extends Promise<void> {
  childProcess: ChildProcess;
}

export abstract class Emulator {
  binaryName: string;
  binaryUrl: string;
  binaryPath: string;

  emulator: ChildProcess;
  port: number;

  constructor(port: number) {
    this.port = port;
  }

  download(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      tmp.dir((err, dir) => {
        if (err) reject(err);

        console.log(`Created temporary directory at [${dir}].`);
        const filepath: string = path.resolve(dir, this.binaryName);
        const writeStream: fs.WriteStream = fs.createWriteStream(filepath);

        console.log(`Downloading emulator from [${this.binaryUrl}] ...`);
        request(this.binaryUrl)
          .pipe(writeStream)
          .on('finish', () => {
            console.log(`Saved emulator binary file to [${filepath}].`);
            fs.chmod(filepath, 0o755, err => {
              if (err) reject(err);
              console.log(`Changed emulator file permissions to 'rwxr-xr-x'.`);
              this.binaryPath = filepath;
              resolve();
            });
          })
          .on('error', reject);
      });
    });
  }

  setUp(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const promise: ChildProcessPromise = spawn(
        'java',
        ['-jar', path.basename(this.binaryPath), '--port', this.port],
        {
          cwd: path.dirname(this.binaryPath),
          stdio: 'inherit'
        }
      );
      promise.catch(reject);
      this.emulator = promise.childProcess;

      console.log(`Waiting for emulator to start up ...`);
      const timeout = 10; // seconds
      const start: number = Date.now();

      const wait = (resolve, reject) => {
        if (Date.now() - start > timeout * 1000) {
          reject(`Emulator not ready after ${timeout}s. Exiting ...`);
        } else {
          console.log(`Ping emulator at [http://localhost:${this.port}] ...`);
          request(`http://localhost:${this.port}`, (error, response) => {
            if (error && error.code === 'ECONNREFUSED') {
              setTimeout(wait, 1000, resolve, reject);
            } else if (response) {
              // Database and Firestore emulators will return 400 and 200 respectively.
              // As long as we get a response back, it means the emulator is ready.
              console.log('Emulator has started up successfully!');
              resolve();
            } else {
              // This should not happen.
              reject({ error, response });
            }
          });
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
  }
}
