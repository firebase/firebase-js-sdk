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
  Content,
  GenerationConfig,
  HarmBlockThreshold,
  HarmCategory,
  Modality,
  SafetySetting,
  getGenerativeModel
} from '../src';
import { testConfigs, TOKEN_COUNT_DELTA } from './constants';

describe('Generate Content', () => {
  testConfigs.forEach(testConfig => {
    describe(`${testConfig.toString()}`, () => {
      const commonGenerationConfig: GenerationConfig = {
        temperature: 0,
        topP: 0,
        responseMimeType: 'text/plain'
      };

      const commonSafetySettings: SafetySetting[] = [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE
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

      const commonSystemInstruction: Content = {
        role: 'system',
        parts: [
          {
            text: 'You are a friendly and helpful assistant.'
          }
        ]
      };

      it('generateContent: text input, text output', async () => {
        const model = getGenerativeModel(testConfig.ai, {
          model: testConfig.model,
          generationConfig: commonGenerationConfig,
          safetySettings: commonSafetySettings,
          systemInstruction: commonSystemInstruction
        });

        const result = await model.generateContent(
          'Where is Google headquarters located? Answer with the city name only.'
        );
        const response = result.response;

        const trimmedText = response.text().trim();
        expect(trimmedText).to.equal('Mountain View');

        expect(response.usageMetadata).to.not.be.null;
        expect(response.usageMetadata!.promptTokenCount).to.be.closeTo(
          21,
          TOKEN_COUNT_DELTA
        );
        expect(response.usageMetadata!.candidatesTokenCount).to.be.closeTo(
          4,
          TOKEN_COUNT_DELTA
        );
        expect(response.usageMetadata!.totalTokenCount).to.be.closeTo(
          25,
          TOKEN_COUNT_DELTA * 2
        );
        expect(response.usageMetadata!.promptTokensDetails).to.not.be.null;
        expect(response.usageMetadata!.promptTokensDetails!.length).to.equal(1);
        expect(
          response.usageMetadata!.promptTokensDetails![0].modality
        ).to.equal(Modality.TEXT);
        expect(
          response.usageMetadata!.promptTokensDetails![0].tokenCount
        ).to.equal(21);
        expect(response.usageMetadata!.candidatesTokensDetails).to.not.be.null;
        expect(
          response.usageMetadata!.candidatesTokensDetails!.length
        ).to.equal(1);
        expect(
          response.usageMetadata!.candidatesTokensDetails![0].modality
        ).to.equal(Modality.TEXT);
        expect(
          response.usageMetadata!.candidatesTokensDetails![0].tokenCount
        ).to.be.closeTo(4, TOKEN_COUNT_DELTA);
      });

      it('generateContentStream: text input, text output', async () => {
        const model = getGenerativeModel(testConfig.ai, {
          model: testConfig.model,
          generationConfig: commonGenerationConfig,
          safetySettings: commonSafetySettings,
          systemInstruction: commonSystemInstruction
        });

        const result = await model.generateContentStream(
          'Where is Google headquarters located? Answer with the city name only.'
        );

        let streamText = '';
        for await (const chunk of result.stream) {
          streamText += chunk.text();
        }
        expect(streamText.trim()).to.equal('Mountain View');

        const response = await result.response;
        const trimmedText = response.text().trim();
        expect(trimmedText).to.equal('Mountain View');
        expect(response.usageMetadata).to.be.undefined; // Note: This is incorrect behavior.
      });
    });
  });
});
