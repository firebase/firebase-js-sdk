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

import { expect } from 'chai';
import { getId } from './get-id';
import { FAKE_INSTALLATIONS_ID, getFakeInstallations, getFakeServerApp } from '../testing/fake-generators';

describe('getId-serverapp', () => {
  it('getId with firebaseServerApp with authIdToken returns valid id', async() => {
    const installationsAuthToken = "fakeToken";
    const serverApp = getFakeServerApp(installationsAuthToken);
    const installations = getFakeInstallations(serverApp);
    const fid = await getId(installations);
    expect(fid).to.equal(FAKE_INSTALLATIONS_ID);
  });
  it('getId with firebaseServerApp without authIdToken throws', async() => {
    const serverApp = getFakeServerApp();
    const installations = getFakeInstallations(serverApp);
    let fails = false;
    try {
      await getId(installations);
    } catch (e) { 
      console.error(e);
      fails = true;
    }
    expect(fails).to.be.true;
  });
});
