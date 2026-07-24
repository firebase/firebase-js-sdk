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
  ImagenAspectRatio,
  ImagenPersonFilterLevel,
  ImagenSafetyFilterLevel
} from '../types';
import {
  createPredictRequestBody,
  formatGenerateContentInput
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
        { text: 'txt1' },
        { text: 'txtB' }
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
    it('formats a mixed array into a request', () => {
      const result = formatGenerateContentInput(['txtA', { text: 'txtB' }]);
      expect(result).to.deep.equal({
        contents: [
          {
            role: 'user',
            parts: [{ text: 'txtA' }, { text: 'txtB' }]
          }
        ]
      });
    });
    it('preserves other properties of request', () => {
      const result = formatGenerateContentInput({
        contents: [
          {
            role: 'user',
            parts: [{ text: 'txtA' }]
          }
        ],
        generationConfig: { topK: 100 }
      });
      expect(result).to.deep.equal({
        contents: [
          {
            role: 'user',
            parts: [{ text: 'txtA' }]
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
            parts: [{ text: 'txtA' }]
          }
        ],
        systemInstruction: 'be excited'
      });
      expect(result).to.deep.equal({
        contents: [
          {
            role: 'user',
            parts: [{ text: 'txtA' }]
          }
        ],
        systemInstruction: { role: 'system', parts: [{ text: 'be excited' }] }
      });
    });
    it('formats systemInstructions if provided as Part', () => {
      const result = formatGenerateContentInput({
        contents: [
          {
            role: 'user',
            parts: [{ text: 'txtA' }]
          }
        ],
        systemInstruction: { text: 'be excited' }
      });
      expect(result).to.deep.equal({
        contents: [
          {
            role: 'user',
            parts: [{ text: 'txtA' }]
          }
        ],
        systemInstruction: { role: 'system', parts: [{ text: 'be excited' }] }
      });
    });
    it('formats systemInstructions if provided as Content (no role)', () => {
      const result = formatGenerateContentInput({
        contents: [
          {
            role: 'user',
            parts: [{ text: 'txtA' }]
          }
        ],
        systemInstruction: { parts: [{ text: 'be excited' }] } as Content
      });
      expect(result).to.deep.equal({
        contents: [
          {
            role: 'user',
            parts: [{ text: 'txtA' }]
          }
        ],
        systemInstruction: { role: 'system', parts: [{ text: 'be excited' }] }
      });
    });
    it('passes thru systemInstructions if provided as Content', () => {
      const result = formatGenerateContentInput({
        contents: [
          {
            role: 'user',
            parts: [{ text: 'txtA' }]
          }
        ],
        systemInstruction: { role: 'system', parts: [{ text: 'be excited' }] }
      });
      expect(result).to.deep.equal({
        contents: [
          {
            role: 'user',
            parts: [{ text: 'txtA' }]
          }
        ],
        systemInstruction: { role: 'system', parts: [{ text: 'be excited' }] }
      });
    });
    it('preserves SpeechConfig for single-speaker setups', () => {
      const result = formatGenerateContentInput({
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Hello' }]
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
            parts: [{ text: 'Write a dialogue.' }]
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
        contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
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
            parts: [{ text: 'Hola' }]
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
            parts: [{ text: 'Hello' }]
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
  describe('createPredictRequestBody', () => {
    it('creates body with default request parameters', () => {
      const prompt = 'A photorealistic image of a toy boat at sea.';
      const body = createPredictRequestBody(prompt, {});
      expect(body.instances[0].prompt).to.equal(prompt);
      expect(body.parameters.sampleCount).to.equal(1);
      expect(body.parameters.includeRaiReason).to.be.true;
      expect(body.parameters.includeSafetyAttributes).to.be.true;

      // Parameters without default values should be undefined
      expect(body.parameters.storageUri).to.be.undefined;
      expect(body.parameters.storageUri).to.be.undefined;
      expect(body.parameters.outputOptions).to.be.undefined;
      expect(body.parameters.negativePrompt).to.be.undefined;
      expect(body.parameters.aspectRatio).to.be.undefined;
      expect(body.parameters.addWatermark).to.be.undefined;
      expect(body.parameters.safetyFilterLevel).to.be.undefined;
      expect(body.parameters.personGeneration).to.be.undefined;
    });
  });
  it('creates body with non-default request paramaters', () => {
    const prompt = 'A photorealistic image of a toy boat at sea.';
    const imageFormat = { mimeType: 'image/jpeg', compressionQuality: 75 };
    const safetySettings = {
      safetyFilterLevel: ImagenSafetyFilterLevel.BLOCK_LOW_AND_ABOVE,
      personFilterLevel: ImagenPersonFilterLevel.ALLOW_ADULT
    };
    const addWatermark = true;
    const numberOfImages = 4;
    const negativePrompt = 'do not hallucinate';
    const aspectRatio = ImagenAspectRatio.LANDSCAPE_16x9;
    const body = createPredictRequestBody(prompt, {
      numberOfImages,
      imageFormat,
      addWatermark,
      negativePrompt,
      aspectRatio,
      ...safetySettings
    });
    expect(body.instances[0].prompt).to.equal(prompt);
    expect(body.parameters).deep.equal({
      sampleCount: numberOfImages,
      outputOptions: {
        mimeType: imageFormat.mimeType,
        compressionQuality: imageFormat.compressionQuality
      },
      addWatermark,
      negativePrompt,
      safetyFilterLevel: safetySettings.safetyFilterLevel,
      personGeneration: safetySettings.personFilterLevel,
      aspectRatio,
      includeRaiReason: true,
      includeSafetyAttributes: true,
      storageUri: undefined
    });
  });
  it('creates body with GCS URI', () => {
    const prompt = 'A photorealistic image of a toy boat at sea.';
    const gcsURI = 'gcs-uri';
    const body = createPredictRequestBody(prompt, {
      gcsURI
    });

    expect(body.instances[0].prompt).to.equal(prompt);
    expect(body.parameters.storageUri).to.equal(gcsURI);
  });
});
