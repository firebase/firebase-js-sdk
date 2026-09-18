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

import { describe, beforeEach, it, expect, vi } from 'vitest';
import * as FidChangedModule from '../helpers/fid-changed';

vi.mock('../helpers/fid-changed', { spy: true });

import '../testing/setup';
import { onIdChange } from './on-id-change';
import { getFakeInstallations } from '../testing/fake-generators';
import { FirebaseInstallationsImpl } from '../interfaces/installation-impl';

describe('onIdChange', () => {
  let installations: FirebaseInstallationsImpl;

  beforeEach(() => {
    installations = getFakeInstallations();
  });

  it('calls addCallback with the given callback and app key when called', () => {
    const callback = vi.fn();
    onIdChange(installations, callback);
    expect(FidChangedModule.addCallback).toHaveBeenCalledTimes(1);
    expect(FidChangedModule.addCallback).toHaveBeenCalledWith(
      installations.appConfig,
      callback
    );
  });

  it('calls removeCallback with the given callback and app key when unsubscribe is called', () => {
    const callback = vi.fn();
    const unsubscribe = onIdChange(installations, callback);
    unsubscribe();
    expect(FidChangedModule.removeCallback).toHaveBeenCalledTimes(1);
    expect(FidChangedModule.removeCallback).toHaveBeenCalledWith(
      installations.appConfig,
      callback
    );
  });
});
