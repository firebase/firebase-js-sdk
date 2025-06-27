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
  HarmBlockMethod,
  HarmBlockThreshold,
  HarmCategory,
  Modality,
  SafetySetting,
  getGenerativeModel,
  Part,
  CountTokensRequest,
  InlineDataPart,
  FileDataPart,
  BackendType
} from '../src';
import {
  AUDIO_MIME_TYPE,
  IMAGE_MIME_TYPE,
  TINY_IMG_BASE64,
  TINY_MP3_BASE64,
  testConfigs
} from './constants';
import { FIREBASE_CONFIG } from './firebase-config';

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

        expect(response.promptTokensDetails).to.exist;
        expect(response.promptTokensDetails!.length).to.equal(1);
        expect(response.promptTokensDetails![0].modality).to.equal(
          Modality.TEXT
        );
        if (testConfig.ai.backend.backendType === BackendType.GOOGLE_AI) {
          expect(response.totalTokens).to.equal(7);
          expect(response.totalBillableCharacters).to.be.undefined;
          expect(response.promptTokensDetails![0].tokenCount).to.equal(7);
        } else if (
          testConfig.ai.backend.backendType === BackendType.VERTEX_AI
        ) {
          expect(response.totalTokens).to.equal(6);
          expect(response.totalBillableCharacters).to.equal(16);
          expect(response.promptTokensDetails![0].tokenCount).to.equal(6);
        }
      });

      it('image input', async () => {
        const model = getGenerativeModel(testConfig.ai, {
          model: testConfig.model
        });
        const imagePart: Part = {
          inlineData: {
            mimeType: IMAGE_MIME_TYPE,
            data: TINY_IMG_BASE64
          }
        };
        const response = await model.countTokens([imagePart]);

        if (testConfig.ai.backend.backendType === BackendType.GOOGLE_AI) {
          const expectedImageTokens = 259;
          expect(response.totalTokens).to.equal(expectedImageTokens);
          expect(response.totalBillableCharacters).to.be.undefined; // Incorrect behavior
          expect(response.promptTokensDetails!.length).to.equal(2);
          expect(response.promptTokensDetails![0]).to.deep.equal({
            modality: Modality.TEXT, // Note: 1 unexpected text token observed for Google AI with image-only input.
            tokenCount: 1
          });
          expect(response.promptTokensDetails![1]).to.deep.equal({
            modality: Modality.IMAGE,
            tokenCount: 258
          });
        } else if (
          testConfig.ai.backend.backendType === BackendType.VERTEX_AI
        ) {
          const expectedImageTokens = 258;
          expect(response.totalTokens).to.equal(expectedImageTokens);
          expect(response.totalBillableCharacters).to.be.undefined; // Incorrect behavior
          expect(response.promptTokensDetails!.length).to.equal(1);
          // Note: No text tokens are present for Vertex AI with image-only input.
          expect(response.promptTokensDetails![0]).to.deep.equal({
            modality: Modality.IMAGE,
            tokenCount: 258
          });
          expect(response.promptTokensDetails![0].tokenCount).to.equal(
            expectedImageTokens
          );
        }
      });

      it('audio input', async () => {
        const model = getGenerativeModel(testConfig.ai, {
          model: testConfig.model
        });
        const audioPart: InlineDataPart = {
          inlineData: {
            mimeType: AUDIO_MIME_TYPE,
            data: TINY_MP3_BASE64
          }
        };

        const response = await model.countTokens([audioPart]);

        expect(response.promptTokensDetails).to.exist;
        const textDetails = response.promptTokensDetails!.find(
          d => d.modality === Modality.TEXT
        );
        const audioDetails = response.promptTokensDetails!.find(
          d => d.modality === Modality.AUDIO
        );

        if (testConfig.ai.backend.backendType === BackendType.GOOGLE_AI) {
          expect(response.totalTokens).to.equal(6);
          expect(response.promptTokensDetails!.length).to.equal(2);
          expect(textDetails).to.deep.equal({
            modality: Modality.TEXT,
            tokenCount: 1
          });
          expect(audioDetails).to.deep.equal({
            modality: Modality.AUDIO,
            tokenCount: 5
          });
        } else if (
          testConfig.ai.backend.backendType === BackendType.VERTEX_AI
        ) {
          expect(response.totalTokens).to.be.undefined;
          expect(response.promptTokensDetails!.length).to.equal(1); // Note: Text modality details absent for Vertex AI with audio-only input.
          expect(audioDetails).to.deep.equal({ modality: Modality.AUDIO }); // Note: Audio tokenCount is undefined for Vertex AI with audio-only input.
        }

        expect(response.totalBillableCharacters).to.be.undefined; // Incorrect behavior
      });

      it('text, image, and audio input', async () => {
        const model = getGenerativeModel(testConfig.ai, {
          model: testConfig.model
        });
        const textPart: Part = { text: 'Describe these:' };
        const imagePart: Part = {
          inlineData: { mimeType: IMAGE_MIME_TYPE, data: TINY_IMG_BASE64 }
        };
        const audioPart: Part = {
          inlineData: { mimeType: AUDIO_MIME_TYPE, data: TINY_MP3_BASE64 }
        };

        const request: CountTokensRequest = {
          contents: [{ role: 'user', parts: [textPart, imagePart, audioPart] }]
        };
        const response = await model.countTokens(request);
        const textDetails = response.promptTokensDetails!.find(
          d => d.modality === Modality.TEXT
        );
        const imageDetails = response.promptTokensDetails!.find(
          d => d.modality === Modality.IMAGE
        );
        const audioDetails = response.promptTokensDetails!.find(
          d => d.modality === Modality.AUDIO
        );
        expect(response.promptTokensDetails).to.exist;
        expect(response.promptTokensDetails!.length).to.equal(3);

        expect(imageDetails).to.deep.equal({
          modality: Modality.IMAGE,
          tokenCount: 258
        });

        if (testConfig.ai.backend.backendType === BackendType.GOOGLE_AI) {
          expect(response.totalTokens).to.equal(267);
          expect(response.totalBillableCharacters).to.be.undefined;
          expect(textDetails).to.deep.equal({
            modality: Modality.TEXT,
            tokenCount: 4
          });
          expect(audioDetails).to.deep.equal({
            modality: Modality.AUDIO,
            tokenCount: 5
          });
        } else if (
          testConfig.ai.backend.backendType === BackendType.VERTEX_AI
        ) {
          expect(response.totalTokens).to.equal(261);
          expect(textDetails).to.deep.equal({
            modality: Modality.TEXT,
            tokenCount: 3
          });
          const expectedText = 'Describe these:';
          expect(response.totalBillableCharacters).to.equal(
            expectedText.length - 1
          ); // Note: BillableCharacters observed as (text length - 1) for Vertex AI.
          expect(audioDetails).to.deep.equal({ modality: Modality.AUDIO }); // Incorrect behavior because there's no tokenCount
        }
      });

      it('public storage reference', async () => {
        // This test is not expected to pass when using Google AI.
        if (testConfig.ai.backend.backendType === BackendType.GOOGLE_AI) {
          return;
        }
        const model = getGenerativeModel(testConfig.ai, {
          model: testConfig.model
        });
        const filePart: FileDataPart = {
          fileData: {
            mimeType: IMAGE_MIME_TYPE,
            fileUri: `gs://${FIREBASE_CONFIG.storageBucket}/images/tree.png`
          }
        };

        const response = await model.countTokens([filePart]);

        const expectedFileTokens = 258;
        expect(response.totalTokens).to.equal(expectedFileTokens);
        expect(response.totalBillableCharacters).to.be.undefined;
        expect(response.promptTokensDetails).to.exist;
        expect(response.promptTokensDetails!.length).to.equal(1);
        expect(response.promptTokensDetails![0].modality).to.equal(
          Modality.IMAGE
        );
        expect(response.promptTokensDetails![0].tokenCount).to.equal(
          expectedFileTokens
        );
      });
    });
  });
});
