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

import { expect } from 'chai';
import { RootSpanContextManager } from './root-span-context-manager';

describe('RootSpanContextManager', () => {
  let contextManager: RootSpanContextManager;

  beforeEach(() => {
    contextManager = new RootSpanContextManager();
  });

  it('should return active app screen id as undefined by default', () => {
    expect(contextManager.getActiveAppScreenId()).to.be.undefined;
  });

  it('should set and get active app screen id', () => {
    const mockScreenId = 'screen-id';
    contextManager.setActiveAppScreenId(mockScreenId);
    expect(contextManager.getActiveAppScreenId()).to.equal(mockScreenId);
  });

  it('should override previous active app screen id', () => {
    const mockScreenId1 = 'screen-id-1';
    const mockScreenId2 = 'screen-id-2';

    contextManager.setActiveAppScreenId(mockScreenId1);
    expect(contextManager.getActiveAppScreenId()).to.equal(mockScreenId1);

    contextManager.setActiveAppScreenId(mockScreenId2);
    expect(contextManager.getActiveAppScreenId()).to.equal(mockScreenId2);
  });
});
