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
import { getAI, getGenerativeModel } from './api';
import { expect } from 'chai';
import { InferenceMode } from './public-types';
import { getFullApp } from '../test-utils/get-fake-firebase-services';
import { DEFAULT_HYBRID_IN_CLOUD_MODEL } from './constants';
import { factory } from './factory-browser';

/**
 * Browser-only top level API tests using a factory that provides
 * a ChromeAdapter.
 */
describe('Top level API', () => {
  describe('getAI()', () => {
    it('getGenerativeModel with HybridParams sets a default model', () => {
      const ai = getAI(getFullApp({ apiKey: 'key', appId: 'id' }, factory));
      const genModel = getGenerativeModel(ai, {
        mode: InferenceMode.ONLY_ON_DEVICE
      });
      expect(genModel.model).to.equal(
        `models/${DEFAULT_HYBRID_IN_CLOUD_MODEL}`
      );
    });
    it('getGenerativeModel with HybridParams honors a model override', () => {
      const ai = getAI(getFullApp({ apiKey: 'key', appId: 'id' }, factory));
      const genModel = getGenerativeModel(ai, {
        mode: InferenceMode.PREFER_ON_DEVICE,
        inCloudParams: { model: 'my-model' }
      });
      expect(genModel.model).to.equal('models/my-model');
    });
  });
});
