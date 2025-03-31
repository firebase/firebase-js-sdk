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
import Sinon, { match, restore, stub, useFakeTimers } from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import { RequestUrl, Task, getHeaders, makeRequest } from './request';
import { ApiSettings } from '../types/internal';
import { DEFAULT_API_VERSION } from '../constants';
import { VertexAIErrorCode } from '../types';
import { VertexAIError } from '../errors';
import { getMockResponse } from '../../test-utils/mock-response';

use(sinonChai);
use(chaiAsPromised);

const fakeApiSettings: ApiSettings = {
  apiKey: 'key',
  project: 'my-project',
  appId: 'my-appid',
  location: 'us-central1'
};

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
    it('custom baseUrl', async () => {
      const url = new RequestUrl(
        'models/model-name',
        Task.GENERATE_CONTENT,
        fakeApiSettings,
        false,
        { baseUrl: 'https://my.special.endpoint' }
      );
      expect(url.toString()).to.include('https://my.special.endpoint');
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
  describe('getHeaders', () => {
    const fakeApiSettings: ApiSettings = {
      apiKey: 'key',
      project: 'myproject',
      appId: 'my-appid',
      location: 'moon',
      getAuthToken: () => Promise.resolve({ accessToken: 'authtoken' }),
      getAppCheckToken: () => Promise.resolve({ token: 'appchecktoken' })
    };
    const fakeUrl = new RequestUrl(
      'models/model-name',
      Task.GENERATE_CONTENT,
      fakeApiSettings,
      true,
      {}
    );
    it('adds client headers', async () => {
      const headers = await getHeaders(fakeUrl);
      expect(headers.get('x-goog-api-client')).to.match(
        /gl-js\/[0-9\.]+ fire\/[0-9\.]+/
      );
    });
    it('adds api key', async () => {
      const headers = await getHeaders(fakeUrl);
      expect(headers.get('x-goog-api-key')).to.equal('key');
    });
    it('adds app id if automatedDataCollectionEnabled is true', async () => {
      const fakeApiSettings: ApiSettings = {
        apiKey: 'key',
        project: 'myproject',
        appId: 'my-appid',
        location: 'moon',
        automaticDataCollectionEnabled: true,
        getAuthToken: () => Promise.resolve({ accessToken: 'authtoken' }),
        getAppCheckToken: () => Promise.resolve({ token: 'appchecktoken' })
      };
      const fakeUrl = new RequestUrl(
        'models/model-name',
        Task.GENERATE_CONTENT,
        fakeApiSettings,
        true,
        {}
      );
      const headers = await getHeaders(fakeUrl);
      expect(headers.get('X-Firebase-Appid')).to.equal('my-appid');
    });
    it('does not add app id if automatedDataCollectionEnabled is undefined', async () => {
      const headers = await getHeaders(fakeUrl);
      expect(headers.get('X-Firebase-Appid')).to.be.null;
    });
    it('does not add app id if automatedDataCollectionEnabled is false', async () => {
      const fakeApiSettings: ApiSettings = {
        apiKey: 'key',
        project: 'myproject',
        appId: 'my-appid',
        location: 'moon',
        automaticDataCollectionEnabled: false,
        getAuthToken: () => Promise.resolve({ accessToken: 'authtoken' }),
        getAppCheckToken: () => Promise.resolve({ token: 'appchecktoken' })
      };
      const fakeUrl = new RequestUrl(
        'models/model-name',
        Task.GENERATE_CONTENT,
        fakeApiSettings,
        true,
        {}
      );
      const headers = await getHeaders(fakeUrl);
      expect(headers.get('X-Firebase-Appid')).to.be.null;
    });
    it('adds app check token if it exists', async () => {
      const headers = await getHeaders(fakeUrl);
      expect(headers.get('X-Firebase-AppCheck')).to.equal('appchecktoken');
    });
    it('ignores app check token header if no appcheck service', async () => {
      const fakeUrl = new RequestUrl(
        'models/model-name',
        Task.GENERATE_CONTENT,
        {
          apiKey: 'key',
          project: 'myproject',
          appId: 'my-appid',
          location: 'moon'
        },
        true,
        {}
      );
      const headers = await getHeaders(fakeUrl);
      expect(headers.has('X-Firebase-AppCheck')).to.be.false;
    });
    it('ignores app check token header if returned token was undefined', async () => {
      const fakeUrl = new RequestUrl(
        'models/model-name',
        Task.GENERATE_CONTENT,
        {
          apiKey: 'key',
          project: 'myproject',
          location: 'moon',
          //@ts-ignore
          getAppCheckToken: () => Promise.resolve()
        },
        true,
        {}
      );
      const headers = await getHeaders(fakeUrl);
      expect(headers.has('X-Firebase-AppCheck')).to.be.false;
    });
    it('ignores app check token header if returned token had error', async () => {
      const fakeUrl = new RequestUrl(
        'models/model-name',
        Task.GENERATE_CONTENT,
        {
          apiKey: 'key',
          project: 'myproject',
          appId: 'my-appid',
          location: 'moon',
          getAppCheckToken: () =>
            Promise.resolve({ token: 'dummytoken', error: Error('oops') })
        },
        true,
        {}
      );
      const warnStub = stub(console, 'warn');
      const headers = await getHeaders(fakeUrl);
      expect(headers.get('X-Firebase-AppCheck')).to.equal('dummytoken');
      expect(warnStub).to.be.calledWith(
        match(/vertexai/),
        match(/App Check.*oops/)
      );
    });
    it('adds auth token if it exists', async () => {
      const headers = await getHeaders(fakeUrl);
      expect(headers.get('Authorization')).to.equal('Firebase authtoken');
    });
    it('ignores auth token header if no auth service', async () => {
      const fakeUrl = new RequestUrl(
        'models/model-name',
        Task.GENERATE_CONTENT,
        {
          apiKey: 'key',
          project: 'myproject',
          appId: 'my-appid',
          location: 'moon'
        },
        true,
        {}
      );
      const headers = await getHeaders(fakeUrl);
      expect(headers.has('Authorization')).to.be.false;
    });
    it('ignores auth token header if returned token was undefined', async () => {
      const fakeUrl = new RequestUrl(
        'models/model-name',
        Task.GENERATE_CONTENT,
        {
          apiKey: 'key',
          project: 'myproject',
          location: 'moon',
          //@ts-ignore
          getAppCheckToken: () => Promise.resolve()
        },
        true,
        {}
      );
      const headers = await getHeaders(fakeUrl);
      expect(headers.has('Authorization')).to.be.false;
    });
  });
  describe('makeRequest', () => {
    let fetchStub: Sinon.SinonStub;
    let clock: Sinon.SinonFakeTimers;
    const fetchAborter = (
      _url: string,
      options?: RequestInit
    ): Promise<unknown> => {
      expect(options).to.not.be.undefined;
      expect(options!.signal).to.not.be.undefined;
      const signal = options!.signal;
      console.log(signal);
      return new Promise((_resolve, reject): void => {
        const abortListener = (): void => {
          reject(new DOMException(signal?.reason || 'Aborted', 'AbortError'));
        };

        signal?.addEventListener('abort', abortListener, { once: true });
      });
    };

    beforeEach(() => {
      fetchStub = stub(globalThis, 'fetch');
      clock = useFakeTimers();
    });

    afterEach(() => {
      restore();
      clock.restore();
    });

    it('no error', async () => {
      fetchStub.resolves({
        ok: true
      } as Response);
      const response = await makeRequest(
        'models/model-name',
        Task.GENERATE_CONTENT,
        fakeApiSettings,
        false,
        ''
      );
      expect(fetchStub).to.be.calledOnce;
      expect(response.ok).to.be.true;
    });
    it('error with timeout', async () => {
      fetchStub.resolves({
        ok: false,
        status: 500,
        statusText: 'AbortError'
      } as Response);

      try {
        await makeRequest(
          'models/model-name',
          Task.GENERATE_CONTENT,
          fakeApiSettings,
          false,
          '',
          {
            timeout: 180000
          }
        );
      } catch (e) {
        expect((e as VertexAIError).code).to.equal(
          VertexAIErrorCode.FETCH_ERROR
        );
        expect((e as VertexAIError).customErrorData?.status).to.equal(500);
        expect((e as VertexAIError).customErrorData?.statusText).to.equal(
          'AbortError'
        );
        expect((e as VertexAIError).message).to.include('500 AbortError');
      }

      expect(fetchStub).to.be.calledOnce;
    });
    it('Network error, no response.json()', async () => {
      fetchStub.resolves({
        ok: false,
        status: 500,
        statusText: 'Server Error'
      } as Response);
      try {
        await makeRequest(
          'models/model-name',
          Task.GENERATE_CONTENT,
          fakeApiSettings,
          false,
          ''
        );
      } catch (e) {
        expect((e as VertexAIError).code).to.equal(
          VertexAIErrorCode.FETCH_ERROR
        );
        expect((e as VertexAIError).customErrorData?.status).to.equal(500);
        expect((e as VertexAIError).customErrorData?.statusText).to.equal(
          'Server Error'
        );
        expect((e as VertexAIError).message).to.include('500 Server Error');
      }
      expect(fetchStub).to.be.calledOnce;
    });
    it('Network error, includes response.json()', async () => {
      fetchStub.resolves({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        json: () => Promise.resolve({ error: { message: 'extra info' } })
      } as Response);
      try {
        await makeRequest(
          'models/model-name',
          Task.GENERATE_CONTENT,
          fakeApiSettings,
          false,
          ''
        );
      } catch (e) {
        expect((e as VertexAIError).code).to.equal(
          VertexAIErrorCode.FETCH_ERROR
        );
        expect((e as VertexAIError).customErrorData?.status).to.equal(500);
        expect((e as VertexAIError).customErrorData?.statusText).to.equal(
          'Server Error'
        );
        expect((e as VertexAIError).message).to.include('500 Server Error');
        expect((e as VertexAIError).message).to.include('extra info');
      }
      expect(fetchStub).to.be.calledOnce;
    });
    it('Network error, includes response.json() and details', async () => {
      fetchStub.resolves({
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
      try {
        await makeRequest(
          'models/model-name',
          Task.GENERATE_CONTENT,
          fakeApiSettings,
          false,
          ''
        );
      } catch (e) {
        expect((e as VertexAIError).code).to.equal(
          VertexAIErrorCode.FETCH_ERROR
        );
        expect((e as VertexAIError).customErrorData?.status).to.equal(500);
        expect((e as VertexAIError).customErrorData?.statusText).to.equal(
          'Server Error'
        );
        expect((e as VertexAIError).message).to.include('500 Server Error');
        expect((e as VertexAIError).message).to.include('extra info');
        expect((e as VertexAIError).message).to.include(
          'generic::invalid_argument'
        );
      }
      expect(fetchStub).to.be.calledOnce;
    });
    it('Network error, API not enabled', async () => {
      const mockResponse = getMockResponse(
        'vertexAI',
        'unary-failure-firebasevertexai-api-not-enabled.json'
      );
      fetchStub.resolves(mockResponse as Response);
      try {
        await makeRequest(
          'models/model-name',
          Task.GENERATE_CONTENT,
          fakeApiSettings,
          false,
          ''
        );
      } catch (e) {
        expect((e as VertexAIError).code).to.equal(
          VertexAIErrorCode.API_NOT_ENABLED
        );
        expect((e as VertexAIError).message).to.include('my-project');
        expect((e as VertexAIError).message).to.include('googleapis.com');
      }
      expect(fetchStub).to.be.calledOnce;
    });

    it('should throw DOMException if external signal is already aborted', async () => {
      const controller = new AbortController();
      const abortReason = 'Aborted before request';
      controller.abort(abortReason);

      const requestPromise = makeRequest(
        'models/model-name',
        Task.GENERATE_CONTENT,
        fakeApiSettings,
        false,
        '{}',
        { signal: controller.signal }
      );

      await expect(requestPromise).to.be.rejectedWith(
        DOMException,
        abortReason
      );

      expect(fetchStub).not.to.have.been.called;
    });
    it('should abort fetch if external signal aborts during request', async () => {
      fetchStub.callsFake(fetchAborter);
      const controller = new AbortController();
      const abortReason = 'Aborted during request';

      const requestPromise = makeRequest(
        'models/model-name',
        Task.GENERATE_CONTENT,
        fakeApiSettings,
        false,
        '{}',
        { signal: controller.signal }
      );

      await clock.tickAsync(0);
      controller.abort(abortReason);

      await expect(requestPromise).to.be.rejectedWith(
        VertexAIError,
        `VertexAI: Error fetching from https://firebasevertexai.googleapis.com/v1beta/projects/my-project/locations/us-central1/models/model-name:generateContent: ${abortReason} (vertexAI/error)`
      );
    });

    it('should abort fetch if timeout expires during request', async () => {
      const timeoutDuration = 100;
      fetchStub.callsFake(fetchAborter);

      const requestPromise = makeRequest(
        'models/model-name',
        Task.GENERATE_CONTENT,
        fakeApiSettings,
        false,
        '{}',
        { timeout: timeoutDuration }
      );

      await clock.tickAsync(timeoutDuration + 100);

      await expect(requestPromise).to.be.rejectedWith(
        VertexAIError,
        /Timeout has expired/
      );

      expect(fetchStub).to.have.been.calledOnce;
      const fetchOptions = fetchStub.firstCall.args[1] as RequestInit;
      const internalSignal = fetchOptions.signal;

      expect(internalSignal?.aborted).to.be.true;
      expect(internalSignal?.reason).to.equal('Timeout has expired.');
    });

    it('should succeed and clear timeout if fetch completes before timeout', async () => {
      const mockResponse = new Response('{}', {
        status: 200,
        statusText: 'OK'
      });
      const fetchPromise = Promise.resolve(mockResponse);
      fetchStub.resolves(fetchPromise);

      const requestPromise = makeRequest(
        'models/model-name',
        Task.GENERATE_CONTENT,
        fakeApiSettings,
        false,
        '{}',
        { timeout: 5000 } // Generous timeout
      );

      // Advance time slightly, well within timeout
      await clock.tickAsync(10);

      const response = await requestPromise;
      expect(response.ok).to.be.true;

      expect(fetchStub).to.have.been.calledOnce;
    });

    it('should succeed and clear timeout/listener if fetch completes with signal provided but not aborted', async () => {
      const controller = new AbortController();
      const mockResponse = new Response('{}', {
        status: 200,
        statusText: 'OK'
      });
      const fetchPromise = Promise.resolve(mockResponse);
      fetchStub.resolves(fetchPromise);

      const requestPromise = makeRequest(
        'models/model-name',
        Task.GENERATE_CONTENT,
        fakeApiSettings,
        false,
        '{}',
        { signal: controller.signal }
      );

      // Advance time slightly
      await clock.tickAsync(10);

      const response = await requestPromise;
      expect(response.ok).to.be.true;
      expect(fetchStub).to.have.been.calledOnce;
    });

    it('should use external signal abort reason if it occurs before timeout', async () => {
      const controller = new AbortController();
      const abortReason = 'External Abort Wins';
      const timeoutDuration = 500;
      fetchStub.callsFake(fetchAborter);

      const requestPromise = makeRequest(
        'models/model-name',
        Task.GENERATE_CONTENT,
        fakeApiSettings,
        false,
        '{}',
        { signal: controller.signal, timeout: timeoutDuration }
      );

      // Advance time, but less than the timeout
      await clock.tickAsync(timeoutDuration / 2);
      controller.abort(abortReason);

      await expect(requestPromise).to.be.rejectedWith(
        VertexAIError,
        abortReason
      );
    });

    it('should use timeout reason if it occurs before external signal abort', async () => {
      const controller = new AbortController();
      const abortReason = 'External Abort Loses';
      const timeoutDuration = 100;
      fetchStub.callsFake(fetchAborter);

      const requestPromise = makeRequest(
        'models/model-name',
        Task.GENERATE_CONTENT,
        fakeApiSettings,
        false,
        '{}',
        { signal: controller.signal, timeout: timeoutDuration }
      );

      // Schedule external abort after timeout
      setTimeout(() => controller.abort(abortReason), timeoutDuration * 2);

      // Advance time past the timeout
      await clock.tickAsync(timeoutDuration + 1);

      await expect(requestPromise).to.be.rejectedWith(
        VertexAIError,
        /Timeout has expired/
      );
    });

    it('should pass internal signal to fetch options', async () => {
      const mockResponse = new Response('{}', {
        status: 200,
        statusText: 'OK'
      });
      fetchStub.resolves(mockResponse);

      await makeRequest(
        'models/model-name',
        Task.GENERATE_CONTENT,
        fakeApiSettings,
        false,
        '{}'
      );

      expect(fetchStub).to.have.been.calledOnce;
      const fetchOptions = fetchStub.firstCall.args[1] as RequestInit;
      expect(fetchOptions.signal).to.exist;
      expect(fetchOptions.signal).to.be.instanceOf(AbortSignal);
      expect(fetchOptions.signal?.aborted).to.be.false;
    });
  });
});
