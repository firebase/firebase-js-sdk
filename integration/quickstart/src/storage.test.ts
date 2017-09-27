/**
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

declare var browser: any;
declare var window: any;

import { expect } from 'chai';
import { resolve } from 'path';
import 'isomorphic-fetch';

describe('Storage Tests', function() {
  beforeEach(function() {
    browser.url('http://localhost:5001');
    expect(browser.getTitle()).to.equal(
      'Firebase SDK for Cloud Storage Quickstart'
    );

    // Pause to allow for anonymous sign in (POTENTIAL RACE CONDITION HERE)
    browser.waitUntil(() => {
      const result = browser.execute(
        () =>
          window.firebase &&
          window.firebase.auth() &&
          !!window.firebase.auth().currentUser
      );

      return result.value;
    });
  });
  it('Should properly upload a file with anonymous auth', async function() {
    browser.chooseFile('#file', resolve(__dirname, './test.json'));
    const textSelector = '#linkbox a';
    browser.waitForExist(textSelector, 5000);
    const url = browser.getAttribute(textSelector, 'href');

    expect(url).to.contain('firebasestorage');

    const file = await fetch(url);
    expect(await file.json()).to.deep.equal(require('./test.json'));
  });
});
