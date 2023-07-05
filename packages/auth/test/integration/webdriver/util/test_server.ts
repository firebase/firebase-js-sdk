/**
 * @license
 * Copyright 2020 Google LLC
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

import * as path from 'path';
import * as express from 'express';
import { Server } from 'http';

const PORT_NUMBER = '4100';

const INTEGRATION_TEST_ASSETS = express.static(
  path.join(
    // process.env.PWD == packages-exp/auth
    process.env.PWD!,
    'test/integration/webdriver/static'
  )
);

/** Simple express server for serving up the static files for testing */
class AuthTestServer {
  private app = express.default();
  private server: Server | null = null;

  constructor() {
    this.app.use([INTEGRATION_TEST_ASSETS]);
  }

  get address(): string {
    return `http://localhost:${PORT_NUMBER}`;
  }

  async start(): Promise<void> {
    if (this.server) {
      return;
    }

    return new Promise(resolve => {
      this.server = this.app.listen(PORT_NUMBER, resolve);
    });
  }

  stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }
}

export const authTestServer = new AuthTestServer();
