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
import { RemoteConfigCompat } from './remoteConfig';
import { getFakeApp, getFakeModularRemoteConfig } from '../test/util';
import * as modularApi from '@firebase/remote-config-exp';
import { Value } from '@firebase/remote-config-types-exp';

describe('Remote Config Compat', () => {
  let remoteConfig!: RemoteConfigCompat;
  const fakeModularRemoteConfig = getFakeModularRemoteConfig();
  before(() => {
    remoteConfig = new RemoteConfigCompat(
      getFakeApp(),
      fakeModularRemoteConfig
    );
  });

  it('activate() calls modular activate()', async () => {
    const modularActivateStub = stub(modularApi, 'activate').callsFake(() =>
      Promise.resolve(true)
    );
    const res = await remoteConfig.activate();

    expect(res).to.equal(res);
    expect(modularActivateStub).to.have.been.calledWithExactly(
      fakeModularRemoteConfig
    );
  });

  it('ensureInitialized() calls modular ensureInitialized()', async () => {
    const modularEnsureInitializedStub = stub(
      modularApi,
      'ensureInitialized'
    ).callsFake(() => Promise.resolve());
    await remoteConfig.ensureInitialized();

    expect(modularEnsureInitializedStub).to.have.been.calledWithExactly(
      fakeModularRemoteConfig
    );
  });

  it('fetch() calls modular fetchConfig()', async () => {
    const modularFetchStub = stub(modularApi, 'fetchConfig').callsFake(() =>
      Promise.resolve()
    );
    await remoteConfig.fetch();

    expect(modularFetchStub).to.have.been.calledWithExactly(
      fakeModularRemoteConfig
    );
  });

  it('fetchAndActivate() calls modular fetchAndActivate()', async () => {
    const modularFetchAndActivateStub = stub(
      modularApi,
      'fetchAndActivate'
    ).callsFake(() => Promise.resolve(true));
    const res = await remoteConfig.fetchAndActivate();

    expect(res).to.equal(true);
    expect(modularFetchAndActivateStub).to.have.been.calledWithExactly(
      fakeModularRemoteConfig
    );
  });

  it('getAll() calls modular getAll()', () => {
    const allValues = {};
    const modularGetAllStub = stub(modularApi, 'getAll').callsFake(
      () => allValues
    );

    const res = remoteConfig.getAll();

    expect(res).to.equal(allValues);
    expect(modularGetAllStub).to.have.been.calledWithExactly(
      fakeModularRemoteConfig
    );
  });

  it('getBoolean() calls modular getBoolean()', () => {
    const modularGetBoolean = stub(modularApi, 'getBoolean').callsFake(
      () => false
    );

    const res = remoteConfig.getBoolean('myKey');

    expect(res).to.equal(false);
    expect(modularGetBoolean).to.have.been.calledWithExactly(
      fakeModularRemoteConfig,
      'myKey'
    );
  });

  it('getNumber() calls modular getNumber()', () => {
    const modularGetNumber = stub(modularApi, 'getNumber').callsFake(() => 123);
    const res = remoteConfig.getNumber('myNumKey');

    expect(res).to.equal(123);
    expect(modularGetNumber).to.have.been.calledWithExactly(
      fakeModularRemoteConfig,
      'myNumKey'
    );
  });

  it('getString() calls modular getString()', () => {
    const modularGetString = stub(modularApi, 'getString').callsFake(
      () => 'abc'
    );
    const res = remoteConfig.getString('myStrKey');

    expect(res).to.equal('abc');
    expect(modularGetString).to.have.been.calledWithExactly(
      fakeModularRemoteConfig,
      'myStrKey'
    );
  });

  it('getValue() calls modular getValue()', () => {
    const fakeValue = {} as Value;
    const modularGetValue = stub(modularApi, 'getValue').callsFake(
      () => fakeValue
    );
    const res = remoteConfig.getValue('myValKey');

    expect(res).to.equal(fakeValue);
    expect(modularGetValue).to.have.been.calledWithExactly(
      fakeModularRemoteConfig,
      'myValKey'
    );
  });

  it('setLogLevel() calls modular setLogLevel()', () => {
    const modularSetLogLevel = stub(
      modularApi,
      'setLogLevel'
    ).callsFake(() => {});
    remoteConfig.setLogLevel('debug');

    expect(modularSetLogLevel).to.have.been.calledWithExactly(
      fakeModularRemoteConfig,
      'debug'
    );
  });
});
