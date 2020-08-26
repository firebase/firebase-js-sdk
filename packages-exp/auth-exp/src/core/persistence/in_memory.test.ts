/**
 * @license
 * Copyright 2019 Google LLC
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

import { testUser, testAuth } from '../../../test/helpers/mock_auth';
import { _getInstance } from '../util/instantiator';
import { Persistence, PersistenceType } from './';
import { inMemoryPersistence } from './in_memory';

const persistence: Persistence = _getInstance(inMemoryPersistence);

describe('core/persistence/in_memory', () => {
  it('should work with persistence type', async () => {
    const key = 'my-super-special-persistence-type';
    const value = PersistenceType.LOCAL;
    expect(await persistence._get(key)).to.be.null;
    await persistence._set(key, value);
    expect(await persistence._get(key)).to.be.eq(value);
    expect(await persistence._get('other-key')).to.be.null;
    await persistence._remove(key);
    expect(await persistence._get(key)).to.be.null;
  });

  it('should work with user', async () => {
    const key = 'my-super-special-user';
    const auth = await testAuth();
    const value = testUser(auth, 'uid');

    expect(await persistence._get(key)).to.be.null;
    await persistence._set(key, value.toJSON());
    expect(await persistence._get(key)).to.eql(value.toJSON());
    expect(await persistence._get('other-key')).to.be.null;
    await persistence._remove(key);
    expect(await persistence._get(key)).to.be.null;
  });

  it('isAvailable returns true', async () => {
    expect(await persistence._isAvailable()).to.be.true;
  });
});
