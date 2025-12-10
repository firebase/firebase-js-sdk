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
  Content,
  GenerationConfig,
  HarmBlockThreshold,
  HarmCategory,
  Language,
  Modality,
  Outcome,
  SafetySetting,
  URLRetrievalStatus,
  getGenerativeModel
} from '../src';
import { testConfigs } from './constants';

describe('Generate Content', function () {
  this.timeout(90_000); // gemini 3 requests take a long time, especially when using google search and url context.
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
          threshold: HarmBlockThreshold.BLOCK_NONE
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE
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

        if (model.model.includes('gemini-2.5-flash')) {
          expect(response.usageMetadata!.promptTokenCount).to.not.equal(0);
          expect(response.usageMetadata!.candidatesTokenCount).to.not.equal(0);
          expect(response.usageMetadata!.thoughtsTokenCount).to.not.equal(0);
          expect(response.usageMetadata!.totalTokenCount).to.not.equal(0);
          expect(response.usageMetadata!.promptTokensDetails).to.not.be.null;
          expect(response.usageMetadata!.promptTokensDetails!.length).to.equal(
            1
          );
          expect(
            response.usageMetadata!.promptTokensDetails![0].modality
          ).to.equal(Modality.TEXT);
          expect(
            response.usageMetadata!.promptTokensDetails![0].tokenCount
          ).to.not.equal(0);

          // candidatesTokenDetails comes back about half the time, so let's just not test it.
        } else if (model.model.includes('gemini-2.0-flash')) {
          expect(response.usageMetadata!.promptTokenCount).to.not.equal(0);
          expect(response.usageMetadata!.candidatesTokenCount).to.not.equal(0);
          expect(response.usageMetadata!.totalTokenCount).to.not.equal(0);
          expect(response.usageMetadata!.promptTokensDetails).to.not.be.null;
          expect(response.usageMetadata!.promptTokensDetails!.length).to.equal(
            1
          );
          expect(
            response.usageMetadata!.promptTokensDetails![0].modality
          ).to.equal(Modality.TEXT);
          expect(
            response.usageMetadata!.promptTokensDetails![0].tokenCount
          ).to.equal(21);
          expect(response.usageMetadata!.candidatesTokensDetails).to.not.be
            .null;
          expect(
            response.usageMetadata!.candidatesTokensDetails!.length
          ).to.equal(1);
          expect(
            response.usageMetadata!.candidatesTokensDetails![0].modality
          ).to.equal(Modality.TEXT);
          expect(
            response.usageMetadata!.candidatesTokensDetails![0].tokenCount
          ).to.not.equal(0);
        }
      });

      it('generateContent: google search grounding', async () => {
        const model = getGenerativeModel(testConfig.ai, {
          model: testConfig.model,
          generationConfig: commonGenerationConfig,
          safetySettings: commonSafetySettings,
          tools: [{ googleSearch: {} }]
        });

        const result = await model.generateContent(
          'What is the speed of light in a vaccuum in meters per second?'
        );
        const response = result.response;
        const trimmedText = response.text().trim();
        const groundingMetadata = response.candidates?.[0].groundingMetadata;
        expect(trimmedText).to.contain('299,792,458');
        expect(groundingMetadata).to.exist;
        expect(groundingMetadata!.searchEntryPoint?.renderedContent).to.contain(
          'div'
        );
        expect(
          groundingMetadata!.groundingChunks
        ).to.have.length.greaterThanOrEqual(1);
        groundingMetadata!.groundingChunks!.forEach(groundingChunk => {
          expect(groundingChunk.web).to.exist;
          expect(groundingChunk.web!.uri).to.exist;
        });
        expect(
          groundingMetadata?.groundingSupports
        ).to.have.length.greaterThanOrEqual(1);
        groundingMetadata!.groundingSupports!.forEach(groundingSupport => {
          expect(
            groundingSupport.groundingChunkIndices
          ).to.have.length.greaterThanOrEqual(1);
          expect(groundingSupport.segment).to.exist;
          expect(groundingSupport.segment?.endIndex).to.exist;
          expect(groundingSupport.segment?.text).to.exist;
          // Since partIndex and startIndex are commonly 0, they may be omitted from responses.
        });
        expect(groundingMetadata!.googleMapsWidgetContextToken).to.not.exist;
      });

      it('generateContent: google maps grounding prompt location', async () => {
        const model = getGenerativeModel(testConfig.ai, {
          model: testConfig.model,
          generationConfig: commonGenerationConfig,
          safetySettings: commonSafetySettings,
          tools: [{ googleMaps: {} }]
        });

        const result = await model.generateContent(
          'Where is a good place to grab a coffee near Arlington, MA?'
        );
        const response = result.response;
        const groundingMetadata = response.candidates?.[0].groundingMetadata;
        expect(groundingMetadata).to.exist;
        expect(
          groundingMetadata!.groundingChunks
        ).to.have.length.greaterThanOrEqual(1);
        groundingMetadata!.groundingChunks!.forEach(groundingChunk => {
          expect(groundingChunk.maps).to.exist;
          expect(groundingChunk.maps!.uri).to.exist;
          expect(groundingChunk.maps!.title).to.exist;
          expect(groundingChunk.maps!.placeId).to.exist;
        });
        expect(
          groundingMetadata?.groundingSupports
        ).to.have.length.greaterThanOrEqual(1);
        groundingMetadata!.groundingSupports!.forEach(groundingSupport => {
          expect(
            groundingSupport.groundingChunkIndices
          ).to.have.length.greaterThanOrEqual(1);
          expect(groundingSupport.segment).to.exist;
          expect(groundingSupport.segment?.endIndex).to.exist;
          expect(groundingSupport.segment?.text).to.exist;
        });
        expect(groundingMetadata!.googleMapsWidgetContextToken).to.not.exist;
      });

      it('generateContent: google maps grounding prompt location enableWidget true', async () => {
        const model = getGenerativeModel(testConfig.ai, {
          model: testConfig.model,
          generationConfig: commonGenerationConfig,
          safetySettings: commonSafetySettings,
          tools: [{ googleMaps: { enableWidget: true } }]
        });

        const result = await model.generateContent(
          'Where is a good place to grab a coffee near Arlington, MA?'
          //'Where is the closest starbucks?'
        );
        const response = result.response;
        const groundingMetadata = response.candidates?.[0].groundingMetadata;
        expect(groundingMetadata).to.exist;
        expect(
          groundingMetadata!.groundingChunks
        ).to.have.length.greaterThanOrEqual(1);
        groundingMetadata!.groundingChunks!.forEach(groundingChunk => {
          expect(groundingChunk.maps).to.exist;
          expect(groundingChunk.maps!.uri).to.exist;
          expect(groundingChunk.maps!.title).to.exist;
          expect(groundingChunk.maps!.placeId).to.exist;
        });
        expect(
          groundingMetadata?.groundingSupports
        ).to.have.length.greaterThanOrEqual(1);
        groundingMetadata!.groundingSupports!.forEach(groundingSupport => {
          expect(
            groundingSupport.groundingChunkIndices
          ).to.have.length.greaterThanOrEqual(1);
          expect(groundingSupport.segment).to.exist;
          expect(groundingSupport.segment?.endIndex).to.exist;
          expect(groundingSupport.segment?.text).to.exist;
        });
        expect(groundingMetadata!.googleMapsWidgetContextToken).to.exist;
      });

      it('generateContent: google maps grounding prompt location enableWidget false', async () => {
        const model = getGenerativeModel(testConfig.ai, {
          model: testConfig.model,
          generationConfig: commonGenerationConfig,
          safetySettings: commonSafetySettings,
          tools: [{ googleMaps: { enableWidget: false } }]
        });

        const result = await model.generateContent(
          'Where is a good place to grab a coffee near Arlington, MA?'
          //'Where is the closest starbucks?'
        );
        const response = result.response;
        const groundingMetadata = response.candidates?.[0].groundingMetadata;
        expect(groundingMetadata).to.exist;
        expect(
          groundingMetadata!.groundingChunks
        ).to.have.length.greaterThanOrEqual(1);
        groundingMetadata!.groundingChunks!.forEach(groundingChunk => {
          expect(groundingChunk.maps).to.exist;
          expect(groundingChunk.maps!.uri).to.exist;
          expect(groundingChunk.maps!.title).to.exist;
          expect(groundingChunk.maps!.placeId).to.exist;
        });
        expect(
          groundingMetadata?.groundingSupports
        ).to.have.length.greaterThanOrEqual(1);
        groundingMetadata!.groundingSupports!.forEach(groundingSupport => {
          expect(
            groundingSupport.groundingChunkIndices
          ).to.have.length.greaterThanOrEqual(1);
          expect(groundingSupport.segment).to.exist;
          expect(groundingSupport.segment?.endIndex).to.exist;
          expect(groundingSupport.segment?.text).to.exist;
        });
        expect(groundingMetadata!.googleMapsWidgetContextToken).to.not.exist;
      });

      it('generateContent: google maps grounding with lat long', async () => {
        const model = getGenerativeModel(testConfig.ai, {
          model: testConfig.model,
          generationConfig: commonGenerationConfig,
          safetySettings: commonSafetySettings,
          tools: [{ googleMaps: {} }],
          toolConfig: {
            retrievalConfig: {
              latLng: {
                latitude: 42.4154,
                longitude: 71.1565
              }
            }
          }
        });

        const result = await model.generateContent(
          'Where is a good place to grab a coffee near here?'
          //'Where is the closest starbucks?'
        );
        const response = result.response;
        const groundingMetadata = response.candidates?.[0].groundingMetadata;
        expect(groundingMetadata).to.exist;
        expect(
          groundingMetadata!.groundingChunks
        ).to.have.length.greaterThanOrEqual(1);
        groundingMetadata!.groundingChunks!.forEach(groundingChunk => {
          expect(groundingChunk.maps).to.exist;
          expect(groundingChunk.maps!.uri).to.exist;
          expect(groundingChunk.maps!.title).to.exist;
          expect(groundingChunk.maps!.placeId).to.exist;
        });
        expect(
          groundingMetadata?.groundingSupports
        ).to.have.length.greaterThanOrEqual(1);
        groundingMetadata!.groundingSupports!.forEach(groundingSupport => {
          expect(
            groundingSupport.groundingChunkIndices
          ).to.have.length.greaterThanOrEqual(1);
          expect(groundingSupport.segment).to.exist;
          expect(groundingSupport.segment?.endIndex).to.exist;
          expect(groundingSupport.segment?.text).to.exist;
        });
        expect(groundingMetadata!.googleMapsWidgetContextToken).to.not.exist;
      });

      it('generateContent: google maps grounding with lat long enableWidget true', async () => {
        const model = getGenerativeModel(testConfig.ai, {
          model: testConfig.model,
          generationConfig: commonGenerationConfig,
          safetySettings: commonSafetySettings,
          tools: [{ googleMaps: { enableWidget: true } }],
          toolConfig: {
            retrievalConfig: {
              latLng: {
                latitude: 42.4154,
                longitude: 71.1565
              }
            }
          }
        });

        const result = await model.generateContent(
          'Where is a good place to grab a coffee near here?'
          //'Where is the closest starbucks?'
        );
        const response = result.response;
        const groundingMetadata = response.candidates?.[0].groundingMetadata;
        expect(groundingMetadata).to.exist;
        expect(
          groundingMetadata!.groundingChunks
        ).to.have.length.greaterThanOrEqual(1);
        groundingMetadata!.groundingChunks!.forEach(groundingChunk => {
          expect(groundingChunk.maps).to.exist;
          expect(groundingChunk.maps!.uri).to.exist;
          expect(groundingChunk.maps!.title).to.exist;
          expect(groundingChunk.maps!.placeId).to.exist;
        });
        expect(
          groundingMetadata?.groundingSupports
        ).to.have.length.greaterThanOrEqual(1);
        groundingMetadata!.groundingSupports!.forEach(groundingSupport => {
          expect(
            groundingSupport.groundingChunkIndices
          ).to.have.length.greaterThanOrEqual(1);
          expect(groundingSupport.segment).to.exist;
          expect(groundingSupport.segment?.endIndex).to.exist;
          expect(groundingSupport.segment?.text).to.exist;
        });
        expect(groundingMetadata!.googleMapsWidgetContextToken).to.exist;
      });

      describe('URL Context', async () => {
        // URL Context is not supported in Google AI for gemini-2.0-flash
        if (
          ['gemini-2.0-flash-001', 'gemini-2.0-flash-lite-001'].includes(
            testConfig.model
          ) // Models that don't support URL Context
        ) {
          return;
        }

        it('generateContent: url context', async () => {
          const model = getGenerativeModel(testConfig.ai, {
            model: testConfig.model,
            generationConfig: commonGenerationConfig,
            safetySettings: commonSafetySettings,
            tools: [{ urlContext: {} }]
          });

          const result = await model.generateContent(
            'Summarize this website https://berkshirehathaway.com'
          );
          const response = result.response;
          const urlContextMetadata =
            response.candidates?.[0].urlContextMetadata;
          expect(urlContextMetadata?.urlMetadata).to.exist;
          expect(
            urlContextMetadata?.urlMetadata.length
          ).to.be.greaterThanOrEqual(1);
          expect(urlContextMetadata?.urlMetadata[0].retrievedUrl).to.exist;
          expect(urlContextMetadata?.urlMetadata[0].retrievedUrl).to.equal(
            'https://berkshirehathaway.com'
          );
          expect(
            urlContextMetadata?.urlMetadata[0].urlRetrievalStatus
          ).to.equal(URLRetrievalStatus.URL_RETRIEVAL_STATUS_SUCCESS);

          const usageMetadata = response.usageMetadata;
          expect(usageMetadata).to.exist;
          // usageMetaData.toolUsePromptTokenCount does not exist in Gemini 2.0 flash responses.
          if (!model.model.includes('gemini-2.0-flash')) {
            expect(usageMetadata?.toolUsePromptTokenCount).to.exist;
            expect(usageMetadata?.toolUsePromptTokenCount).to.be.greaterThan(0);
          }
        });

        it('generateContent: url context and google search grounding', async () => {
          const model = getGenerativeModel(testConfig.ai, {
            model: testConfig.model,
            generationConfig: commonGenerationConfig,
            safetySettings: commonSafetySettings,
            tools: [{ urlContext: {} }, { googleSearch: {} }]
          });

          const result = await model.generateContent(
            'According to https://info.cern.ch/hypertext/WWW/TheProject.html, what is the WorldWideWeb? Search the web for other definitions.'
          );
          const response = result.response;
          const trimmedText = response.text().trim();
          const urlContextMetadata =
            response.candidates?.[0].urlContextMetadata;
          const groundingMetadata = response.candidates?.[0].groundingMetadata;
          expect(trimmedText.length).to.be.greaterThan(0);
          expect(urlContextMetadata?.urlMetadata).to.exist;
          expect(
            urlContextMetadata?.urlMetadata.length
          ).to.be.greaterThanOrEqual(1);
          expect(urlContextMetadata?.urlMetadata[0].retrievedUrl).to.exist;
          expect(urlContextMetadata?.urlMetadata[0].retrievedUrl).to.equal(
            'https://info.cern.ch/hypertext/WWW/TheProject.html'
          );
          expect(
            urlContextMetadata?.urlMetadata[0].urlRetrievalStatus
          ).to.equal(URLRetrievalStatus.URL_RETRIEVAL_STATUS_SUCCESS);
          expect(groundingMetadata).to.exist;
          expect(groundingMetadata?.groundingChunks).to.exist;
          expect(
            groundingMetadata?.groundingChunks!.length
          ).to.be.greaterThanOrEqual(1);
          expect(
            groundingMetadata?.groundingSupports!.length
          ).to.be.greaterThanOrEqual(1);

          const usageMetadata = response.usageMetadata;
          expect(usageMetadata).to.exist;
          expect(usageMetadata?.toolUsePromptTokenCount).to.exist;
          expect(usageMetadata?.toolUsePromptTokenCount).to.be.greaterThan(0);
        });

        it('generateContent: url context and google search grounding without URLs in prompt', async () => {
          const model = getGenerativeModel(testConfig.ai, {
            model: testConfig.model,
            generationConfig: commonGenerationConfig,
            safetySettings: commonSafetySettings,
            tools: [{ urlContext: {} }, { googleSearch: {} }]
          });

          const result = await model.generateContent(
            'Recommend 3 books for beginners to read to learn more about the latest advancements in Quantum Computing'
          );
          const response = result.response;
          const urlContextMetadata =
            response.candidates?.[0].urlContextMetadata;
          const groundingMetadata = response.candidates?.[0].groundingMetadata;
          if (testConfig.ai.backend.backendType === BackendType.GOOGLE_AI) {
            expect(urlContextMetadata?.urlMetadata).to.exist;
            expect(
              urlContextMetadata?.urlMetadata.length
            ).to.be.greaterThanOrEqual(1);
            expect(urlContextMetadata?.urlMetadata[0].retrievedUrl).to.exist;
            expect(
              urlContextMetadata?.urlMetadata[0].urlRetrievalStatus
            ).to.equal(URLRetrievalStatus.URL_RETRIEVAL_STATUS_SUCCESS);
            expect(groundingMetadata).to.exist;
            expect(groundingMetadata?.groundingChunks).to.exist;

            const usageMetadata = response.usageMetadata;
            expect(usageMetadata).to.exist;
            expect(usageMetadata?.toolUsePromptTokenCount).to.exist;
            expect(usageMetadata?.toolUsePromptTokenCount).to.be.greaterThan(0);
          } else {
            // URL Context does not integrate with Google Search Grounding in Vertex AI
            expect(urlContextMetadata?.urlMetadata).to.not.exist;
            expect(groundingMetadata).to.exist;
            expect(groundingMetadata?.groundingChunks).to.exist;
          }
        });
      });

      it('generateContent: code execution', async () => {
        if (testConfig.model === 'gemini-2.0-flash-lite-001') {
          // This model does not support code execution
          return;
        }
        const model = getGenerativeModel(testConfig.ai, {
          model: testConfig.model,
          generationConfig: commonGenerationConfig,
          safetySettings: commonSafetySettings,
          tools: [{ codeExecution: {} }]
        });
        const prompt =
          'What is the sum of the first 50 prime numbers? ' +
          'Generate and run code for the calculation, and make sure you get all 50.';

        const result = await model.generateContent(prompt);
        const parts = result.response.candidates?.[0].content.parts;
        expect(
          parts?.some(part => part.executableCode?.language === Language.PYTHON)
        ).to.be.true;
        expect(
          parts?.some(part => part.codeExecutionResult?.outcome === Outcome.OK)
        ).to.be.true;
        // Expect these to be truthy (!= null)
        expect(parts?.some(part => part.executableCode?.code != null)).to.be
          .true;
        expect(parts?.some(part => part.codeExecutionResult?.output != null)).to
          .be.true;
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
