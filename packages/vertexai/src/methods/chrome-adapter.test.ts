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
  LanguageModelCreateOptions
} from '../types/language-model';
import { stub } from 'sinon';
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
    it('returns false if request content has multiple parts', async () => {
      const adapter = new ChromeAdapter(
        {} as LanguageModel,
        'prefer_on_device'
      );
      expect(
        await adapter.isAvailable({
          contents: [
            {
              role: 'user',
              parts: [{ text: 'a' }, { text: 'b' }]
            }
          ]
        })
      ).to.be.false;
    });
    it('returns false if request content has non-text part', async () => {
      const adapter = new ChromeAdapter(
        {} as LanguageModel,
        'prefer_on_device'
      );
      expect(
        await adapter.isAvailable({
          contents: [
            {
              role: 'user',
              parts: [{ inlineData: { mimeType: 'a', data: 'b' } }]
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
      const onDeviceParams = {} as LanguageModelCreateOptions;
      const adapter = new ChromeAdapter(
        languageModelProvider,
        'prefer_on_device',
        onDeviceParams
      );
      expect(
        await adapter.isAvailable({
          contents: [{ role: 'user', parts: [{ text: 'hi' }] }]
        })
      ).to.be.false;
      expect(createStub).to.have.been.calledOnceWith(onDeviceParams);
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
        prompt: i => Promise.resolve(i)
      } as LanguageModel;
      const createStub = stub(languageModelProvider, 'create').resolves(
        languageModel
      );
      const promptOutput = 'hi';
      const promptStub = stub(languageModel, 'prompt').resolves(promptOutput);
      const onDeviceParams = {
        systemPrompt: 'be yourself'
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
      expect(createStub).to.have.been.calledOnceWith(onDeviceParams);
      // Asserts Vertex input type is mapped to Chrome type.
      expect(promptStub).to.have.been.calledOnceWith([
        {
          role: request.contents[0].role,
          content: [
            {
              type: 'text',
              content: request.contents[0].parts[0].text
            }
          ]
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
  describe('generateContentStreamOnDevice', () => {
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
      const adapter = new ChromeAdapter(
        languageModelProvider,
        'prefer_on_device',
        onDeviceParams
      );
      const request = {
        contents: [{ role: 'user', parts: [{ text: 'anything' }] }]
      } as GenerateContentRequest;
      const response = await adapter.generateContentStream(request);
      expect(createStub).to.have.been.calledOnceWith(onDeviceParams);
      expect(promptStub).to.have.been.calledOnceWith([
        {
          role: request.contents[0].role,
          content: [
            {
              type: 'text',
              content: request.contents[0].parts[0].text
            }
          ]
        }
      ]);
      const actual = await toStringArray(response.body!);
      expect(actual).to.deep.equal([
        `data: {"candidates":[{"content":{"role":"model","parts":[{"text":["${part}"]}]}}]}\n\n`
      ]);
    });
  });
});
