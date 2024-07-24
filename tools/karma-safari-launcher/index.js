/**
 * @license
 * Copyright 2024 Google LLC
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

// See: https://karma-runner.github.io/6.4/dev/plugins.html
const fs = require('fs');
const os = require('os');
const path = require('path');

var SafariBrowser = function (baseBrowserDecorator) {
  baseBrowserDecorator(this);

  // This is the only directory that we can open files from in Safari without causing a
  // dialog to open.
  // Reading and writing to this directory requires Full Disk access, which can be granted on macOS > 13 at
  // 'System Settings' > 'Privacy & Security' > 'Full Disk Access'.
  const SAFARI_DATA_DIR = path.join(
    os.homedir(),
    'Library/Containers/com.apple.Safari/Data'
  );
  const HTML_TRAMPOLINE_PATH = path.join(SAFARI_DATA_DIR, 'redirect.html');

  this._start = function (url) {
    var self = this;

    // HTML trampoline to redirect Safari to the URL where the tests are hosted.
    // This is necessary because Safari assumes the location we pass as an argument is a path
    // in the Safari Data directory. So, if we were to pass 'http://localhost:3000' as an argument,
    // Safari would attempt to open
    // 'file:///Users/<user>/Library/Containers/com.apple.Safari/Data/http:/localhost:3000'.
    const htmlTrampoline = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Redirect</title>
        <meta http-equiv="refresh" content="0; url=${url}">
      </head>
        <body>
          <p>If you are not redirected automatically, please click <a href="${url}">here</a>.</p>
        </body>
      </html>
      `;

    fs.writeFile(HTML_TRAMPOLINE_PATH, htmlTrampoline, function (err) {
      if (err) {
        console.error('Error writing file:', err);
        return;
      }

      // Open the HTMl trampoline in Safari
      self._execCommand(self._getCommand(), [HTML_TRAMPOLINE_PATH]);
    });
  };
};

SafariBrowser.prototype = {
  name: 'Safari',
  DEFAULT_CMD: {
    darwin: '/Applications/Safari.app/Contents/MacOS/Safari'
  },
  ENV_CMD: 'SAFARI_BIN'
};

SafariBrowser.$inject = ['baseBrowserDecorator'];

module.exports = {
  'launcher:Safari': ['type', SafariBrowser]
};
