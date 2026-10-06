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

import { getFakeApp, getFakeInstallations } from './testing/util';
import { InstallationsCompat } from './installationsCompat';
import * as modularApi from '@firebase/installations';

vi.mock('@firebase/installations', { spy: true });

describe('Installations Compat', () => {
  let installationsCompat!: InstallationsCompat;
  const installations = getFakeInstallations();
  beforeAll(() => {
    installationsCompat = new InstallationsCompat(getFakeApp(), installations);
  });

  it('getId calls modular getId()', async () => {
    const fakeFid = 'fake-fid';
    const modularGetIdStub = vi
      .spyOn(modularApi, 'getId')
      .mockResolvedValue(fakeFid);

    const res = await installationsCompat.getId();

    expect(res).toBe(fakeFid);
    expect(modularGetIdStub).toHaveBeenCalledWith(installations);
  });

  it('getToken calls modular getToken()', async () => {
    const fakeToken = 'fake-token';
    const modularGetTokenStub = vi
      .spyOn(modularApi, 'getToken')
      .mockResolvedValue(fakeToken);

    const res = await installationsCompat.getToken();

    expect(res).toBe(fakeToken);
    expect(modularGetTokenStub).toHaveBeenCalledWith(installations, undefined);
  });

  it('delete calls modular deleteInstallations()', async () => {
    const modularDeleteStub = vi
      .spyOn(modularApi, 'deleteInstallations')
      .mockResolvedValue();

    await installationsCompat.delete();

    expect(modularDeleteStub).toHaveBeenCalledWith(installations);
  });

  it('onIdChange calls modular onIdChange()', () => {
    const fakeIdChangeCallbackFn = vi.fn();
    const fakeIdChangeUnsubscribeFn = vi.fn();
    const modularOnIdChangeStub = vi
      .spyOn(modularApi, 'onIdChange')
      .mockReturnValue(fakeIdChangeUnsubscribeFn);

    const res = installationsCompat.onIdChange(fakeIdChangeCallbackFn);

    expect(res).toBe(fakeIdChangeUnsubscribeFn);
    expect(modularOnIdChangeStub).toHaveBeenCalledWith(
      installations,
      fakeIdChangeCallbackFn
    );
  });
});
