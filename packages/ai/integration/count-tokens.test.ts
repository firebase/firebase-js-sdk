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
import { Content, GenerationConfig, HarmBlockMethod, HarmBlockThreshold, HarmCategory, Modality, SafetySetting, getAI, getGenerativeModel, getVertexAI } from '../src';
import {
  testConfigs
} from './constants';

describe('Count Tokens', () => {
  testConfigs.forEach(testConfig => {
    describe(`${testConfig.toString()}`, () => {

      it('text input', async () => {
        const generationConfig: GenerationConfig = {
          temperature: 0,
          topP: 0,
          responseMimeType: 'text/plain'
        };

        const safetySettings: SafetySetting[] = [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
            method: HarmBlockMethod.PROBABILITY
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
            method: HarmBlockMethod.SEVERITY
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE
          }
        ];

        const systemInstruction: Content = {
          role: 'system',
          parts: [
            {
              text: 'You are a friendly and helpful assistant.'
            }
          ]
        };
        const model = getGenerativeModel(testConfig.ai, {
          model: testConfig.model,
          generationConfig,
          systemInstruction,
          safetySettings
        });

        const response = await model.countTokens('Why is the sky blue?');

        expect(response.totalTokens).to.equal(6);
        expect(response.totalBillableCharacters).to.equal(16);
        expect(response.promptTokensDetails).to.not.be.null;
        expect(response.promptTokensDetails!.length).to.equal(1);
        expect(response.promptTokensDetails![0].modality).to.equal(Modality.TEXT);
        expect(response.promptTokensDetails![0].tokenCount).to.equal(6);
      });
      it('image input', async () => {

      })
      it('audio input', async () => {

      })
      it('text, image, and audio input', async () => {

      })
      it('public storage reference', async () => {

      })
      it('private storage reference', async () => {

      })
      it('schema', async () => {

      })
      // TODO (dlarocque): Test countTokens() with the following:
      // - inline data
      // - public storage reference
      // - private storage reference (testing auth integration)
      // - count tokens
      // - JSON schema
    });
  })
});
