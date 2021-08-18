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

import './testing/setup';
import { getFakeApp, getFakeInstallations } from './testing/util';
import { InstallationsCompat } from './installationsCompat';
import * as modularApi from '@firebase/installations-exp';
import { expect } from 'chai';
import { stub } from 'sinon';

describe('Installations Compat', () => {
  let installationsCompat!: InstallationsCompat;
  const installations = getFakeInstallations();
  before(() => {
    installationsCompat = new InstallationsCompat(getFakeApp(), installations);
  });

  it('getId calls modular getId()', async () => {
    const fakeFid = 'fake-fid';
    const modularGetIdStub = stub(modularApi, 'getId').callsFake(() =>
      Promise.resolve(fakeFid)
    );

    const res = await installationsCompat.getId();

    expect(res).to.equal(fakeFid);
    expect(modularGetIdStub).to.have.been.calledWithExactly(installations);
  });

  it('getToken calls modular getToken()', async () => {
    const fakeToken = 'fake-token';
    const modularGetTokenStub = stub(modularApi, 'getToken').callsFake(() =>
      Promise.resolve(fakeToken)
    );

    const res = await installationsCompat.getToken();

    expect(res).to.equal(fakeToken);
    expect(modularGetTokenStub).to.have.been.calledWithExactly(
      installations,
      undefined
    );
  });

  it('delete calls modular deleteInstallations()', async () => {
    const modularDeleteStub = stub(
      modularApi,
      'deleteInstallations'
    ).callsFake(() => Promise.resolve());

    await installationsCompat.delete();

    expect(modularDeleteStub).to.have.been.calledWithExactly(installations);
  });

  it('onIdChange calls modular onIdChange()', () => {
    const fakeIdChangeCallbackFn = stub();
    const fakeIdChangeUnsubscribeFn = stub();
    const modularOnIdChangeStub = stub(modularApi, 'onIdChange').callsFake(
      () => fakeIdChangeUnsubscribeFn
    );

    const res = installationsCompat.onIdChange(fakeIdChangeCallbackFn);

    expect(res).to.equal(fakeIdChangeUnsubscribeFn);
    expect(modularOnIdChangeStub).to.have.been.calledWith(
      installations,
      fakeIdChangeCallbackFn
    );
  });
});
