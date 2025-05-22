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
  SafetySetting,
  getGenerativeModel
} from '../src';
import { testConfigs, TOKEN_COUNT_DELTA } from './constants';

describe('Chat Session', () => {
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

      it('startChat and sendMessage: text input, text output', async () => {
        const model = getGenerativeModel(testConfig.ai, {
          model: testConfig.model,
          generationConfig: commonGenerationConfig,
          safetySettings: commonSafetySettings,
          systemInstruction: commonSystemInstruction
        });

        const chat = model.startChat();
        const result1 = await chat.sendMessage(
          'What is the capital of France?'
        );
        const response1 = result1.response;
        expect(response1.text().trim().toLowerCase()).to.include('paris');

        let history = await chat.getHistory();
        expect(history.length).to.equal(2);
        expect(history[0].role).to.equal('user');
        expect(history[0].parts[0].text).to.equal(
          'What is the capital of France?'
        );
        expect(history[1].role).to.equal('model');
        expect(history[1].parts[0].text?.toLowerCase()).to.include('paris');

        expect(response1.usageMetadata).to.not.be.null;
        // Token counts can vary slightly in chat context
        expect(response1.usageMetadata!.promptTokenCount).to.be.closeTo(
          15, // "What is the capital of France?" + system instruction
          TOKEN_COUNT_DELTA + 2 // More variance for chat context
        );
        expect(response1.usageMetadata!.candidatesTokenCount).to.be.closeTo(
          8, // "Paris"
          TOKEN_COUNT_DELTA
        );
        expect(response1.usageMetadata!.totalTokenCount).to.be.closeTo(
          23, // "What is the capital of France?" + system instruction + "Paris"
          TOKEN_COUNT_DELTA + 3 // More variance for chat context
        );

        const result2 = await chat.sendMessage('And what about Italy?');
        const response2 = result2.response;
        expect(response2.text().trim().toLowerCase()).to.include('rome');

        history = await chat.getHistory();
        expect(history.length).to.equal(4);
        expect(history[2].role).to.equal('user');
        expect(history[2].parts[0].text).to.equal('And what about Italy?');
        expect(history[3].role).to.equal('model');
        expect(history[3].parts[0].text?.toLowerCase()).to.include('rome');

        expect(response2.usageMetadata).to.not.be.null;
        expect(response2.usageMetadata!.promptTokenCount).to.be.closeTo(
          28, // History + "And what about Italy?" + system instruction
          TOKEN_COUNT_DELTA + 5 // More variance for chat context with history
        );
        expect(response2.usageMetadata!.candidatesTokenCount).to.be.closeTo(
          8,
          TOKEN_COUNT_DELTA
        );
        expect(response2.usageMetadata!.totalTokenCount).to.be.closeTo(
          36,
          TOKEN_COUNT_DELTA
        );
      });
    });
  });
});