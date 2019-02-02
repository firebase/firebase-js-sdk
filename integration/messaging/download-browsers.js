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

const seleniumAssistant = require('selenium-assistant');

console.log('Starting browser download - this may take some time.');
Promise.all([
  seleniumAssistant.downloadLocalBrowser('chrome', 'stable', 48),
  seleniumAssistant.downloadLocalBrowser('chrome', 'beta', 48),
  seleniumAssistant.downloadLocalBrowser('chrome', 'unstable', 48),
  seleniumAssistant.downloadLocalBrowser('firefox', 'stable', 48),
  seleniumAssistant.downloadLocalBrowser('firefox', 'beta', 48),
  seleniumAssistant.downloadLocalBrowser('firefox', 'unstable', 48)
])
  .then(() => {
    console.log('Browser download complete.');
  })
  .catch(err => {
    console.error('Browser download failed.');
  });
