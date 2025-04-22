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
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import { ChromeAdapter } from './chrome-adapter';
import {
  Availability,
  LanguageModel,
  LanguageModelCreateOptions,
  LanguageModelMessageContent
} from '../types/language-model';
import { match, stub } from 'sinon';
import { GenerateContentRequest } from '../types';

use(sinonChai);
use(chaiAsPromised);

/**
 * Converts the ReadableStream from response.body to an array of strings.
 */
async function toStringArray(
  stream: ReadableStream<Uint8Array>
): Promise<string[]> {
  const decoder = new TextDecoder();
  const actual = [];
  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    actual.push(decoder.decode(value));
  }
  return actual;
}

describe('ChromeAdapter', () => {
  describe('isAvailable', () => {
    it('returns false if mode is only cloud', async () => {
      const adapter = new ChromeAdapter(undefined, 'only_in_cloud');
      expect(
        await adapter.isAvailable({
          contents: []
        })
      ).to.be.false;
    });
    it('returns false if AI API is undefined', async () => {
      const adapter = new ChromeAdapter(undefined, 'prefer_on_device');
      expect(
        await adapter.isAvailable({
          contents: []
        })
      ).to.be.false;
    });
    it('returns false if LanguageModel API is undefined', async () => {
      const adapter = new ChromeAdapter(
        {} as LanguageModel,
        'prefer_on_device'
      );
      expect(
        await adapter.isAvailable({
          contents: []
        })
      ).to.be.false;
    });
    it('returns false if request contents empty', async () => {
      const adapter = new ChromeAdapter(
        {} as LanguageModel,
        'prefer_on_device'
      );
      expect(
        await adapter.isAvailable({
          contents: []
        })
      ).to.be.false;
    });
    it('returns false if request content has function role', async () => {
      const adapter = new ChromeAdapter(
        {} as LanguageModel,
        'prefer_on_device'
      );
      expect(
        await adapter.isAvailable({
          contents: [
            {
              role: 'function',
              parts: []
            }
          ]
        })
      ).to.be.false;
    });
    it('returns false if request system instruction has function role', async () => {
      const adapter = new ChromeAdapter(
        {} as LanguageModel,
        'prefer_on_device'
      );
      expect(
        await adapter.isAvailable({
          contents: [],
          systemInstruction: {
            role: 'function',
            parts: []
          }
        })
      ).to.be.false;
    });
    it('returns false if request system instruction has multiple parts', async () => {
      const adapter = new ChromeAdapter(
        {} as LanguageModel,
        'prefer_on_device'
      );
      expect(
        await adapter.isAvailable({
          contents: [],
          systemInstruction: {
            role: 'function',
            parts: [{ text: 'a' }, { text: 'b' }]
          }
        })
      ).to.be.false;
    });
    it('returns false if request system instruction has non-text part', async () => {
      const adapter = new ChromeAdapter(
        {} as LanguageModel,
        'prefer_on_device'
      );
      expect(
        await adapter.isAvailable({
          contents: [],
          systemInstruction: {
            role: 'function',
            parts: [{ inlineData: { mimeType: 'a', data: 'b' } }]
          }
        })
      ).to.be.false;
    });
    it('returns true if model is readily available', async () => {
      const languageModelProvider = {
        availability: () => Promise.resolve(Availability.available)
      } as LanguageModel;
      const adapter = new ChromeAdapter(
        languageModelProvider,
        'prefer_on_device'
      );
      expect(
        await adapter.isAvailable({
          contents: [{ role: 'user', parts: [{ text: 'hi' }] }]
        })
      ).to.be.true;
    });
    it('returns false and triggers download when model is available after download', async () => {
      const languageModelProvider = {
        availability: () => Promise.resolve(Availability.downloadable),
        create: () => Promise.resolve({})
      } as LanguageModel;
      const createStub = stub(languageModelProvider, 'create').resolves(
        {} as LanguageModel
      );
      const adapter = new ChromeAdapter(
        languageModelProvider,
        'prefer_on_device'
      );
      const expectedOnDeviceParams = {
        expectedInputs: [{ type: 'image' }]
      } as LanguageModelCreateOptions;
      expect(
        await adapter.isAvailable({
          contents: [{ role: 'user', parts: [{ text: 'hi' }] }]
        })
      ).to.be.false;
      expect(createStub).to.have.been.calledOnceWith(expectedOnDeviceParams);
    });
    it('avoids redundant downloads', async () => {
      const languageModelProvider = {
        availability: () => Promise.resolve(Availability.downloadable),
        create: () => Promise.resolve({})
      } as LanguageModel;
      const downloadPromise = new Promise<LanguageModel>(() => {
        /* never resolves */
      });
      const createStub = stub(languageModelProvider, 'create').returns(
        downloadPromise
      );
      const adapter = new ChromeAdapter(languageModelProvider);
      await adapter.isAvailable({
        contents: [{ role: 'user', parts: [{ text: 'hi' }] }]
      });
      await adapter.isAvailable({
        contents: [{ role: 'user', parts: [{ text: 'hi' }] }]
      });
      expect(createStub).to.have.been.calledOnce;
    });
    it('clears state when download completes', async () => {
      const languageModelProvider = {
        availability: () => Promise.resolve(Availability.downloadable),
        create: () => Promise.resolve({})
      } as LanguageModel;
      let resolveDownload;
      const downloadPromise = new Promise<LanguageModel>(resolveCallback => {
        resolveDownload = resolveCallback;
      });
      const createStub = stub(languageModelProvider, 'create').returns(
        downloadPromise
      );
      const adapter = new ChromeAdapter(languageModelProvider);
      await adapter.isAvailable({
        contents: [{ role: 'user', parts: [{ text: 'hi' }] }]
      });
      resolveDownload!();
      await adapter.isAvailable({
        contents: [{ role: 'user', parts: [{ text: 'hi' }] }]
      });
      expect(createStub).to.have.been.calledTwice;
    });
    it('returns false when model is never available', async () => {
      const languageModelProvider = {
        availability: () => Promise.resolve(Availability.unavailable),
        create: () => Promise.resolve({})
      } as LanguageModel;
      const adapter = new ChromeAdapter(
        languageModelProvider,
        'prefer_on_device'
      );
      expect(
        await adapter.isAvailable({
          contents: [{ role: 'user', parts: [{ text: 'hi' }] }]
        })
      ).to.be.false;
    });
  });
  describe('generateContentOnDevice', () => {
    it('generates content', async () => {
      const languageModelProvider = {
        create: () => Promise.resolve({})
      } as LanguageModel;
      const languageModel = {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        prompt: (p: LanguageModelMessageContent[]) => Promise.resolve('')
      } as LanguageModel;
      const createStub = stub(languageModelProvider, 'create').resolves(
        languageModel
      );
      const promptOutput = 'hi';
      const promptStub = stub(languageModel, 'prompt').resolves(promptOutput);
      const onDeviceParams = {
        systemPrompt: 'be yourself'
      } as LanguageModelCreateOptions;
      const expectedOnDeviceParams = {
        systemPrompt: 'be yourself',
        expectedInputs: [{ type: 'image' }]
      } as LanguageModelCreateOptions;
      const adapter = new ChromeAdapter(
        languageModelProvider,
        'prefer_on_device',
        onDeviceParams
      );
      const request = {
        contents: [{ role: 'user', parts: [{ text: 'anything' }] }]
      } as GenerateContentRequest;
      const response = await adapter.generateContent(request);
      // Asserts initialization params are proxied.
      expect(createStub).to.have.been.calledOnceWith(expectedOnDeviceParams);
      // Asserts Vertex input type is mapped to Chrome type.
      expect(promptStub).to.have.been.calledOnceWith([
        {
          type: 'text',
          content: request.contents[0].parts[0].text
        }
      ]);
      // Asserts expected output.
      expect(await response.json()).to.deep.equal({
        candidates: [
          {
            content: {
              parts: [{ text: promptOutput }]
            }
          }
        ]
      });
    });
    it('generates content using image type input', async () => {
      const languageModelProvider = {
        create: () => Promise.resolve({})
      } as LanguageModel;
      const languageModel = {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        prompt: (p: LanguageModelMessageContent[]) => Promise.resolve('')
      } as LanguageModel;
      const createStub = stub(languageModelProvider, 'create').resolves(
        languageModel
      );
      const promptOutput = 'hi';
      const promptStub = stub(languageModel, 'prompt').resolves(promptOutput);
      const onDeviceParams = {
        systemPrompt: 'be yourself'
      } as LanguageModelCreateOptions;
      const expectedOnDeviceParams = {
        systemPrompt: 'be yourself',
        expectedInputs: [{ type: 'image' }]
      } as LanguageModelCreateOptions;
      const adapter = new ChromeAdapter(
        languageModelProvider,
        'prefer_on_device',
        onDeviceParams
      );
      const request = {
        contents: [
          {
            role: 'user',
            parts: [
              { text: 'anything' },
              {
                inlineData: {
                  data: sampleBase64EncodedImage,
                  mimeType: 'image/jpeg'
                }
              }
            ]
          }
        ]
      } as GenerateContentRequest;
      const response = await adapter.generateContent(request);
      // Asserts initialization params are proxied.
      expect(createStub).to.have.been.calledOnceWith(expectedOnDeviceParams);
      // Asserts Vertex input type is mapped to Chrome type.
      expect(promptStub).to.have.been.calledOnceWith([
        {
          type: 'text',
          content: request.contents[0].parts[0].text
        },
        {
          type: 'image',
          content: match.instanceOf(ImageBitmap)
        }
      ]);
      // Asserts expected output.
      expect(await response.json()).to.deep.equal({
        candidates: [
          {
            content: {
              parts: [{ text: promptOutput }]
            }
          }
        ]
      });
    });
  });
  describe('countTokens', () => {
    it('counts tokens from a singular input', async () => {
      const inputText = 'first';
      const expectedCount = 10;
      const onDeviceParams = {
        systemPrompt: 'be yourself'
      } as LanguageModelCreateOptions;
      const expectedOnDeviceParams = {
        systemPrompt: 'be yourself',
        expectedInputs: [{ type: 'image' }]
      } as LanguageModelCreateOptions;

      // setting up stubs
      const languageModelProvider = {
        create: () => Promise.resolve({})
      } as LanguageModel;
      const languageModel = {
        measureInputUsage: _i => Promise.resolve(123)
      } as LanguageModel;
      const createStub = stub(languageModelProvider, 'create').resolves(
        languageModel
      );

      // overrides impl with stub method
      const measureInputUsageStub = stub(
        languageModel,
        'measureInputUsage'
      ).resolves(expectedCount);

      const adapter = new ChromeAdapter(
        languageModelProvider,
        'prefer_on_device',
        onDeviceParams
      );

      const countTokenRequest = {
        contents: [{ role: 'user', parts: [{ text: inputText }] }]
      } as GenerateContentRequest;
      const response = await adapter.countTokens(countTokenRequest);
      // Asserts initialization params are proxied.
      expect(createStub).to.have.been.calledOnceWith(expectedOnDeviceParams);
      // Asserts Vertex input type is mapped to Chrome type.
      expect(measureInputUsageStub).to.have.been.calledOnceWith([
        {
          type: 'text',
          content: inputText
        }
      ]);
      expect(await response.json()).to.deep.equal({
        totalTokens: expectedCount
      });
    });
  });
  describe('generateContentStream', () => {
    it('generates content stream', async () => {
      const languageModelProvider = {
        create: () => Promise.resolve({})
      } as LanguageModel;
      const languageModel = {
        promptStreaming: _i => new ReadableStream()
      } as LanguageModel;
      const createStub = stub(languageModelProvider, 'create').resolves(
        languageModel
      );
      const part = 'hi';
      const promptStub = stub(languageModel, 'promptStreaming').returns(
        new ReadableStream({
          start(controller) {
            controller.enqueue([part]);
            controller.close();
          }
        })
      );
      const onDeviceParams = {} as LanguageModelCreateOptions;
      const expectedOnDeviceParams = {
        expectedInputs: [{ type: 'image' }]
      } as LanguageModelCreateOptions;
      const adapter = new ChromeAdapter(
        languageModelProvider,
        'prefer_on_device',
        onDeviceParams
      );
      const request = {
        contents: [{ role: 'user', parts: [{ text: 'anything' }] }]
      } as GenerateContentRequest;
      const response = await adapter.generateContentStream(request);
      expect(createStub).to.have.been.calledOnceWith(expectedOnDeviceParams);
      expect(promptStub).to.have.been.calledOnceWith([
        {
          type: 'text',
          content: request.contents[0].parts[0].text
        }
      ]);
      const actual = await toStringArray(response.body!);
      expect(actual).to.deep.equal([
        `data: {"candidates":[{"content":{"role":"model","parts":[{"text":["${part}"]}]}}]}\n\n`
      ]);
    });
    it('generates content stream with image input', async () => {
      const languageModelProvider = {
        create: () => Promise.resolve({})
      } as LanguageModel;
      const languageModel = {
        promptStreaming: _i => new ReadableStream()
      } as LanguageModel;
      const createStub = stub(languageModelProvider, 'create').resolves(
        languageModel
      );
      const part = 'hi';
      const promptStub = stub(languageModel, 'promptStreaming').returns(
        new ReadableStream({
          start(controller) {
            controller.enqueue([part]);
            controller.close();
          }
        })
      );
      const onDeviceParams = {} as LanguageModelCreateOptions;
      const expectedOnDeviceParams = {
        expectedInputs: [{ type: 'image' }]
      } as LanguageModelCreateOptions;
      const adapter = new ChromeAdapter(
        languageModelProvider,
        'prefer_on_device',
        onDeviceParams
      );
      const request = {
        contents: [
          {
            role: 'user',
            parts: [
              { text: 'anything' },
              {
                inlineData: {
                  data: sampleBase64EncodedImage,
                  mimeType: 'image/jpeg'
                }
              }
            ]
          }
        ]
      } as GenerateContentRequest;
      const response = await adapter.generateContentStream(request);
      expect(createStub).to.have.been.calledOnceWith(expectedOnDeviceParams);
      expect(promptStub).to.have.been.calledOnceWith([
        {
          type: 'text',
          content: request.contents[0].parts[0].text
        },
        {
          type: 'image',
          content: match.instanceOf(ImageBitmap)
        }
      ]);
      const actual = await toStringArray(response.body!);
      expect(actual).to.deep.equal([
        `data: {"candidates":[{"content":{"role":"model","parts":[{"text":["${part}"]}]}}]}\n\n`
      ]);
    });
  });
});

// TODO: Move to using image from test-utils.
const sampleBase64EncodedImage =
  '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';
