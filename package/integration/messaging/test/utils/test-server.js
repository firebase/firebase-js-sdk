/**
 * @license
 * Copyright 2017 Google LLC
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

const path = require('path');
const express = require('express');
const PORT_NUMBER = 3000;

const FIREBASE_HEAD = express.static(
  path.join(
    /* firebase-js-sdk/integration/messaging */ process.env.PWD,
    '../..',
    '/packages/firebase'
  )
);

const INTEGRATION_TEST_ASSETS = express.static(
  path.join(
    /* firebase-js-sdk/integration/messaging */ process.env.PWD,
    'test/static'
  )
);

class MessagingTestServer {
  constructor() {
    this._app = express();
    this._app.use([INTEGRATION_TEST_ASSETS, FIREBASE_HEAD]);
    this._server = null;
  }

  get serverAddress() {
    if (!this._server) {
      return null;
    }

    return `http://localhost:${PORT_NUMBER}`;
  }

  async start() {
    if (this._server) {
      return;
    }

    return new Promise((resolve, reject) => {
      this._server = this._app.listen(PORT_NUMBER, () => {
        resolve();
      });
    });
  }

  // Sometimes the server doesn't trigger the callback due to currently open sockets. So call close
  // this._server
  async stop() {
    if (this._server) {
      this._server.close();
      this._server = null;
    }
  }
}

module.exports = new MessagingTestServer();
