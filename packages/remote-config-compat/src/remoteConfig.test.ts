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

import { RemoteConfigCompatImpl } from './remoteConfig';
import { getFakeApp, getFakeModularRemoteConfig } from '../test/util';
import * as modularApi from '@firebase/remote-config';

vi.mock('@firebase/remote-config', { spy: true });

describe('Remote Config Compat', () => {
  let remoteConfig!: RemoteConfigCompatImpl;
  const fakeModularRemoteConfig = getFakeModularRemoteConfig();
  beforeEach(() => {
    remoteConfig = new RemoteConfigCompatImpl(
      getFakeApp(),
      fakeModularRemoteConfig
    );
  });

  it('activate() calls modular activate()', async () => {
    const modularActivateSpy = vi
      .spyOn(modularApi, 'activate')
      .mockResolvedValue(true);
    const res = await remoteConfig.activate();

    expect(res).toBe(true);
    expect(modularActivateSpy).toHaveBeenCalledWith(fakeModularRemoteConfig);
  });

  it('ensureInitialized() calls modular ensureInitialized()', async () => {
    const modularEnsureInitializedSpy = vi
      .spyOn(modularApi, 'ensureInitialized')
      .mockResolvedValue();
    await remoteConfig.ensureInitialized();

    expect(modularEnsureInitializedSpy).toHaveBeenCalledWith(
      fakeModularRemoteConfig
    );
  });

  it('fetch() calls modular fetchConfig()', async () => {
    const modularFetchSpy = vi
      .spyOn(modularApi, 'fetchConfig')
      .mockResolvedValue();
    await remoteConfig.fetch();

    expect(modularFetchSpy).toHaveBeenCalledWith(fakeModularRemoteConfig);
  });

  it('fetchAndActivate() calls modular fetchAndActivate()', async () => {
    const modularFetchAndActivateSpy = vi
      .spyOn(modularApi, 'fetchAndActivate')
      .mockResolvedValue(true);
    const res = await remoteConfig.fetchAndActivate();

    expect(res).toBe(true);
    expect(modularFetchAndActivateSpy).toHaveBeenCalledWith(
      fakeModularRemoteConfig
    );
  });

  it('getAll() calls modular getAll()', () => {
    const allValues = {};
    const modularGetAllSpy = vi
      .spyOn(modularApi, 'getAll')
      .mockReturnValue(allValues);

    const res = remoteConfig.getAll();

    expect(res).toBe(allValues);
    expect(modularGetAllSpy).toHaveBeenCalledWith(fakeModularRemoteConfig);
  });

  it('getBoolean() calls modular getBoolean()', () => {
    const modularGetBooleanSpy = vi
      .spyOn(modularApi, 'getBoolean')
      .mockReturnValue(false);

    const res = remoteConfig.getBoolean('myKey');

    expect(res).toBe(false);
    expect(modularGetBooleanSpy).toHaveBeenCalledWith(
      fakeModularRemoteConfig,
      'myKey'
    );
  });

  it('getNumber() calls modular getNumber()', () => {
    const modularGetNumberSpy = vi
      .spyOn(modularApi, 'getNumber')
      .mockReturnValue(123);
    const res = remoteConfig.getNumber('myNumKey');

    expect(res).toBe(123);
    expect(modularGetNumberSpy).toHaveBeenCalledWith(
      fakeModularRemoteConfig,
      'myNumKey'
    );
  });

  it('getString() calls modular getString()', () => {
    const modularGetStringSpy = vi
      .spyOn(modularApi, 'getString')
      .mockReturnValue('abc');
    const res = remoteConfig.getString('myStrKey');

    expect(res).toBe('abc');
    expect(modularGetStringSpy).toHaveBeenCalledWith(
      fakeModularRemoteConfig,
      'myStrKey'
    );
  });

  it('getValue() calls modular getValue()', () => {
    const fakeValue = {} as modularApi.Value;
    const modularGetValueSpy = vi
      .spyOn(modularApi, 'getValue')
      .mockReturnValue(fakeValue);
    const res = remoteConfig.getValue('myValKey');

    expect(res).toBe(fakeValue);
    expect(modularGetValueSpy).toHaveBeenCalledWith(
      fakeModularRemoteConfig,
      'myValKey'
    );
  });

  it('setLogLevel() calls modular setLogLevel()', () => {
    const modularSetLogLevelSpy = vi
      .spyOn(modularApi, 'setLogLevel')
      .mockReturnValue();
    remoteConfig.setLogLevel('debug');

    expect(modularSetLogLevelSpy).toHaveBeenCalledWith(
      fakeModularRemoteConfig,
      'debug'
    );
  });
});
