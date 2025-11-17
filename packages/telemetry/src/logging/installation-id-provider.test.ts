/**
 * @license
 * Copyright 2025 Google LLC
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

import { InstallationIdProvider } from './installation-id-provider';
import { _FirebaseInstallationsInternal } from '@firebase/installations';
import { expect } from 'chai';

describe('InstallationIdProvider', () => {
  it('should cache the installation id after the first call', async () => {
    let callCount = 0;
    const mockInstallations = {
      getId: async () => {
        callCount++;
        return 'iid-123';
      }
    } as unknown as _FirebaseInstallationsInternal;

    const provider = new InstallationIdProvider(mockInstallations);

    const attr1 = await provider.getAttribute();
    expect(attr1).to.deep.equal(['user.id', 'iid-123']);
    expect(callCount).to.equal(1);

    const attr2 = await provider.getAttribute();
    expect(attr2).to.deep.equal(['user.id', 'iid-123']);
    expect(callCount).to.equal(1); // Should still be 1
  });

  it('should not cache if installation id is null', async () => {
    let callCount = 0;
    let returnValue: string | null = null;
    const mockInstallations = {
      getId: async () => {
        callCount++;
        return returnValue;
      }
    } as unknown as _FirebaseInstallationsInternal;

    const provider = new InstallationIdProvider(mockInstallations);

    const attr1 = await provider.getAttribute();
    expect(attr1).to.be.null;
    expect(callCount).to.equal(1);

    returnValue = 'iid-456';
    const attr2 = await provider.getAttribute();
    expect(attr2).to.deep.equal(['user.id', 'iid-456']);
    expect(callCount).to.equal(2);

    // Should cache now
    const attr3 = await provider.getAttribute();
    expect(attr3).to.deep.equal(['user.id', 'iid-456']);
    expect(callCount).to.equal(2);
  });
});
