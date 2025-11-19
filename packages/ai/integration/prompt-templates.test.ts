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
import {
  BackendType,
  getTemplateGenerativeModel,
  getTemplateImagenModel
} from '../src';
import { testConfigs } from './constants';
import { STAGING_URL } from '../src/constants';

const templateBackendSuffix = (
  backendType: BackendType
): 'googleai' | 'vertexai' =>
  backendType === BackendType.GOOGLE_AI ? 'googleai' : 'vertexai';

describe('Prompt templates', function () {
  this.timeout(20_000);
  testConfigs.forEach(testConfig => {
    describe(`${testConfig.toString()}`, () => {
      describe('Generative Model', () => {
        it('successfully generates content', async () => {
          const a = new AbortController();
          const model = getTemplateGenerativeModel(testConfig.ai, {
            baseUrl: STAGING_URL
          });
          // a.abort();
          try {
            await model.generateContent(
              `sassy-greeting-${templateBackendSuffix(
                testConfig.ai.backend.backendType
              )}`,
              { name: 'John' },
              { signal: a.signal, timeout: 100 }
            );
          } catch (e) {
            console.error(e);
            if ((e as DOMException).name === 'AbortError') {
              console.log(1);
            }
          }
        });
      });
      describe('Imagen model', async () => {
        it('successfully generates images', async () => {
          const model = getTemplateImagenModel(testConfig.ai, {
            baseUrl: STAGING_URL
          });
          const { images } = await model.generateImages(
            `portrait-${templateBackendSuffix(
              testConfig.ai.backend.backendType
            )}`,
            { animal: 'Rhino' },
            { timeout: 100 }
          );
          expect(images.length).to.equal(2); // We ask for two images in the prompt template
        });
      });
    });
  });
});
