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

use(sinonChai);
use(chaiAsPromised);

describe('ChromeAdapter', () => {
  describe('isOnDeviceRequest', () => {
    it('returns true for simple text part', async () => {
      expect(
        ChromeAdapter._isOnDeviceRequest({
          contents: [{ role: 'user', parts: [{ text: 'hi' }] }]
        })
      ).to.be.true;
    });
    it('returns false if contents empty', async () => {
      expect(
        ChromeAdapter._isOnDeviceRequest({
          contents: []
        })
      ).to.be.false;
    });
  });
  describe('isAvailable', () => {
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
      const adapter = new ChromeAdapter(aiProvider, 'prefer_on_device');
      expect(
        await adapter.isAvailable({
          contents: [{ role: 'user', parts: [{ text: 'hi' }] }]
        })
      ).to.be.false;
      expect(createStub).to.have.been.calledOnce;
    });
    it('avoids redundant downloads', async () => {
      const aiProvider = {
        languageModel: {
          capabilities: () =>
            Promise.resolve({
              available: 'after-download'
            }),
          create: () => {}
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
          create: () => {}
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
});
