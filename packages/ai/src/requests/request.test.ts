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
import {
  RequestURL,
  ServerPromptTemplateTask,
  Task,
  getHeaders,
  makeRequest
} from './request';
import { ApiSettings } from '../types/internal';
import { DEFAULT_API_VERSION } from '../constants';
import { AIErrorCode } from '../types';
import { AIError } from '../errors';
import { getMockResponse } from '../../test-utils/mock-response';
import { VertexAIBackend } from '../backend';

use(sinonChai);
use(chaiAsPromised);

const fakeApiSettings: ApiSettings = {
  apiKey: 'key',
  project: 'my-project',
  appId: 'my-appid',
  location: 'us-central1',
  backend: new VertexAIBackend()
};

describe('request methods', () => {
  afterEach(() => {
    restore();
  });
  describe('RequestURL', () => {
    it('stream', async () => {
      const url = new RequestURL({
        model: 'models/model-name',
        task: Task.GENERATE_CONTENT,
        apiSettings: fakeApiSettings,
        stream: true,
        singleRequestOptions: undefined
      });
      expect(url.toString()).to.include('models/model-name:generateContent');
      expect(url.toString()).to.include('alt=sse');
    });
    it('non-stream', async () => {
      const url = new RequestURL({
        model: 'models/model-name',
        task: Task.GENERATE_CONTENT,
        apiSettings: fakeApiSettings,
        stream: false,
        singleRequestOptions: undefined
      });
      expect(url.toString()).to.include('models/model-name:generateContent');
      expect(url.toString()).to.not.include(fakeApiSettings);
      expect(url.toString()).to.not.include('alt=sse');
    });
    it('default apiVersion', async () => {
      const url = new RequestURL({
        model: 'models/model-name',
        task: Task.GENERATE_CONTENT,
        apiSettings: fakeApiSettings,
        stream: false,
        singleRequestOptions: undefined
      });
      expect(url.toString()).to.include(DEFAULT_API_VERSION);
    });
    it('custom baseUrl', async () => {
      const url = new RequestURL({
        model: 'models/model-name',
        task: Task.GENERATE_CONTENT,
        apiSettings: fakeApiSettings,
        stream: false,
        singleRequestOptions: { baseUrl: 'https://my.special.endpoint' }
      });
      expect(url.toString()).to.include('https://my.special.endpoint');
    });
    it('non-stream - tunedModels/', async () => {
      const url = new RequestURL({
        model: 'tunedModels/model-name',
        task: Task.GENERATE_CONTENT,
        apiSettings: fakeApiSettings,
        stream: false,
        singleRequestOptions: undefined
      });
      expect(url.toString()).to.include(
        'tunedModels/model-name:generateContent'
      );
      expect(url.toString()).to.not.include(fakeApiSettings);
      expect(url.toString()).to.not.include('alt=sse');
    });
    it('prompt server template', async () => {
      const url = new RequestURL({
        templateId: 'my-template',
        task: ServerPromptTemplateTask.TEMPLATE_GENERATE_CONTENT,
        apiSettings: fakeApiSettings,
        stream: false,
        singleRequestOptions: undefined
      });
      expect(url.toString()).to.include(
        'templates/my-template:templateGenerateContent'
      );
      expect(url.toString()).to.not.include(fakeApiSettings);
    });
  });
  describe('getHeaders', () => {
    const fakeApiSettings: ApiSettings = {
      apiKey: 'key',
      project: 'myproject',
      appId: 'my-appid',
      location: 'moon',
      backend: new VertexAIBackend(),
      getAuthToken: () => Promise.resolve({ accessToken: 'authtoken' }),
      getAppCheckToken: () => Promise.resolve({ token: 'appchecktoken' })
    };
    const fakeUrl = new RequestURL({
      model: 'models/model-name',
      task: Task.GENERATE_CONTENT,
      apiSettings: fakeApiSettings,
      stream: true,
      singleRequestOptions: undefined
    });
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
        backend: new VertexAIBackend(),
        automaticDataCollectionEnabled: true,
        getAuthToken: () => Promise.resolve({ accessToken: 'authtoken' }),
        getAppCheckToken: () => Promise.resolve({ token: 'appchecktoken' })
      };
      const fakeUrl = new RequestURL({
        model: 'models/model-name',
        task: Task.GENERATE_CONTENT,
        apiSettings: fakeApiSettings,
        stream: true,
        singleRequestOptions: undefined
      });
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
        backend: new VertexAIBackend(),
        automaticDataCollectionEnabled: false,
        getAuthToken: () => Promise.resolve({ accessToken: 'authtoken' }),
        getAppCheckToken: () => Promise.resolve({ token: 'appchecktoken' })
      };
      const fakeUrl = new RequestURL({
        model: 'models/model-name',
        task: Task.GENERATE_CONTENT,
        apiSettings: fakeApiSettings,
        stream: true,
        singleRequestOptions: undefined
      });
      const headers = await getHeaders(fakeUrl);
      expect(headers.get('X-Firebase-Appid')).to.be.null;
    });
    it('adds app check token if it exists', async () => {
      const headers = await getHeaders(fakeUrl);
      expect(headers.get('X-Firebase-AppCheck')).to.equal('appchecktoken');
    });
    it('ignores app check token header if no appcheck service', async () => {
      const fakeUrl = new RequestURL({
        model: 'models/model-name',
        task: Task.GENERATE_CONTENT,
        apiSettings: {
          apiKey: 'key',
          project: 'myproject',
          appId: 'my-appid',
          location: 'moon',
          backend: new VertexAIBackend()
        },
        stream: true,
        singleRequestOptions: undefined
      });
      const headers = await getHeaders(fakeUrl);
      expect(headers.has('X-Firebase-AppCheck')).to.be.false;
    });
    it('ignores app check token header if returned token was undefined', async () => {
      const fakeUrl = new RequestURL({
        model: 'models/model-name',
        task: Task.GENERATE_CONTENT,
        apiSettings: {
          apiKey: 'key',
          project: 'myproject',
          location: 'moon',
          //@ts-ignore
          getAppCheckToken: () => Promise.resolve()
        },
        stream: true,
        singleRequestOptions: undefined
      });
      const headers = await getHeaders(fakeUrl);
      expect(headers.has('X-Firebase-AppCheck')).to.be.false;
    });
    it('ignores app check token header if returned token had error', async () => {
      const fakeUrl = new RequestURL({
        model: 'models/model-name',
        task: Task.GENERATE_CONTENT,
        apiSettings: {
          apiKey: 'key',
          project: 'myproject',
          appId: 'my-appid',
          location: 'moon',
          backend: new VertexAIBackend(),
          getAppCheckToken: () =>
            Promise.resolve({ token: 'dummytoken', error: Error('oops') })
        },
        stream: true,
        singleRequestOptions: undefined
      });
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
      const fakeUrl = new RequestURL({
        model: 'models/model-name',
        task: Task.GENERATE_CONTENT,
        apiSettings: {
          apiKey: 'key',
          project: 'myproject',
          appId: 'my-appid',
          location: 'moon',
          backend: new VertexAIBackend()
        },
        stream: true,
        singleRequestOptions: undefined
      });
      const headers = await getHeaders(fakeUrl);
      expect(headers.has('Authorization')).to.be.false;
    });
    it('ignores auth token header if returned token was undefined', async () => {
      const fakeUrl = new RequestURL({
        model: 'models/model-name',
        task: Task.GENERATE_CONTENT,
        apiSettings: {
          apiKey: 'key',
          project: 'myproject',
          location: 'moon',
          //@ts-ignore
          getAppCheckToken: () => Promise.resolve()
        },
        stream: true,
        singleRequestOptions: undefined
      });
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
        {
          model: 'models/model-name',
          task: Task.GENERATE_CONTENT,
          apiSettings: fakeApiSettings,
          stream: false
        },
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
          {
            model: 'models/model-name',
            task: Task.GENERATE_CONTENT,
            apiSettings: fakeApiSettings,
            stream: false,
            singleRequestOptions: {
              timeout: 180000
            }
          },
          ''
        );
      } catch (e) {
        expect((e as AIError).code).to.equal(AIErrorCode.FETCH_ERROR);
        expect((e as AIError).customErrorData?.status).to.equal(500);
        expect((e as AIError).customErrorData?.statusText).to.equal(
          'AbortError'
        );
        expect((e as AIError).message).to.include('500 AbortError');
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
          {
            model: 'models/model-name',
            task: Task.GENERATE_CONTENT,
            apiSettings: fakeApiSettings,
            stream: false
          },
          ''
        );
      } catch (e) {
        expect((e as AIError).code).to.equal(AIErrorCode.FETCH_ERROR);
        expect((e as AIError).customErrorData?.status).to.equal(500);
        expect((e as AIError).customErrorData?.statusText).to.equal(
          'Server Error'
        );
        expect((e as AIError).message).to.include('500 Server Error');
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
          {
            model: 'models/model-name',
            task: Task.GENERATE_CONTENT,
            apiSettings: fakeApiSettings,
            stream: false
          },
          ''
        );
      } catch (e) {
        expect((e as AIError).code).to.equal(AIErrorCode.FETCH_ERROR);
        expect((e as AIError).customErrorData?.status).to.equal(500);
        expect((e as AIError).customErrorData?.statusText).to.equal(
          'Server Error'
        );
        expect((e as AIError).message).to.include('500 Server Error');
        expect((e as AIError).message).to.include('extra info');
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
          {
            model: 'models/model-name',
            task: Task.GENERATE_CONTENT,
            apiSettings: fakeApiSettings,
            stream: false
          },
          ''
        );
      } catch (e) {
        expect((e as AIError).code).to.equal(AIErrorCode.FETCH_ERROR);
        expect((e as AIError).customErrorData?.status).to.equal(500);
        expect((e as AIError).customErrorData?.statusText).to.equal(
          'Server Error'
        );
        expect((e as AIError).message).to.include('500 Server Error');
        expect((e as AIError).message).to.include('extra info');
        expect((e as AIError).message).to.include('generic::invalid_argument');
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
          {
            model: 'models/model-name',
            task: Task.GENERATE_CONTENT,
            apiSettings: fakeApiSettings,
            stream: false
          },
          ''
        );
      } catch (e) {
        expect((e as AIError).code).to.equal(AIErrorCode.API_NOT_ENABLED);
        expect((e as AIError).message).to.include('my-project');
        expect((e as AIError).message).to.include('googleapis.com');
      }
      expect(fetchStub).to.be.calledOnce;
    });

    it('should throw DOMException if external signal is already aborted', async () => {
      const controller = new AbortController();
      const abortReason = 'Aborted before request';
      controller.abort(abortReason);

      const requestPromise = makeRequest(
        {
          model: 'models/model-name',
          task: Task.GENERATE_CONTENT,
          apiSettings: fakeApiSettings,
          stream: false,
          singleRequestOptions: { signal: controller.signal }
        },
        '{}'
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
        {
          model: 'models/model-name',
          task: Task.GENERATE_CONTENT,
          apiSettings: fakeApiSettings,
          stream: false,
          singleRequestOptions: { signal: controller.signal }
        },
        '{}'
      );

      await clock.tickAsync(0);
      controller.abort(abortReason);

      await expect(requestPromise).to.be.rejectedWith(
        AIError,
        `AI: Error fetching from https://firebasevertexai.googleapis.com/v1beta/projects/my-project/locations/us-central1/models/model-name:generateContent: ${abortReason} (AI/error)`
      );
    });

    it('should abort fetch if timeout expires during request', async () => {
      const timeoutDuration = 100;
      fetchStub.callsFake(fetchAborter);

      const requestPromise = makeRequest(
        {
          model: 'models/model-name',
          task: Task.GENERATE_CONTENT,
          apiSettings: fakeApiSettings,
          stream: false,
          singleRequestOptions: { timeout: timeoutDuration }
        },
        '{}'
      );

      await clock.tickAsync(timeoutDuration + 100);

      await expect(requestPromise).to.be.rejectedWith(
        AIError,
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
        {
          model: 'models/model-name',
          task: Task.GENERATE_CONTENT,
          apiSettings: fakeApiSettings,
          stream: false,
          singleRequestOptions: { timeout: 5000 } // Generous timeout
        },
        '{}'
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
        {
          model: 'models/model-name',
          task: Task.GENERATE_CONTENT,
          apiSettings: fakeApiSettings,
          stream: false,
          singleRequestOptions: { signal: controller.signal } // Generous timeout
        },
        '{}'
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
        {
          model: 'models/model-name',
          task: Task.GENERATE_CONTENT,
          apiSettings: fakeApiSettings,
          stream: false,
          singleRequestOptions: {
            signal: controller.signal,
            timeout: timeoutDuration
          }
        },
        '{}'
      );

      // Advance time, but less than the timeout
      await clock.tickAsync(timeoutDuration / 2);
      controller.abort(abortReason);

      await expect(requestPromise).to.be.rejectedWith(AIError, abortReason);
    });

    it('should use timeout reason if it occurs before external signal abort', async () => {
      const controller = new AbortController();
      const abortReason = 'External Abort Loses';
      const timeoutDuration = 100;
      fetchStub.callsFake(fetchAborter);

      const requestPromise = makeRequest(
        {
          model: 'models/model-name',
          task: Task.GENERATE_CONTENT,
          apiSettings: fakeApiSettings,
          stream: false,
          singleRequestOptions: {
            signal: controller.signal,
            timeout: timeoutDuration
          }
        },
        '{}'
      );

      // Schedule external abort after timeout
      setTimeout(() => controller.abort(abortReason), timeoutDuration * 2);

      // Advance time past the timeout
      await clock.tickAsync(timeoutDuration + 1);

      await expect(requestPromise).to.be.rejectedWith(
        AIError,
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
        {
          model: 'models/model-name',
          task: Task.GENERATE_CONTENT,
          apiSettings: fakeApiSettings,
          stream: false
        },
        ''
      );

      expect(fetchStub).to.have.been.calledOnce;
      const fetchOptions = fetchStub.firstCall.args[1] as RequestInit;
      expect(fetchOptions.signal).to.exist;
      expect(fetchOptions.signal).to.be.instanceOf(AbortSignal);
      expect(fetchOptions.signal?.aborted).to.be.false;
    });

    it('should remove abort listener on successful completion to prevent memory leaks', async () => {
      const controller = new AbortController();
      const addSpy = Sinon.spy(controller.signal, 'addEventListener');
      const removeSpy = Sinon.spy(controller.signal, 'removeEventListener');

      const mockResponse = new Response('{}', {
        status: 200,
        statusText: 'OK'
      });
      fetchStub.resolves(mockResponse);

      await makeRequest(
        {
          model: 'models/model-name',
          task: Task.GENERATE_CONTENT,
          apiSettings: fakeApiSettings,
          stream: false,
          singleRequestOptions: { signal: controller.signal }
        },
        '{}'
      );

      expect(addSpy).to.have.been.calledOnceWith('abort');
      expect(removeSpy).to.have.been.calledOnceWith('abort');
    });

    it('should remove listener if fetch itself rejects', async () => {
      const controller = new AbortController();
      const removeSpy = Sinon.spy(controller.signal, 'removeEventListener');
      const error = new Error('Network failure');
      fetchStub.rejects(error);

      const requestPromise = makeRequest(
        {
          model: 'models/model-name',
          task: Task.GENERATE_CONTENT,
          apiSettings: fakeApiSettings,
          stream: false,
          singleRequestOptions: { signal: controller.signal }
        },
        '{}'
      );

      await expect(requestPromise).to.be.rejectedWith(
        AIError,
        /Network failure/
      );
      expect(removeSpy).to.have.been.calledOnce;
    });

    it('should remove listener if response is not ok', async () => {
      const controller = new AbortController();
      const removeSpy = Sinon.spy(controller.signal, 'removeEventListener');
      const mockResponse = new Response('{}', {
        status: 500,
        statusText: 'Internal Server Error'
      });
      fetchStub.resolves(mockResponse);

      const requestPromise = makeRequest(
        {
          model: 'models/model-name',
          task: Task.GENERATE_CONTENT,
          apiSettings: fakeApiSettings,
          stream: false,
          singleRequestOptions: { signal: controller.signal }
        },
        '{}'
      );

      await expect(requestPromise).to.be.rejectedWith(AIError, /500/);
      expect(removeSpy).to.have.been.calledOnce;
    });

    it('should abort immediately if timeout is 0', async () => {
      fetchStub.callsFake(fetchAborter);
      const requestPromise = makeRequest(
        {
          model: 'models/model-name',
          task: Task.GENERATE_CONTENT,
          apiSettings: fakeApiSettings,
          stream: false,
          singleRequestOptions: { timeout: 0 }
        },
        '{}'
      );

      // Tick the clock just enough to trigger a timeout(0)
      await clock.tickAsync(1);

      await expect(requestPromise).to.be.rejectedWith(
        AIError,
        /Timeout has expired/
      );
    });

    it('should not error if signal is aborted after completion', async () => {
      const controller = new AbortController();
      const removeSpy = Sinon.spy(controller.signal, 'removeEventListener');
      const mockResponse = new Response('{}', {
        status: 200,
        statusText: 'OK'
      });
      fetchStub.resolves(mockResponse);

      await makeRequest(
        {
          model: 'models/model-name',
          task: Task.GENERATE_CONTENT,
          apiSettings: fakeApiSettings,
          stream: false,
          singleRequestOptions: { signal: controller.signal }
        },
        '{}'
      );

      // Listener should be removed, so this abort should do nothing.
      controller.abort('Too late');

      expect(removeSpy).to.have.been.calledOnce;
    });
  });
});
