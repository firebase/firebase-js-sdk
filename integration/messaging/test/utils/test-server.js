/**
 * @license
 * Copyright 2017 Google Inc.
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

const express = require('express');
const path = require('path');

const PORT_NUMBER = 3000;

class MessagingTestServer {
  constructor() {
    this._app = express();
    // Expose static directory contents
    this._app.use('/', express.static(path.join(__dirname, '..', 'static')));
    console.log('Firebase Path:', path.dirname(require.resolve('firebase')));
    this._app.use(
      '/firebase',
      express.static(path.dirname(require.resolve('firebase')))
    );
    this._app.use('/', express.static(path.join(__dirname, 'shared-files')));

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

  // Sometimes the server doesn't trigger the callback due to
  // currently open sockets. So call `closethis._server
  async stop() {
    if (this._server) {
      this._server.close();
      this._server = null;
    }
  }
}
module.exports = new MessagingTestServer();
