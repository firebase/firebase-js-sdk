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

import '../test/setup';
import { expect } from 'chai';
import { stub } from 'sinon';
import * as storage from './storage';
import * as indexeddb from './indexeddb';
import { clearState, getDebugState } from './state';
import { initializeDebugMode } from './debug';

describe('debug mode', () => {
  afterEach(() => {
    clearState();
    // reset the global variable for debug mode
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = undefined;
  });

  it('enables debug mode if self.FIREBASE_APPCHECK_DEBUG_TOKEN is set to a string', async () => {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = 'my-debug-token';
    initializeDebugMode();
    const debugState = getDebugState();

    expect(debugState.enabled).to.be.true;
    await expect(debugState.token?.promise).to.eventually.equal(
      'my-debug-token'
    );
  });

  it('generates a debug token if self.FIREBASE_APPCHECK_DEBUG_TOKEN is set to true', async () => {
    stub(storage, 'readOrCreateDebugTokenFromStorage').returns(
      Promise.resolve('my-debug-token')
    );

    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    initializeDebugMode();
    const debugState = getDebugState();

    expect(debugState.enabled).to.be.true;
    await expect(debugState.token?.promise).to.eventually.equal(
      'my-debug-token'
    );
  });

  it('saves the generated debug token to indexedDB', async () => {
    const saveToIndexedDBStub = stub(
      indexeddb,
      'writeDebugTokenToIndexedDB'
    ).callsFake(() => Promise.resolve());

    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    initializeDebugMode();

    await getDebugState().token?.promise;
    expect(saveToIndexedDBStub).to.have.been.called;
  });

  it('uses the cached debug token when it exists if self.FIREBASE_APPCHECK_DEBUG_TOKEN is set to true', async () => {
    stub(indexeddb, 'readDebugTokenFromIndexedDB').returns(
      Promise.resolve('cached-debug-token')
    );

    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    initializeDebugMode();

    const debugState = getDebugState();
    expect(debugState.enabled).to.be.true;
    await expect(debugState.token?.promise).to.eventually.equal(
      'cached-debug-token'
    );
  });
});
