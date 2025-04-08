/**
 * @license
 * Copyright 2024 Google LLC
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

import {
  aggregateResponses,
  getResponseStream,
  processStream
} from './stream-reader';
import { expect, use } from 'chai';
import { restore } from 'sinon';
import sinonChai from 'sinon-chai';
import {
  getChunkedStream,
  getMockResponseStreaming
} from '../../test-utils/mock-response';
import {
  BlockReason,
  FinishReason,
  GenerateContentResponse,
  HarmCategory,
  HarmProbability,
  SafetyRating,
  VertexAIErrorCode
} from '../types';
import { VertexAIError } from '../errors';

use(sinonChai);

describe('getResponseStream', () => {
  afterEach(() => {
    restore();
  });
  it('two lines', async () => {
    const src = [{ text: 'A' }, { text: 'B' }];
    const inputStream = getChunkedStream(
      src
        .map(v => JSON.stringify(v))
        .map(v => 'data: ' + v + '\r\n\r\n')
        .join('')
    ).pipeThrough(new TextDecoderStream('utf8', { fatal: true }));
    const responseStream = getResponseStream<{ text: string }>(inputStream);
    const reader = responseStream.getReader();
    const responses: Array<{ text: string }> = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      responses.push(value);
    }
    expect(responses).to.deep.equal(src);
  });
});

describe('processStream', () => {
  afterEach(() => {
    restore();
  });
  it('streaming response - short', async () => {
    const fakeResponse = getMockResponseStreaming(
      'vertexAI',
      'streaming-success-basic-reply-short.txt'
    );
    const result = processStream(fakeResponse as Response);
    for await (const response of result.stream) {
      expect(response.text()).to.not.be.empty;
    }
    const aggregatedResponse = await result.response;
    expect(aggregatedResponse.text()).to.include('Cheyenne');
  });
  it('streaming response - long', async () => {
    const fakeResponse = getMockResponseStreaming(
      'vertexAI',
      'streaming-success-basic-reply-long.txt'
    );
    const result = processStream(fakeResponse as Response);
    for await (const response of result.stream) {
      expect(response.text()).to.not.be.empty;
    }
    const aggregatedResponse = await result.response;
    expect(aggregatedResponse.text()).to.include('**Cats:**');
    expect(aggregatedResponse.text()).to.include('to their owners.');
  });
  it('streaming response - long - big chunk', async () => {
    const fakeResponse = getMockResponseStreaming(
      'vertexAI',
      'streaming-success-basic-reply-long.txt',
      1e6
    );
    const result = processStream(fakeResponse as Response);
    for await (const response of result.stream) {
      expect(response.text()).to.not.be.empty;
    }
    const aggregatedResponse = await result.response;
    expect(aggregatedResponse.text()).to.include('**Cats:**');
    expect(aggregatedResponse.text()).to.include('to their owners.');
  });
  it('streaming response - utf8', async () => {
    const fakeResponse = getMockResponseStreaming(
      'vertexAI',
      'streaming-success-utf8.txt'
    );
    const result = processStream(fakeResponse as Response);
    for await (const response of result.stream) {
      expect(response.text()).to.not.be.empty;
    }
    const aggregatedResponse = await result.response;
    expect(aggregatedResponse.text()).to.include('秋风瑟瑟，叶落纷纷');
    expect(aggregatedResponse.text()).to.include('家人围坐在一起');
  });
  it('streaming response - functioncall', async () => {
    const fakeResponse = getMockResponseStreaming(
      'vertexAI',
      'streaming-success-function-call-short.txt'
    );
    const result = processStream(fakeResponse as Response);
    for await (const response of result.stream) {
      expect(response.text()).to.be.empty;
      expect(response.functionCalls()).to.be.deep.equal([
        {
          name: 'getTemperature',
          args: { city: 'San Jose' }
        }
      ]);
    }
    const aggregatedResponse = await result.response;
    expect(aggregatedResponse.text()).to.be.empty;
    expect(aggregatedResponse.functionCalls()).to.be.deep.equal([
      {
        name: 'getTemperature',
        args: { city: 'San Jose' }
      }
    ]);
  });
  it('candidate had finishReason', async () => {
    const fakeResponse = getMockResponseStreaming(
      'vertexAI',
      'streaming-failure-finish-reason-safety.txt'
    );
    const result = processStream(fakeResponse as Response);
    const aggregatedResponse = await result.response;
    expect(aggregatedResponse.candidates?.[0].finishReason).to.equal('SAFETY');
    expect(aggregatedResponse.text).to.throw('SAFETY');
    for await (const response of result.stream) {
      expect(response.text).to.throw('SAFETY');
    }
  });
  it('prompt was blocked', async () => {
    const fakeResponse = getMockResponseStreaming(
      'vertexAI',
      'streaming-failure-prompt-blocked-safety.txt'
    );
    const result = processStream(fakeResponse as Response);
    const aggregatedResponse = await result.response;
    expect(aggregatedResponse.text).to.throw('SAFETY');
    expect(aggregatedResponse.promptFeedback?.blockReason).to.equal('SAFETY');
    for await (const response of result.stream) {
      expect(response.text).to.throw('SAFETY');
    }
  });
  it('empty content', async () => {
    const fakeResponse = getMockResponseStreaming(
      'vertexAI',
      'streaming-failure-empty-content.txt'
    );
    const result = processStream(fakeResponse as Response);
    const aggregatedResponse = await result.response;
    expect(aggregatedResponse.text()).to.equal('');
    for await (const response of result.stream) {
      expect(response.text()).to.equal('');
    }
  });
  it('unknown enum - should ignore', async () => {
    const fakeResponse = getMockResponseStreaming(
      'vertexAI',
      'streaming-success-unknown-safety-enum.txt'
    );
    const result = processStream(fakeResponse as Response);
    const aggregatedResponse = await result.response;
    expect(aggregatedResponse.text()).to.include('Cats');
    for await (const response of result.stream) {
      expect(response.text()).to.not.be.empty;
    }
  });
  it('recitation ending with a missing content field', async () => {
    const fakeResponse = getMockResponseStreaming(
      'vertexAI',
      'streaming-failure-recitation-no-content.txt'
    );
    const result = processStream(fakeResponse as Response);
    const aggregatedResponse = await result.response;
    expect(aggregatedResponse.text).to.throw('RECITATION');
    expect(aggregatedResponse.candidates?.[0].content.parts[0].text).to.include(
      'Copyrighted text goes here'
    );
    for await (const response of result.stream) {
      if (response.candidates?.[0].finishReason !== FinishReason.RECITATION) {
        expect(response.text()).to.not.be.empty;
      } else {
        expect(response.text).to.throw('RECITATION');
      }
    }
  });
  it('handles citations', async () => {
    const fakeResponse = getMockResponseStreaming(
      'vertexAI',
      'streaming-success-citations.txt'
    );
    const result = processStream(fakeResponse as Response);
    const aggregatedResponse = await result.response;
    expect(aggregatedResponse.text()).to.include('Quantum mechanics is');
    expect(
      aggregatedResponse.candidates?.[0].citationMetadata?.citations.length
    ).to.equal(3);
    let foundCitationMetadata = false;
    for await (const response of result.stream) {
      expect(response.text()).to.not.be.empty;
      if (response.candidates?.[0].citationMetadata) {
        foundCitationMetadata = true;
      }
    }
    expect(foundCitationMetadata).to.be.true;
  });
  it('removes empty text parts', async () => {
    const fakeResponse = getMockResponseStreaming(
      'vertexAI',
      'streaming-success-empty-text-part.txt'
    );
    const result = processStream(fakeResponse as Response);
    const aggregatedResponse = await result.response;
    expect(aggregatedResponse.text()).to.equal('1');
    expect(aggregatedResponse.candidates?.length).to.equal(1);
    expect(aggregatedResponse.candidates?.[0].content.parts.length).to.equal(1);

    // The chunk with the empty text part will still go through the stream
    let numChunks = 0;
    for await (const _ of result.stream) {
      numChunks++;
    }
    expect(numChunks).to.equal(2);
  });
});

describe('aggregateResponses', () => {
  it('handles no candidates, and promptFeedback', () => {
    const responsesToAggregate: GenerateContentResponse[] = [
      {
        promptFeedback: {
          blockReason: BlockReason.SAFETY,
          safetyRatings: [
            {
              category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
              probability: HarmProbability.LOW
            } as SafetyRating
          ]
        }
      }
    ];
    const response = aggregateResponses(responsesToAggregate);
    expect(response.candidates).to.not.exist;
    expect(response.promptFeedback?.blockReason).to.equal(BlockReason.SAFETY);
  });
  describe('multiple responses, has candidates', () => {
    let response: GenerateContentResponse;
    before(() => {
      const responsesToAggregate: GenerateContentResponse[] = [
        {
          candidates: [
            {
              index: 0,
              content: {
                role: 'user',
                parts: [{ text: 'hello.' }]
              },
              finishReason: FinishReason.STOP,
              finishMessage: 'something',
              safetyRatings: [
                {
                  category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                  probability: HarmProbability.NEGLIGIBLE
                } as SafetyRating
              ]
            }
          ],
          promptFeedback: {
            blockReason: BlockReason.SAFETY,
            safetyRatings: [
              {
                category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                probability: HarmProbability.LOW
              } as SafetyRating
            ]
          }
        },
        {
          candidates: [
            {
              index: 0,
              content: {
                role: 'user',
                parts: [{ text: 'angry stuff' }]
              },
              finishReason: FinishReason.STOP,
              finishMessage: 'something',
              safetyRatings: [
                {
                  category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                  probability: HarmProbability.NEGLIGIBLE
                } as SafetyRating
              ],
              citationMetadata: {
                citations: [
                  {
                    startIndex: 0,
                    endIndex: 20,
                    uri: 'sourceurl',
                    license: ''
                  }
                ]
              }
            }
          ],
          promptFeedback: {
            blockReason: BlockReason.OTHER,
            safetyRatings: [
              {
                category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                probability: HarmProbability.HIGH
              } as SafetyRating
            ]
          }
        },
        {
          candidates: [
            {
              index: 0,
              content: {
                role: 'user',
                parts: [{ text: '...more stuff' }]
              },
              finishReason: FinishReason.MAX_TOKENS,
              finishMessage: 'too many tokens',
              safetyRatings: [
                {
                  category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                  probability: HarmProbability.MEDIUM
                } as SafetyRating
              ],
              citationMetadata: {
                citations: [
                  {
                    startIndex: 0,
                    endIndex: 20,
                    uri: 'sourceurl',
                    license: ''
                  },
                  {
                    startIndex: 150,
                    endIndex: 155,
                    uri: 'sourceurl',
                    license: ''
                  }
                ]
              }
            }
          ],
          promptFeedback: {
            blockReason: BlockReason.OTHER,
            safetyRatings: [
              {
                category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                probability: HarmProbability.HIGH
              } as SafetyRating
            ]
          }
        }
      ];
      response = aggregateResponses(responsesToAggregate);
    });

    it('aggregates text across responses', () => {
      expect(response.candidates?.length).to.equal(1);
      expect(
        response.candidates?.[0].content.parts.map(({ text }) => text)
      ).to.deep.equal(['hello.', 'angry stuff', '...more stuff']);
    });

    it("takes the last response's promptFeedback", () => {
      expect(response.promptFeedback?.blockReason).to.equal(BlockReason.OTHER);
    });

    it("takes the last response's finishReason", () => {
      expect(response.candidates?.[0].finishReason).to.equal(
        FinishReason.MAX_TOKENS
      );
    });

    it("takes the last response's finishMessage", () => {
      expect(response.candidates?.[0].finishMessage).to.equal(
        'too many tokens'
      );
    });

    it("takes the last response's candidate safetyRatings", () => {
      expect(response.candidates?.[0].safetyRatings?.[0].category).to.equal(
        HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT
      );
      expect(response.candidates?.[0].safetyRatings?.[0].probability).to.equal(
        HarmProbability.MEDIUM
      );
    });

    it('collects all citations into one array', () => {
      expect(
        response.candidates?.[0].citationMetadata?.citations.length
      ).to.equal(2);
      expect(
        response.candidates?.[0].citationMetadata?.citations[0].startIndex
      ).to.equal(0);
      expect(
        response.candidates?.[0].citationMetadata?.citations[1].startIndex
      ).to.equal(150);
    });
  });

  it('throws if a part has no properties', () => {
    const responsesToAggregate: GenerateContentResponse[] = [
      {
        candidates: [
          {
            index: 0,
            content: {
              role: 'user',
              parts: [{} as any] // Empty
            },
            finishReason: FinishReason.STOP,
            finishMessage: 'something',
            safetyRatings: [
              {
                category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                probability: HarmProbability.NEGLIGIBLE
              } as SafetyRating
            ]
          }
        ],
        promptFeedback: {
          blockReason: BlockReason.SAFETY,
          safetyRatings: [
            {
              category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
              probability: HarmProbability.LOW
            } as SafetyRating
          ]
        }
      }
    ];

    try {
      aggregateResponses(responsesToAggregate);
    } catch (e) {
      expect((e as VertexAIError).code).includes(
        VertexAIErrorCode.INVALID_CONTENT
      );
      expect((e as VertexAIError).message).to.include(
        'Part should have at least one property, but there are none. This is likely caused ' +
          'by a malformed response from the backend.'
      );
    }
  });
});
