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

import { expect, use } from 'chai';
import sinonChai from 'sinon-chai';
import {
  Content,
  CountTokensRequest,
  FunctionResponse,
  GenerateContentRequest,
  Part
} from '../types';
import { TemplateRequestInternal } from '../public-types';
import {
  cleanContentForWire,
  cleanCountTokensRequestForWire,
  cleanFunctionResponseForWire,
  cleanGenerateContentRequestForWire,
  cleanSystemInstructionForWire,
  cleanTemplateRequestForWire,
  formatGenerateContentInput,
  stripPartType
} from './request-helpers';

use(sinonChai);

describe('request formatting methods', () => {
  describe('formatGenerateContentInput', () => {
    it('formats a text string into a request', () => {
      const result = formatGenerateContentInput('some text content');
      expect(result).to.deep.equal({
        contents: [
          {
            role: 'user',
            parts: [{ text: 'some text content' }]
          }
        ]
      });
    });
    it('formats an array of strings into a request', () => {
      const result = formatGenerateContentInput(['txt1', 'txt2']);
      expect(result).to.deep.equal({
        contents: [
          {
            role: 'user',
            parts: [{ text: 'txt1' }, { text: 'txt2' }]
          }
        ]
      });
    });
    it('formats an array of Parts into a request', () => {
      const result = formatGenerateContentInput([
        { type: 'text', text: 'txt1' },
        { type: 'text', text: 'txtB' }
      ]);
      expect(result).to.deep.equal({
        contents: [
          {
            role: 'user',
            parts: [
              { type: 'text', text: 'txt1' },
              { type: 'text', text: 'txtB' }
            ]
          }
        ]
      });
    });
    it('passes through untagged parts in an array at runtime', () => {
      const result = formatGenerateContentInput([
        { text: 'txt1' } as any,
        { text: 'txtB' } as any
      ]);
      expect(result).to.deep.equal({
        contents: [
          {
            role: 'user',
            parts: [{ text: 'txt1' }, { text: 'txtB' }]
          }
        ]
      });
    });
    it('passes through untagged parts inside contents property', () => {
      const result = formatGenerateContentInput({
        contents: [
          {
            role: 'user',
            parts: [{ text: 'untagged' } as any]
          }
        ]
      });
      expect(result.contents[0].parts[0]).to.deep.equal({
        text: 'untagged'
      });
    });
    it('formats a mixed array into a request', () => {
      const result = formatGenerateContentInput([
        'txtA',
        { type: 'text', text: 'txtB' }
      ]);
      expect(result).to.deep.equal({
        contents: [
          {
            role: 'user',
            parts: [{ text: 'txtA' }, { type: 'text', text: 'txtB' }]
          }
        ]
      });
    });
    it('preserves other properties of request', () => {
      const result = formatGenerateContentInput({
        contents: [
          {
            role: 'user',
            parts: [{ type: 'text', text: 'txtA' }]
          }
        ],
        generationConfig: { topK: 100 }
      });
      expect(result).to.deep.equal({
        contents: [
          {
            role: 'user',
            parts: [{ type: 'text', text: 'txtA' }]
          }
        ],
        generationConfig: { topK: 100 }
      });
    });
    it('formats systemInstructions if provided as text', () => {
      const result = formatGenerateContentInput({
        contents: [
          {
            role: 'user',
            parts: [{ type: 'text', text: 'txtA' }]
          }
        ],
        systemInstruction: 'be excited'
      });
      expect(result).to.deep.equal({
        contents: [
          {
            role: 'user',
            parts: [{ type: 'text', text: 'txtA' }]
          }
        ],
        systemInstruction: {
          role: 'system',
          parts: [{ text: 'be excited' }]
        }
      });
    });
    it('formats systemInstructions if provided as Part', () => {
      const result = formatGenerateContentInput({
        contents: [
          {
            role: 'user',
            parts: [{ type: 'text', text: 'txtA' }]
          }
        ],
        systemInstruction: { type: 'text', text: 'be excited' }
      });
      expect(result).to.deep.equal({
        contents: [
          {
            role: 'user',
            parts: [{ type: 'text', text: 'txtA' }]
          }
        ],
        systemInstruction: {
          role: 'system',
          parts: [{ type: 'text', text: 'be excited' }]
        }
      });
    });
    it('formats systemInstructions if provided as Content (no role)', () => {
      const result = formatGenerateContentInput({
        contents: [
          {
            role: 'user',
            parts: [{ type: 'text', text: 'txtA' }]
          }
        ],
        systemInstruction: {
          parts: [{ type: 'text', text: 'be excited' }]
        } as Content
      });
      expect(result).to.deep.equal({
        contents: [
          {
            role: 'user',
            parts: [{ type: 'text', text: 'txtA' }]
          }
        ],
        systemInstruction: {
          role: 'system',
          parts: [{ type: 'text', text: 'be excited' }]
        }
      });
    });
    it('passes thru systemInstructions if provided as Content', () => {
      const result = formatGenerateContentInput({
        contents: [
          {
            role: 'user',
            parts: [{ type: 'text', text: 'txtA' }]
          }
        ],
        systemInstruction: {
          role: 'system',
          parts: [{ type: 'text', text: 'be excited' }]
        }
      });
      expect(result).to.deep.equal({
        contents: [
          {
            role: 'user',
            parts: [{ type: 'text', text: 'txtA' }]
          }
        ],
        systemInstruction: {
          role: 'system',
          parts: [{ type: 'text', text: 'be excited' }]
        }
      });
    });
    it('preserves SpeechConfig for single-speaker setups', () => {
      const result = formatGenerateContentInput({
        contents: [
          {
            role: 'user',
            parts: [{ type: 'text', text: 'Hello' }]
          }
        ],
        generationConfig: {
          speechConfig: {
            languageCode: 'en-US',
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: 'Puck'
              }
            }
          }
        }
      });
      expect(result.generationConfig?.speechConfig).to.deep.equal({
        languageCode: 'en-US',
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: 'Puck'
          }
        }
      });
    });

    it('preserves SpeechConfig for multi-speaker setups', () => {
      const result = formatGenerateContentInput({
        contents: [
          {
            role: 'user',
            parts: [{ type: 'text', text: 'Write a dialogue.' }]
          }
        ],
        generationConfig: {
          speechConfig: {
            languageCode: 'en-US',
            multiSpeakerVoiceConfig: {
              speakerVoiceConfigs: [
                {
                  speaker: 'narrator',
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Aoede' }
                  }
                },
                {
                  speaker: 'character',
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Charon' }
                  }
                }
              ]
            }
          }
        }
      });
      expect(result.generationConfig?.speechConfig).to.deep.equal({
        languageCode: 'en-US',
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: [
            {
              speaker: 'narrator',
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } }
            },
            {
              speaker: 'character',
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } }
            }
          ]
        }
      });
    });
    it('preserves SpeechConfig alongside other GenerationConfig parameters', () => {
      const req = formatGenerateContentInput({
        contents: [{ role: 'user', parts: [{ type: 'text', text: 'Hello' }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 100,
          responseMimeType: 'audio/mp3',
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: 'Puck'
              }
            }
          }
        }
      });
      expect(req.generationConfig?.temperature).to.equal(0.7);
      expect(req.generationConfig?.maxOutputTokens).to.equal(100);
      expect(req.generationConfig?.responseMimeType).to.equal('audio/mp3');
      expect(
        req.generationConfig?.speechConfig?.voiceConfig?.prebuiltVoiceConfig
          ?.voiceName
      ).to.equal('Puck');
    });

    it('serializes language code without nested voice configurations', () => {
      const result = formatGenerateContentInput({
        contents: [
          {
            role: 'user',
            parts: [{ type: 'text', text: 'Hola' }]
          }
        ],
        generationConfig: {
          speechConfig: {
            languageCode: 'es-ES'
          }
        }
      });
      expect(result.generationConfig?.speechConfig).to.deep.equal({
        languageCode: 'es-ES'
      });
    });

    it('safely passes through an empty speechConfig object', () => {
      const result = formatGenerateContentInput({
        contents: [
          {
            role: 'user',
            parts: [{ type: 'text', text: 'Hello' }]
          }
        ],
        generationConfig: {
          speechConfig: {}
        }
      });
      expect(result.generationConfig?.speechConfig).to.deep.equal({});
    });

    it('formats fileData as part if provided as part', () => {
      const result = formatGenerateContentInput([
        'What is this?',
        {
          type: 'fileData',
          fileData: {
            mimeType: 'image/jpeg',
            fileUri: 'gs://sample.appspot.com/image.jpeg'
          }
        }
      ]);
      expect(result).to.be.deep.equal({
        contents: [
          {
            role: 'user',
            parts: [
              { text: 'What is this?' },
              {
                type: 'fileData',
                fileData: {
                  mimeType: 'image/jpeg',
                  fileUri: 'gs://sample.appspot.com/image.jpeg'
                }
              }
            ]
          }
        ]
      });
    });
  });

  describe('stripPartType', () => {
    it('strips type from TextPart without mutating original', () => {
      const original: Part = { type: 'text', text: 'hello' };
      const stripped = stripPartType(original);
      expect(stripped).to.deep.equal({ text: 'hello' });
      expect(stripped).to.not.have.property('type');
      expect(original).to.have.property('type', 'text');
    });

    it('strips type from InlineDataPart without mutating original', () => {
      const original: Part = {
        type: 'inlineData',
        inlineData: { mimeType: 'image/png', data: 'abc' }
      };
      const stripped = stripPartType(original);
      expect(stripped).to.deep.equal({
        inlineData: { mimeType: 'image/png', data: 'abc' }
      });
      expect(stripped).to.not.have.property('type');
      expect(original).to.have.property('type', 'inlineData');
    });

    it('strips type from FunctionCallPart without mutating original', () => {
      const original: Part = {
        type: 'functionCall',
        functionCall: { name: 'getWeather', args: { city: 'SF' } }
      };
      const stripped = stripPartType(original);
      expect(stripped).to.deep.equal({
        functionCall: { name: 'getWeather', args: { city: 'SF' } }
      });
      expect(stripped).to.not.have.property('type');
      expect(original).to.have.property('type', 'functionCall');
    });

    it('strips type from FunctionResponsePart and nested parts 3 levels deep', () => {
      const original: Part = {
        type: 'functionResponse',
        functionResponse: {
          name: 'lookup',
          response: { ok: true },
          parts: [{ type: 'text', text: 'nested text' }]
        }
      };
      const stripped = stripPartType(original);
      expect(stripped).to.deep.equal({
        functionResponse: {
          name: 'lookup',
          response: { ok: true },
          parts: [{ text: 'nested text' }]
        }
      });
      expect(stripped).to.not.have.property('type');
      expect(
        (stripped as { functionResponse: FunctionResponse }).functionResponse
          .parts![0]
      ).to.not.have.property('type');
      // Verify immutability
      expect(original).to.have.property('type', 'functionResponse');
      expect(
        (original as { functionResponse: FunctionResponse }).functionResponse
          .parts![0]
      ).to.have.property('type', 'text');
    });

    it('handles already untagged parts', () => {
      const untagged = { text: 'untagged text' } as any;
      const stripped = stripPartType(untagged);
      expect(stripped).to.deep.equal({ text: 'untagged text' });
    });
  });

  describe('cleanContentForWire', () => {
    it('strips type from all parts in a Content object without mutating original', () => {
      const original: Content = {
        role: 'user',
        parts: [
          { type: 'text', text: 'first' },
          {
            type: 'inlineData',
            inlineData: { mimeType: 'image/jpeg', data: '123' }
          }
        ]
      };
      const cleaned = cleanContentForWire(original);
      expect(cleaned).to.deep.equal({
        role: 'user',
        parts: [
          { text: 'first' },
          { inlineData: { mimeType: 'image/jpeg', data: '123' } }
        ]
      });
      expect(original.parts[0]).to.have.property('type', 'text');
      expect(original.parts[1]).to.have.property('type', 'inlineData');
    });

    it('returns content unchanged if parts is undefined', () => {
      const content = { role: 'user' } as Content;
      expect(cleanContentForWire(content)).to.equal(content);
    });
  });

  describe('cleanSystemInstructionForWire', () => {
    it('returns string unchanged', () => {
      expect(cleanSystemInstructionForWire('system string')).to.equal(
        'system string'
      );
    });

    it('returns undefined if undefined', () => {
      expect(cleanSystemInstructionForWire(undefined)).to.be.undefined;
    });

    it('strips type from single Part systemInstruction', () => {
      const part: Part = { type: 'text', text: 'system text' };
      const cleaned = cleanSystemInstructionForWire(part);
      expect(cleaned).to.deep.equal({ text: 'system text' });
      expect(part).to.have.property('type', 'text');
    });

    it('strips type from Content systemInstruction', () => {
      const content: Content = {
        role: 'system',
        parts: [{ type: 'text', text: 'system content' }]
      };
      const cleaned = cleanSystemInstructionForWire(content);
      expect(cleaned).to.deep.equal({
        role: 'system',
        parts: [{ text: 'system content' }]
      });
      expect(content.parts[0]).to.have.property('type', 'text');
    });
  });

  describe('cleanGenerateContentRequestForWire', () => {
    it('strips type from contents and systemInstruction without mutating original', () => {
      const request: GenerateContentRequest = {
        contents: [
          {
            role: 'user',
            parts: [{ type: 'text', text: 'hello' }]
          }
        ],
        systemInstruction: {
          role: 'system',
          parts: [{ type: 'text', text: 'be helpful' }]
        },
        generationConfig: { temperature: 0.7 }
      };
      const cleaned = cleanGenerateContentRequestForWire(request);
      expect(cleaned).to.deep.equal({
        contents: [
          {
            role: 'user',
            parts: [{ text: 'hello' }]
          }
        ],
        systemInstruction: {
          role: 'system',
          parts: [{ text: 'be helpful' }]
        },
        generationConfig: { temperature: 0.7 }
      });
      expect(request.contents[0].parts[0]).to.have.property('type', 'text');
      expect((request.systemInstruction as Content).parts[0]).to.have.property(
        'type',
        'text'
      );
    });
  });

  describe('cleanCountTokensRequestForWire', () => {
    it('strips type from contents and systemInstruction without mutating original', () => {
      const request: CountTokensRequest = {
        contents: [
          {
            role: 'user',
            parts: [{ type: 'text', text: 'count this' }]
          }
        ],
        systemInstruction: 'simple system instruction'
      };
      const cleaned = cleanCountTokensRequestForWire(request);
      expect(cleaned).to.deep.equal({
        contents: [
          {
            role: 'user',
            parts: [{ text: 'count this' }]
          }
        ],
        systemInstruction: 'simple system instruction'
      });
      expect(request.contents[0].parts[0]).to.have.property('type', 'text');
    });
  });

  describe('cleanTemplateRequestForWire', () => {
    it('strips type from history parts without mutating original', () => {
      const originalHistory: Content[] = [
        {
          role: 'user',
          parts: [{ type: 'text', text: 'template history' }]
        }
      ];
      const request: TemplateRequestInternal = {
        history: originalHistory
      };
      const cleaned = cleanTemplateRequestForWire(request);
      expect(cleaned.history).to.deep.equal([
        {
          role: 'user',
          parts: [{ text: 'template history' }]
        }
      ]);
      expect(originalHistory[0].parts[0]).to.have.property('type', 'text');
    });
  });

  describe('cleanFunctionResponseForWire', () => {
    it('strips type from nested parts in FunctionResponse', () => {
      const fnResponse: FunctionResponse = {
        name: 'testFn',
        response: { result: 123 },
        parts: [{ type: 'text', text: 'part in fn response' }]
      };
      const cleaned = cleanFunctionResponseForWire(fnResponse);
      expect(cleaned.parts).to.deep.equal([{ text: 'part in fn response' }]);
      expect(fnResponse.parts![0]).to.have.property('type', 'text');
    });

    it('returns original if no parts present', () => {
      const fnResponse: FunctionResponse = {
        name: 'testFn',
        response: { result: 123 }
      };
      expect(cleanFunctionResponseForWire(fnResponse)).to.equal(fnResponse);
    });
  });
});
