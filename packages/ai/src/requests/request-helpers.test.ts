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
import { Content } from '../types';
import { formatGenerateContentInput } from './request-helpers';

use(sinonChai);

describe('request formatting methods', () => {
  describe('formatGenerateContentInput', () => {
    it('formats a text string into a request', () => {
      const result = formatGenerateContentInput('some text content');
      expect(result).to.deep.equal({
        contents: [
          {
            role: 'user',
            parts: [{ type: 'text', text: 'some text content' }]
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
            parts: [
              { type: 'text', text: 'txt1' },
              { type: 'text', text: 'txt2' }
            ]
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
    it('normalizes untagged parts into a request at runtime', () => {
      const result = formatGenerateContentInput([
        { text: 'txt1' } as any,
        { text: 'txtB' } as any
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
    it('normalizes untagged parts inside contents property', () => {
      const result = formatGenerateContentInput({
        contents: [
          {
            role: 'user',
            parts: [{ text: 'untagged' } as any]
          }
        ]
      });
      expect(result.contents[0].parts[0]).to.deep.equal({
        type: 'text',
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
            parts: [
              { type: 'text', text: 'txtA' },
              { type: 'text', text: 'txtB' }
            ]
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
          parts: [{ type: 'text', text: 'be excited' }]
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
              { type: 'text', text: 'What is this?' },
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
});
