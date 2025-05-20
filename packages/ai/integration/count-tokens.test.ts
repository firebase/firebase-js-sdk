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

        expect(response.promptTokensDetails).to.not.be.null;
        expect(response.promptTokensDetails!.length).to.equal(1);
        expect(response.promptTokensDetails![0].modality).to.equal(
          Modality.TEXT
        );

        if (testConfig.ai.backend.backendType === BackendType.GOOGLE_AI) {
          expect(response.totalTokens).to.equal(7);
          expect(response.totalBillableCharacters).to.be.undefined;
          expect(response.promptTokensDetails![0].tokenCount).to.equal(7);
        } else if (testConfig.ai.backend.backendType === BackendType.VERTEX_AI) {
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
        console.log(JSON.stringify(response));

        if (testConfig.ai.backend.backendType === BackendType.GOOGLE_AI) {
          const expectedImageTokens = 259;

        } else if (testConfig.ai.backend.backendType === BackendType.VERTEX_AI) {
          const expectedImageTokens = 258;
          expect(response.totalTokens).to.equal(expectedImageTokens);
          expect(
            response.totalBillableCharacters,
          ).to.be.undefined; // Incorrect behavior
          expect(
            response.promptTokensDetails!.length,
          ).to.equal(1);
          expect(
            response.promptTokensDetails![0].modality,
          ).to.equal(Modality.IMAGE);
          expect(response.promptTokensDetails![0].tokenCount).to.equal(expectedImageTokens);
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
        console.log(JSON.stringify(response));
        // This may be different on Google AI
        expect(response.totalTokens).to.be.undefined;
        expect(
          response.totalBillableCharacters,
        ).to.be.undefined; // Incorrect behavior
        expect(
          response.promptTokensDetails!.length,
        ).to.equal(1);
        expect(
          response.promptTokensDetails![0].modality,
        ).to.equal(Modality.AUDIO);
        expect(response.promptTokensDetails![0].tokenCount).to.be.undefined;
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
        console.log(JSON.stringify(response));

        expect(response.totalTokens).to.equal(261);
        expect(
          response.totalBillableCharacters,
        ).to.equal('Describe these:'.length - 1); // For some reason it's the length-1

        expect(response.promptTokensDetails!.length).to.equal(3);

        const textDetails = response.promptTokensDetails!.find(
          d => d.modality === Modality.TEXT
        );
        const visionDetails = response.promptTokensDetails!.find(
          d => d.modality === Modality.IMAGE
        );
        const audioDetails = response.promptTokensDetails!.find(
          d => d.modality === Modality.AUDIO
        );

        expect(textDetails).to.deep.equal({
          modality: Modality.TEXT,
          tokenCount: 3
        });
        expect(visionDetails).to.deep.equal({
          modality: Modality.IMAGE,
          tokenCount: 258
        });
        expect(audioDetails).to.deep.equal({ modality: Modality.AUDIO }); // Incorrect behavior because there's no tokenCount
      });

      it('public storage reference', async () => {
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
        console.log(JSON.stringify(response));

        const expectedFileTokens = 258;
        expect(response.totalTokens).to.equal(expectedFileTokens);
        expect(response.totalBillableCharacters).to.be.undefined;
        expect(response.promptTokensDetails).to.not.be.null;
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
