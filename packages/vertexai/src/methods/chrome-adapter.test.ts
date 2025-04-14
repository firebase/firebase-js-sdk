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
import { stub } from 'sinon';
import * as util from '@firebase/util';

use(sinonChai);
use(chaiAsPromised);

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
    it('returns false if browser is not Chrome', async () => {
      const chromeStub = stub(util, 'isChrome').returns(false);
      const adapter = new ChromeAdapter(undefined, 'prefer_on_device');
      expect(
        await adapter.isAvailable({
          contents: []
        })
      ).to.be.false;
      chromeStub.restore();
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
      const adapter = new ChromeAdapter({} as AI, 'prefer_on_device');
      expect(
        await adapter.isAvailable({
          contents: []
        })
      ).to.be.false;
    });
    it('returns false if request contents empty', async () => {
      const adapter = new ChromeAdapter({} as AI, 'prefer_on_device');
      expect(
        await adapter.isAvailable({
          contents: []
        })
      ).to.be.false;
    });
    it('returns false if request content has function role', async () => {
      const adapter = new ChromeAdapter({} as AI, 'prefer_on_device');
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
      const adapter = new ChromeAdapter({} as AI, 'prefer_on_device');
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
      const adapter = new ChromeAdapter({} as AI, 'prefer_on_device');
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
    it('returns true if model is readily available', async () => {
      const aiProvider = {
        languageModel: {
          capabilities: () =>
            Promise.resolve({
              available: 'readily'
            })
        }
      } as AI;
      const adapter = new ChromeAdapter(aiProvider, 'prefer_on_device');
      expect(
        await adapter.isAvailable({
          contents: [{ role: 'user', parts: [{ text: 'hi' }] }]
        })
      ).to.be.true;
    });
    it('returns false and triggers download when model is available after download', async () => {
      const aiProvider = {
        languageModel: {
          capabilities: () =>
            Promise.resolve({
              available: 'after-download'
            }),
          create: () => Promise.resolve({})
        }
      } as AI;
      const createStub = stub(aiProvider.languageModel, 'create').resolves(
        {} as AILanguageModel
      );
      const onDeviceParams = {} as AILanguageModelCreateOptionsWithSystemPrompt;
      const adapter = new ChromeAdapter(
        aiProvider,
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
      const aiProvider = {
        languageModel: {
          capabilities: () =>
            Promise.resolve({
              available: 'after-download'
            }),
          create: () => { }
        }
      } as AI;
      const downloadPromise = new Promise<AILanguageModel>(() => {
        /* never resolves */
      });
      const createStub = stub(aiProvider.languageModel, 'create').returns(
        downloadPromise
      );
      const adapter = new ChromeAdapter(aiProvider);
      await adapter.isAvailable({
        contents: [{ role: 'user', parts: [{ text: 'hi' }] }]
      });
      await adapter.isAvailable({
        contents: [{ role: 'user', parts: [{ text: 'hi' }] }]
      });
      expect(createStub).to.have.been.calledOnce;
    });
    it('clears state when download completes', async () => {
      const aiProvider = {
        languageModel: {
          capabilities: () =>
            Promise.resolve({
              available: 'after-download'
            }),
          create: () => { }
        }
      } as AI;
      let resolveDownload;
      const downloadPromise = new Promise<AILanguageModel>(resolveCallback => {
        resolveDownload = resolveCallback;
      });
      const createStub = stub(aiProvider.languageModel, 'create').returns(
        downloadPromise
      );
      const adapter = new ChromeAdapter(aiProvider);
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
      const aiProvider = {
        languageModel: {
          capabilities: () =>
            Promise.resolve({
              available: 'no'
            })
        }
      } as AI;
      const adapter = new ChromeAdapter(aiProvider, 'prefer_on_device');
      expect(
        await adapter.isAvailable({
          contents: [{ role: 'user', parts: [{ text: 'hi' }] }]
        })
      ).to.be.false;
    });
  });
  describe('generateContentOnDevice', () => {
    it('Extracts and concats initial prompts', async () => {
      const aiProvider = {
        languageModel: {
          create: () => Promise.resolve({})
        }
      } as AI;
      const factoryStub = stub(aiProvider.languageModel, 'create').resolves({
        prompt: s => Promise.resolve(s)
      } as AILanguageModel);
      const text = ['first', 'second', 'third'];
      const onDeviceParams = {
        initialPrompts: [{ role: 'user', content: text[0] }]
      } as AILanguageModelCreateOptionsWithSystemPrompt;
      const adapter = new ChromeAdapter(
        aiProvider,
        'prefer_on_device',
        onDeviceParams
      );
      const response = await adapter.generateContentOnDevice({
        contents: [
          { role: 'model', parts: [{ text: text[1] }] },
          { role: 'user', parts: [{ text: text[2] }] }
        ]
      });
      expect(factoryStub).to.have.been.calledOnceWith({
        initialPrompts: [
          { role: 'user', content: text[0] },
          // Asserts tail is passed as initial prompts, and
          // role is normalized from model to assistant.
          { role: 'assistant', content: text[1] }
        ]
      });
      expect(await response.json()).to.deep.equal({
        candidates: [
          {
            content: {
              parts: [{ text: text[2] }]
            }
          }
        ]
      });
    });
    it('Extracts system prompt', async () => {
      const aiProvider = {
        languageModel: {
          create: () => Promise.resolve({})
        }
      } as AI;
      const factoryStub = stub(aiProvider.languageModel, 'create').resolves({
        prompt: s => Promise.resolve(s)
      } as AILanguageModel);
      const onDeviceParams = {
        systemPrompt: 'be yourself'
      } as AILanguageModelCreateOptionsWithSystemPrompt;
      const adapter = new ChromeAdapter(
        aiProvider,
        'prefer_on_device',
        onDeviceParams
      );
      const text = 'hi';
      const response = await adapter.generateContentOnDevice({
        contents: [{ role: 'user', parts: [{ text }] }]
      });
      expect(factoryStub).to.have.been.calledOnceWith({
        initialPrompts: [],
        systemPrompt: onDeviceParams.systemPrompt
      });
      expect(await response.json()).to.deep.equal({
        candidates: [
          {
            content: {
              parts: [{ text }]
            }
          }
        ]
      });
    });
  });
  describe('countTokens', () => {
    it('Extracts initial prompts and counts tokens', async () => {
      const aiProvider = {
        languageModel: {
          create: () => Promise.resolve({})
        }
      } as AI;
      const expectedCount = 10;
      const countPromptTokensStub = stub().resolves(expectedCount);
      const factoryStub = stub(aiProvider.languageModel, 'create').resolves({
        countPromptTokens: countPromptTokensStub
      } as unknown as AILanguageModel);
      const text = ['first', 'second', 'third'];
      const onDeviceParams = {
        initialPrompts: [{ role: 'user', content: text[0] }]
      } as AILanguageModelCreateOptionsWithSystemPrompt;
      const adapter = new ChromeAdapter(
        aiProvider,
        'prefer_on_device',
        onDeviceParams
      );
      const response = await adapter.countTokens({
        contents: [
          { role: 'model', parts: [{ text: text[1] }] },
          { role: 'user', parts: [{ text: text[2] }] }
        ]
      });
      expect(factoryStub).to.have.been.calledOnceWith({
        initialPrompts: [
          { role: 'user', content: text[0] },
          // Asserts tail is passed as initial prompts, and
          // role is normalized from model to assistant.
          { role: 'assistant', content: text[1] }
        ]
      });
      expect(countPromptTokensStub).to.have.been.calledOnceWith({
        role: 'user',
        content: text[2]
      });
      expect(await response.json()).to.deep.equal({
        totalTokens: expectedCount
      });
    });
  });
});
