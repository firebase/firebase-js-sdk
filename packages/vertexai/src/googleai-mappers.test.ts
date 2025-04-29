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
import sinon, { restore, stub } from 'sinon';
import sinonChai from 'sinon-chai';
import {
  mapCountTokensRequest,
  mapGenerateContentCandidates,
  mapGenerateContentRequest,
  mapGenerateContentResponse,
  mapPromptFeedback
} from './googleai-mappers';
import {
  BlockReason,
  Content,
  CountTokensRequest,
  GenerateContentRequest,
  HarmBlockMethod,
  HarmBlockThreshold,
  HarmCategory,
  HarmProbability,
  HarmSeverity,
  SafetyRating,
  AIErrorCode,
  FinishReason,
  PromptFeedback
} from './types';
import {
  GoogleAIGenerateContentResponse,
  GoogleAIGenerateContentCandidate,
  GoogleAICountTokensRequest
} from './types/googleai';
import { logger } from './logger';
import { AIError } from './errors';
import { getMockResponse } from '../test-utils/mock-response';

use(sinonChai);

const fakeModel = 'models/gemini-pro';

const fakeContents: Content[] = [{ role: 'user', parts: [{ text: 'hello' }] }];

describe('Google AI Mappers', () => {
  let loggerWarnStub: sinon.SinonStub;

  beforeEach(() => {
    loggerWarnStub = stub(logger, 'warn');
  });

  afterEach(() => {
    restore();
  });

  describe('mapGenerateContentRequest', () => {
    it('should throw if safetySettings contain method', () => {
      const request: GenerateContentRequest = {
        contents: fakeContents,
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
            method: HarmBlockMethod.SEVERITY
          }
        ]
      };
      expect(() => mapGenerateContentRequest(request))
        .to.throw(AIError, /SafetySetting.method is not supported/i)
        .with.property('code', AIErrorCode.UNSUPPORTED);
    });

    it('should warn and round topK if present', () => {
      const request: GenerateContentRequest = {
        contents: fakeContents,
        generationConfig: {
          topK: 15.7
        }
      };
      const mappedRequest = mapGenerateContentRequest(request);
      expect(loggerWarnStub).to.have.been.calledOnceWith(
        'topK in GenerationConfig has been rounded to the nearest integer to match the format for Google AI requests.'
      );
      expect(mappedRequest.generationConfig?.topK).to.equal(16);
    });

    it('should not modify topK if it is already an integer', () => {
      const request: GenerateContentRequest = {
        contents: fakeContents,
        generationConfig: {
          topK: 16
        }
      };
      const mappedRequest = mapGenerateContentRequest(request);
      expect(loggerWarnStub).to.not.have.been.called;
      expect(mappedRequest.generationConfig?.topK).to.equal(16);
    });

    it('should return the request mostly unchanged if valid', () => {
      const request: GenerateContentRequest = {
        contents: fakeContents,
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
          }
        ],
        generationConfig: {
          temperature: 0.5
        }
      };
      const mappedRequest = mapGenerateContentRequest({ ...request });
      expect(mappedRequest).to.deep.equal(request);
      expect(loggerWarnStub).to.not.have.been.called;
    });
  });

  describe('mapGenerateContentResponse', () => {
    it('should map a full Google AI response', async () => {
      const googleAIMockResponse: GoogleAIGenerateContentResponse = await (
        getMockResponse('googleAI', 'unary-success-citations.json') as Response
      ).json();
      const mappedResponse = mapGenerateContentResponse(googleAIMockResponse);

      expect(mappedResponse.candidates).to.exist;
      expect(mappedResponse.candidates?.[0].content.parts[0].text).to.contain(
        'quantum mechanics'
      );

      // Mapped citations
      expect(
        mappedResponse.candidates?.[0].citationMetadata?.citations[0].startIndex
      ).to.equal(
        googleAIMockResponse.candidates?.[0].citationMetadata
          ?.citationSources[0].startIndex
      );
      expect(
        mappedResponse.candidates?.[0].citationMetadata?.citations[0].endIndex
      ).to.equal(
        googleAIMockResponse.candidates?.[0].citationMetadata
          ?.citationSources[0].endIndex
      );

      // Mapped safety ratings
      expect(
        mappedResponse.candidates?.[0].safetyRatings?.[0].probabilityScore
      ).to.equal(0);
      expect(
        mappedResponse.candidates?.[0].safetyRatings?.[0].severityScore
      ).to.equal(0);
      expect(
        mappedResponse.candidates?.[0].safetyRatings?.[0].severity
      ).to.equal(HarmSeverity.HARM_SEVERITY_UNSUPPORTED);

      expect(mappedResponse.candidates?.[0].finishReason).to.equal(
        FinishReason.STOP
      );

      // Check usage metadata passthrough
      expect(mappedResponse.usageMetadata).to.deep.equal(
        googleAIMockResponse.usageMetadata
      );
    });

    it('should handle missing candidates and promptFeedback', () => {
      const googleAIResponse: GoogleAIGenerateContentResponse = {
        // No candidates
        // No promptFeedback
        usageMetadata: {
          promptTokenCount: 5,
          candidatesTokenCount: 0,
          totalTokenCount: 5
        }
      };
      const mappedResponse = mapGenerateContentResponse(googleAIResponse);
      expect(mappedResponse.candidates).to.be.undefined;
      expect(mappedResponse.promptFeedback).to.be.undefined; // Mapped to undefined
      expect(mappedResponse.usageMetadata).to.deep.equal(
        googleAIResponse.usageMetadata
      );
    });

    it('should handle empty candidates array', () => {
      const googleAIResponse: GoogleAIGenerateContentResponse = {
        candidates: [],
        usageMetadata: {
          promptTokenCount: 5,
          candidatesTokenCount: 0,
          totalTokenCount: 5
        }
      };
      const mappedResponse = mapGenerateContentResponse(googleAIResponse);
      expect(mappedResponse.candidates).to.deep.equal([]);
      expect(mappedResponse.promptFeedback).to.be.undefined;
      expect(mappedResponse.usageMetadata).to.deep.equal(
        googleAIResponse.usageMetadata
      );
    });
  });

  describe('mapCountTokensRequest', () => {
    it('should map a Vertex AI CountTokensRequest to Google AI format', () => {
      const vertexRequest: CountTokensRequest = {
        contents: fakeContents,
        systemInstruction: { role: 'system', parts: [{ text: 'Be nice' }] },
        tools: [
          { functionDeclarations: [{ name: 'foo', description: 'bar' }] }
        ],
        generationConfig: { temperature: 0.8 }
      };

      const expectedGoogleAIRequest: GoogleAICountTokensRequest = {
        generateContentRequest: {
          model: fakeModel,
          contents: vertexRequest.contents,
          systemInstruction: vertexRequest.systemInstruction,
          tools: vertexRequest.tools,
          generationConfig: vertexRequest.generationConfig
        }
      };

      const mappedRequest = mapCountTokensRequest(vertexRequest, fakeModel);
      expect(mappedRequest).to.deep.equal(expectedGoogleAIRequest);
    });

    it('should map a minimal Vertex AI CountTokensRequest', () => {
      const vertexRequest: CountTokensRequest = {
        contents: fakeContents,
        systemInstruction: { role: 'system', parts: [{ text: 'Be nice' }] },
        generationConfig: { temperature: 0.8 }
      };

      const expectedGoogleAIRequest: GoogleAICountTokensRequest = {
        generateContentRequest: {
          model: fakeModel,
          contents: vertexRequest.contents,
          systemInstruction: { role: 'system', parts: [{ text: 'Be nice' }] },
          generationConfig: { temperature: 0.8 }
        }
      };

      const mappedRequest = mapCountTokensRequest(vertexRequest, fakeModel);
      expect(mappedRequest).to.deep.equal(expectedGoogleAIRequest);
    });
  });

  describe('mapGenerateContentCandidates', () => {
    it('should map citationSources to citationMetadata.citations', () => {
      const candidates: GoogleAIGenerateContentCandidate[] = [
        {
          index: 0,
          content: { role: 'model', parts: [{ text: 'Cited text' }] },
          citationMetadata: {
            citationSources: [
              { startIndex: 0, endIndex: 5, uri: 'uri1', license: 'MIT' },
              { startIndex: 6, endIndex: 10, uri: 'uri2' }
            ]
          }
        }
      ];
      const mapped = mapGenerateContentCandidates(candidates);
      expect(mapped[0].citationMetadata).to.exist;
      expect(mapped[0].citationMetadata?.citations).to.deep.equal(
        candidates[0].citationMetadata?.citationSources
      );
      expect(mapped[0].citationMetadata?.citations[0].title).to.be.undefined; // Not in Google AI
      expect(mapped[0].citationMetadata?.citations[0].publicationDate).to.be
        .undefined; // Not in Google AI
    });

    it('should add default safety rating properties', () => {
      const candidates: GoogleAIGenerateContentCandidate[] = [
        {
          index: 0,
          content: { role: 'model', parts: [{ text: 'Maybe unsafe' }] },
          safetyRatings: [
            {
              category: HarmCategory.HARM_CATEGORY_HARASSMENT,
              probability: HarmProbability.MEDIUM,
              blocked: false
              // Missing severity, probabilityScore, severityScore
            } as any
          ]
        }
      ];
      const mapped = mapGenerateContentCandidates(candidates);
      expect(mapped[0].safetyRatings).to.exist;
      const safetyRating = mapped[0].safetyRatings?.[0] as SafetyRating; // Type assertion
      expect(safetyRating.severity).to.equal(
        HarmSeverity.HARM_SEVERITY_UNSUPPORTED
      );
      expect(safetyRating.probabilityScore).to.equal(0);
      expect(safetyRating.severityScore).to.equal(0);
      // Existing properties should be preserved
      expect(safetyRating.category).to.equal(
        HarmCategory.HARM_CATEGORY_HARASSMENT
      );
      expect(safetyRating.probability).to.equal(HarmProbability.MEDIUM);
      expect(safetyRating.blocked).to.be.false;
    });

    it('should throw if videoMetadata is present in parts', () => {
      const candidates: GoogleAIGenerateContentCandidate[] = [
        {
          index: 0,
          content: {
            role: 'model',
            parts: [
              {
                inlineData: { mimeType: 'video/mp4', data: 'base64==' },
                videoMetadata: { startOffset: '0s', endOffset: '5s' } // Unsupported
              }
            ]
          }
        }
      ];
      expect(() => mapGenerateContentCandidates(candidates))
        .to.throw(AIError, /Part.videoMetadata is not supported/i)
        .with.property('code', AIErrorCode.UNSUPPORTED);
    });

    it('should handle candidates without citation or safety ratings', () => {
      const candidates: GoogleAIGenerateContentCandidate[] = [
        {
          index: 0,
          content: { role: 'model', parts: [{ text: 'Simple text' }] },
          finishReason: FinishReason.STOP
        }
      ];
      const mapped = mapGenerateContentCandidates(candidates);
      expect(mapped[0].citationMetadata).to.be.undefined;
      expect(mapped[0].safetyRatings).to.be.undefined;
      expect(mapped[0].content.parts[0].text).to.equal('Simple text');
      expect(loggerWarnStub).to.not.have.been.called;
    });

    it('should handle empty candidate array', () => {
      const candidates: GoogleAIGenerateContentCandidate[] = [];
      const mapped = mapGenerateContentCandidates(candidates);
      expect(mapped).to.deep.equal([]);
      expect(loggerWarnStub).to.not.have.been.called;
    });
  });

  describe('mapPromptFeedback', () => {
    it('should add default safety rating properties', () => {
      const feedback: PromptFeedback = {
        blockReason: BlockReason.OTHER,
        safetyRatings: [
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            probability: HarmProbability.HIGH,
            blocked: true
            // Missing severity, probabilityScore, severityScore
          } as any
        ]
        // Missing blockReasonMessage
      };
      const mapped = mapPromptFeedback(feedback);
      expect(mapped.safetyRatings).to.exist;
      const safetyRating = mapped.safetyRatings[0] as SafetyRating; // Type assertion
      expect(safetyRating.severity).to.equal(
        HarmSeverity.HARM_SEVERITY_UNSUPPORTED
      );
      expect(safetyRating.probabilityScore).to.equal(0);
      expect(safetyRating.severityScore).to.equal(0);
      // Existing properties should be preserved
      expect(safetyRating.category).to.equal(
        HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT
      );
      expect(safetyRating.probability).to.equal(HarmProbability.HIGH);
      expect(safetyRating.blocked).to.be.true;
      // Other properties
      expect(mapped.blockReason).to.equal(BlockReason.OTHER);
      expect(mapped.blockReasonMessage).to.be.undefined; // Not present in input
    });
  });
});
