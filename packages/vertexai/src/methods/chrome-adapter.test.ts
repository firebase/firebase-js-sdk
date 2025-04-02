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

import { expect, use } from 'chai';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import { ChromeAdapter } from './chrome-adapter';
import { InferenceMode } from '../types';

use(sinonChai);
use(chaiAsPromised);

describe('ChromeAdapter', () => {
  describe('isOnDeviceRequest', () => {
    it('returns true for simple text part', async () => {
      expect(
        ChromeAdapter._isOnDeviceRequest({
          contents: [{ role: 'user', parts: [{ text: 'hi' }] }]
        })
      ).to.be.true;
    });
    it('returns false if contents empty', async () => {
      expect(
        ChromeAdapter._isOnDeviceRequest({
          contents: []
        })
      ).to.be.false;
    });
  });
  describe('isAvailable', () => {
    it('returns true if a model is available', async () => {
      const aiProvider = {
        languageModel: {
          capabilities: () =>
            Promise.resolve({
              available: 'readily'
            } as AILanguageModelCapabilities)
        }
      } as AI;
      const adapter = new ChromeAdapter(
        aiProvider,
        InferenceMode.PREFER_ON_DEVICE
      );
      expect(
        await adapter.isAvailable({
          contents: [{ role: 'user', parts: [{ text: 'hi' }] }]
        })
      ).to.be.true;
    });
  });
});
