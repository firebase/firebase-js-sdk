/**
 * @license
 * Copyright 2022 Google LLC
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

import { expect } from 'chai';
import { isNode } from '../src/environment';
import { SinonStub, stub, restore } from 'sinon';
import * as defaults from '../src/defaults';

const firebaseDefaults: defaults.FirebaseDefaults = {
  _authTokenSyncURL: 'string',
  _authIdTokenMaxAge: 200,
  forceEnvironment: 'node'
};

describe('isNode()', () => {
  let getDefaultsFromGlobalStub: SinonStub;

  beforeEach(async () => {
    getDefaultsFromGlobalStub = stub(defaults, 'getDefaults');
  });

  afterEach(async () => {
    restore();
  });

  it('returns true if forceEnvironment lists `node`', () => {
    getDefaultsFromGlobalStub.returns(firebaseDefaults);

    expect(isNode()).to.be.true;
  });

  it('returns false if forceEnvironment lists `browser`', () => {
    getDefaultsFromGlobalStub.returns({
      ...firebaseDefaults,
      forceEnvironment: 'browser'
    });

    expect(isNode()).to.be.false;
  });
});
