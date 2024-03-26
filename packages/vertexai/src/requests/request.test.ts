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
import { restore, stub } from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import { DEFAULT_API_VERSION, RequestUrl, Task, makeRequest } from './request';
import { ApiSettings } from '../types/internal';

use(sinonChai);
use(chaiAsPromised);

const fakeApiSettings: ApiSettings = {
  apiKey: 'key',
  project: 'my-project',
  location: 'us-central1'
};

const fakeRequestUrl = new RequestUrl(
  'model-name',
  Task.GENERATE_CONTENT,
  fakeApiSettings,
  true,
  {}
);

describe('request methods', () => {
  afterEach(() => {
    restore();
  });
  describe('RequestUrl', () => {
    it('stream', async () => {
      const url = new RequestUrl(
        'models/model-name',
        Task.GENERATE_CONTENT,
        fakeApiSettings,
        true,
        {}
      );
      expect(url.toString()).to.include('models/model-name:generateContent');
      expect(url.toString()).to.not.include(fakeApiSettings);
      expect(url.toString()).to.include('alt=sse');
    });
    it('non-stream', async () => {
      const url = new RequestUrl(
        'models/model-name',
        Task.GENERATE_CONTENT,
        fakeApiSettings,
        false,
        {}
      );
      expect(url.toString()).to.include('models/model-name:generateContent');
      expect(url.toString()).to.not.include(fakeApiSettings);
      expect(url.toString()).to.not.include('alt=sse');
    });
    it('default apiVersion', async () => {
      const url = new RequestUrl(
        'models/model-name',
        Task.GENERATE_CONTENT,
        fakeApiSettings,
        false,
        {}
      );
      expect(url.toString()).to.include(DEFAULT_API_VERSION);
    });
    it('custom apiVersion', async () => {
      const url = new RequestUrl(
        'models/model-name',
        Task.GENERATE_CONTENT,
        fakeApiSettings,
        false,
        { apiVersion: 'v100omega' }
      );
      expect(url.toString()).to.include(
        '/v100omega/projects/my-project/locations/us-central1/models/model-name'
      );
    });
    it('non-stream - tunedModels/', async () => {
      const url = new RequestUrl(
        'tunedModels/model-name',
        Task.GENERATE_CONTENT,
        fakeApiSettings,
        false,
        {}
      );
      expect(url.toString()).to.include(
        'tunedModels/model-name:generateContent'
      );
      expect(url.toString()).to.not.include(fakeApiSettings);
      expect(url.toString()).to.not.include('alt=sse');
    });
  });
  describe('makeRequest', () => {
    it('no error', async () => {
      const fetchStub = stub(globalThis, 'fetch').resolves({
        ok: true
      } as Response);
      const response = await makeRequest(fakeRequestUrl, '');
      expect(fetchStub).to.be.calledOnce;
      expect(response.ok).to.be.true;
    });
    it('error with timeout', async () => {
      const fetchStub = stub(globalThis, 'fetch').resolves({
        ok: false,
        status: 500,
        statusText: 'AbortError'
      } as Response);

      await expect(
        makeRequest(fakeRequestUrl, '', {
          timeout: 0
        })
      ).to.be.rejectedWith('500 AbortError');
      expect(fetchStub).to.be.calledOnce;
    });
    it('Network error, no response.json()', async () => {
      const fetchStub = stub(globalThis, 'fetch').resolves({
        ok: false,
        status: 500,
        statusText: 'Server Error'
      } as Response);
      await expect(makeRequest(fakeRequestUrl, '')).to.be.rejectedWith(
        /500 Server Error/
      );
      expect(fetchStub).to.be.calledOnce;
    });
    it('Network error, includes response.json()', async () => {
      const fetchStub = stub(globalThis, 'fetch').resolves({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        json: () => Promise.resolve({ error: { message: 'extra info' } })
      } as Response);
      await expect(makeRequest(fakeRequestUrl, '')).to.be.rejectedWith(
        /500 Server Error.*extra info/
      );
      expect(fetchStub).to.be.calledOnce;
    });
    it('Network error, includes response.json() and details', async () => {
      const fetchStub = stub(globalThis, 'fetch').resolves({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        json: () =>
          Promise.resolve({
            error: {
              message: 'extra info',
              details: [
                {
                  '@type': 'type.googleapis.com/google.rpc.DebugInfo',
                  detail:
                    '[ORIGINAL ERROR] generic::invalid_argument: invalid status photos.thumbnailer.Status.Code::5: Source image 0 too short'
                }
              ]
            }
          })
      } as Response);
      await expect(makeRequest(fakeRequestUrl, '')).to.be.rejectedWith(
        /500 Server Error.*extra info.*generic::invalid_argument/
      );
      expect(fetchStub).to.be.calledOnce;
    });
  });
});
