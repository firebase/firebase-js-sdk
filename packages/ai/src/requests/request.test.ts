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

import { expect, vi, MockInstance } from 'vitest';
import {
  ABORT_ERROR_NAME,
  RequestURL,
  ServerPromptTemplateTask,
  TIMEOUT_EXPIRED_MESSAGE,
  Task,
  getHeaders,
  makeRequest
} from './request';
import { ApiSettings } from '../types/internal';
import { DEFAULT_API_VERSION } from '../constants';
import { AIErrorCode, InferenceMode } from '../types';
import { AIError } from '../errors';
import { getMockResponse } from '../../test-utils/mock-response';
import { AgentPlatformBackend } from '../backend';

const fakeApiSettings: ApiSettings = {
  apiKey: 'key',
  project: 'my-project',
  appId: 'my-appid',
  location: 'global',
  backend: new AgentPlatformBackend()
};

describe('request methods', () => {
  afterEach(() => {
    vi.restoreAllMocks();
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
      expect(url.toString()).toContain('models/model-name:generateContent');
      expect(url.toString()).toContain('alt=sse');
    });
    it('non-stream', async () => {
      const url = new RequestURL({
        model: 'models/model-name',
        task: Task.GENERATE_CONTENT,
        apiSettings: fakeApiSettings,
        stream: false,
        singleRequestOptions: undefined
      });
      expect(url.toString()).toContain('models/model-name:generateContent');
      expect(url.toString()).not.toContain(fakeApiSettings);
      expect(url.toString()).not.toContain('alt=sse');
    });
    it('default apiVersion', async () => {
      const url = new RequestURL({
        model: 'models/model-name',
        task: Task.GENERATE_CONTENT,
        apiSettings: fakeApiSettings,
        stream: false,
        singleRequestOptions: undefined
      });
      expect(url.toString()).toContain(DEFAULT_API_VERSION);
    });
    it('custom baseUrl', async () => {
      const url = new RequestURL({
        model: 'models/model-name',
        task: Task.GENERATE_CONTENT,
        apiSettings: fakeApiSettings,
        stream: false,
        singleRequestOptions: { baseUrl: 'https://my.special.endpoint' }
      });
      expect(url.toString()).toContain('https://my.special.endpoint');
    });
    it('non-stream - tunedModels/', async () => {
      const url = new RequestURL({
        model: 'tunedModels/model-name',
        task: Task.GENERATE_CONTENT,
        apiSettings: fakeApiSettings,
        stream: false,
        singleRequestOptions: undefined
      });
      expect(url.toString()).toContain(
        'tunedModels/model-name:generateContent'
      );
      expect(url.toString()).not.toContain(fakeApiSettings);
      expect(url.toString()).not.toContain('alt=sse');
    });
    it('prompt server template', async () => {
      const url = new RequestURL({
        templateId: 'my-template',
        task: ServerPromptTemplateTask.TEMPLATE_GENERATE_CONTENT,
        apiSettings: fakeApiSettings,
        stream: false,
        singleRequestOptions: undefined
      });
      expect(url.toString()).toContain(
        'templates/my-template:templateGenerateContent'
      );
      expect(url.toString()).not.toContain(fakeApiSettings);
    });
  });
  describe('getHeaders', () => {
    const fakeApiSettings: ApiSettings = {
      apiKey: 'key',
      project: 'myproject',
      appId: 'my-appid',
      location: 'moon',
      backend: new AgentPlatformBackend(),
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
    it('adds client headers (no hybrid)', async () => {
      const headers = await getHeaders(fakeUrl);
      expect(headers.get('x-goog-api-client')).toMatch(
        /gl-js\/[0-9\.]+ fire\/[0-9\.]+$/
      );
    });
    it('adds client headers (if hybrid)', async () => {
      const fakeUrlWithHybrid = new RequestURL({
        model: 'models/model-name',
        task: Task.GENERATE_CONTENT,
        apiSettings: {
          ...fakeApiSettings,
          inferenceMode: InferenceMode.PREFER_ON_DEVICE
        },
        stream: true,
        singleRequestOptions: undefined
      });
      const headers = await getHeaders(fakeUrlWithHybrid);
      expect(headers.get('x-goog-api-client')).toMatch(
        /gl-js\/[0-9\.]+ fire\/[0-9\.]+ hybrid$/
      );
    });
    it('adds api key', async () => {
      const headers = await getHeaders(fakeUrl);
      expect(headers.get('x-goog-api-key')).toBe('key');
    });
    it('adds app id if automatedDataCollectionEnabled is true', async () => {
      const fakeApiSettings: ApiSettings = {
        apiKey: 'key',
        project: 'myproject',
        appId: 'my-appid',
        location: 'moon',
        backend: new AgentPlatformBackend(),
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
      expect(headers.get('X-Firebase-Appid')).toBe('my-appid');
    });
    it('does not add app id if automatedDataCollectionEnabled is undefined', async () => {
      const headers = await getHeaders(fakeUrl);
      expect(headers.get('X-Firebase-Appid')).toBeNull();
    });
    it('does not add app id if automatedDataCollectionEnabled is false', async () => {
      const fakeApiSettings: ApiSettings = {
        apiKey: 'key',
        project: 'myproject',
        appId: 'my-appid',
        location: 'moon',
        backend: new AgentPlatformBackend(),
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
      expect(headers.get('X-Firebase-Appid')).toBeNull();
    });
    it('adds app check token if it exists', async () => {
      const headers = await getHeaders(fakeUrl);
      expect(headers.get('X-Firebase-AppCheck')).toBe('appchecktoken');
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
          backend: new AgentPlatformBackend()
        },
        stream: true,
        singleRequestOptions: undefined
      });
      const headers = await getHeaders(fakeUrl);
      expect(headers.has('X-Firebase-AppCheck')).toBe(false);
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
      expect(headers.has('X-Firebase-AppCheck')).toBe(false);
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
          backend: new AgentPlatformBackend(),
          getAppCheckToken: () =>
            Promise.resolve({ token: 'dummytoken', error: Error('oops') })
        },
        stream: true,
        singleRequestOptions: undefined
      });
      const warnStub = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const headers = await getHeaders(fakeUrl);
      expect(headers.get('X-Firebase-AppCheck')).toBe('dummytoken');
      expect(warnStub).toHaveBeenCalledWith(
        expect.stringMatching(/vertexai/),
        expect.stringMatching(/App Check.*oops/)
      );
      warnStub.mockRestore();
    });
    it('adds auth token if it exists', async () => {
      const headers = await getHeaders(fakeUrl);
      expect(headers.get('Authorization')).toBe('Firebase authtoken');
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
          backend: new AgentPlatformBackend()
        },
        stream: true,
        singleRequestOptions: undefined
      });
      const headers = await getHeaders(fakeUrl);
      expect(headers.has('Authorization')).toBe(false);
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
      expect(headers.has('Authorization')).toBe(false);
    });
  });
  describe('makeRequest', () => {
    let fetchStub: MockInstance;
    const fetchAborter = (
      _url: string,
      options?: RequestInit
    ): Promise<unknown> => {
      expect(options).toBeDefined();
      expect(options!.signal).toBeDefined();
      const signal = options!.signal;
      return new Promise((_resolve, reject): void => {
        const abortListener = (): void => {
          reject(
            new DOMException(signal?.reason || 'Aborted', ABORT_ERROR_NAME)
          );
        };

        signal?.addEventListener('abort', abortListener, { once: true });
      });
    };

    beforeEach(() => {
      fetchStub = vi.spyOn(globalThis, 'fetch');
      vi.useFakeTimers({ now: 0 });
    });

    afterEach(() => {
      vi.restoreAllMocks();
      vi.useRealTimers();
    });

    it('no error', async () => {
      fetchStub.mockResolvedValue({
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
      expect(fetchStub).toHaveBeenCalledTimes(1);
      expect(response.ok).toBe(true);
    });
    it('error with timeout', async () => {
      fetchStub.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: ABORT_ERROR_NAME
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
        expect((e as AIError).code).toBe(AIErrorCode.FETCH_ERROR);
        expect((e as AIError).customErrorData?.status).toBe(500);
        expect((e as AIError).customErrorData?.statusText).toBe(
          ABORT_ERROR_NAME
        );
        expect((e as AIError).message).toContain('500 AbortError');
      }

      expect(fetchStub).toHaveBeenCalledTimes(1);
    });
    it('Network error, no response.json()', async () => {
      fetchStub.mockResolvedValue({
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
        expect((e as AIError).code).toBe(AIErrorCode.FETCH_ERROR);
        expect((e as AIError).customErrorData?.status).toBe(500);
        expect((e as AIError).customErrorData?.statusText).toBe('Server Error');
        expect((e as AIError).message).toContain('500 Server Error');
      }
      expect(fetchStub).toHaveBeenCalledTimes(1);
    });
    it('Network error, includes response.json()', async () => {
      fetchStub.mockResolvedValue({
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
        expect((e as AIError).code).toBe(AIErrorCode.FETCH_ERROR);
        expect((e as AIError).customErrorData?.status).toBe(500);
        expect((e as AIError).customErrorData?.statusText).toBe('Server Error');
        expect((e as AIError).message).toContain('500 Server Error');
        expect((e as AIError).message).toContain('extra info');
      }
      expect(fetchStub).toHaveBeenCalledTimes(1);
    });
    it('Network error, includes response.json() and details', async () => {
      fetchStub.mockResolvedValue({
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
        expect((e as AIError).code).toBe(AIErrorCode.FETCH_ERROR);
        expect((e as AIError).customErrorData?.status).toBe(500);
        expect((e as AIError).customErrorData?.statusText).toBe('Server Error');
        expect((e as AIError).message).toContain('500 Server Error');
        expect((e as AIError).message).toContain('extra info');
        expect((e as AIError).message).toContain('generic::invalid_argument');
      }
      expect(fetchStub).toHaveBeenCalledTimes(1);
    });
    it('Network error, API not enabled', async () => {
      const mockResponse = getMockResponse(
        'vertexAI',
        'unary-failure-firebasevertexai-api-not-enabled.json'
      );
      fetchStub.mockResolvedValue(mockResponse as Response);
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
        expect((e as AIError).code).toBe(AIErrorCode.API_NOT_ENABLED);
        expect((e as AIError).message).toContain('my-project');
        expect((e as AIError).message).toContain('googleapis.com');
      }
      expect(fetchStub).toHaveBeenCalledTimes(1);
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

      await expect(requestPromise).rejects.toThrow(abortReason);

      expect(fetchStub).not.toHaveBeenCalled();
    });
    it('should throw DOMException if external signal aborts during request', async () => {
      fetchStub.mockImplementation(fetchAborter);
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

      const assertion = expect(requestPromise).rejects.toThrow(abortReason);

      await vi.advanceTimersByTimeAsync(0);
      controller.abort(abortReason);

      await assertion;
    });

    it('should abort fetch if timeout expires during request', async () => {
      const timeoutDuration = 100;
      fetchStub.mockImplementation(fetchAborter);

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

      const assertion = expect(requestPromise).rejects.toThrow(
        TIMEOUT_EXPIRED_MESSAGE
      );

      await vi.advanceTimersByTimeAsync(timeoutDuration + 100);

      await assertion;

      expect(fetchStub).toHaveBeenCalledTimes(1);
      const fetchOptions = fetchStub.mock.calls[0][1] as RequestInit;
      const internalSignal = fetchOptions.signal;

      expect(internalSignal?.aborted).toBe(true);
      expect((internalSignal?.reason as Error).name).toBe(ABORT_ERROR_NAME);
      expect((internalSignal?.reason as Error).message).toBe(
        'Timeout has expired.'
      );
    });

    it('should succeed and clear timeout if fetch completes before timeout', async () => {
      const mockResponse = new Response('{}', {
        status: 200,
        statusText: 'OK'
      });
      const fetchPromise = Promise.resolve(mockResponse);
      fetchStub.mockResolvedValue(fetchPromise);
      const clearTimeoutStub = vi.spyOn(globalThis, 'clearTimeout');

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
      await vi.advanceTimersByTimeAsync(10);

      const response = await requestPromise;
      expect(response.ok).toBe(true);
      expect(clearTimeoutStub).toHaveBeenCalledTimes(1);
      expect(fetchStub).toHaveBeenCalledTimes(1);
    });

    it('should use external signal abort reason if it occurs before timeout', async () => {
      const controller = new AbortController();
      const abortReason = 'External Abort Wins';
      const timeoutDuration = 500;
      fetchStub.mockImplementation(fetchAborter);

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

      const assertion = expect(requestPromise).rejects.toThrow(abortReason);

      // Advance time, but less than the timeout
      await vi.advanceTimersByTimeAsync(timeoutDuration / 2);
      controller.abort(abortReason);

      await assertion;
    });

    it('should use timeout reason if it occurs before external signal abort', async () => {
      const controller = new AbortController();
      const abortReason = 'External Abort Loses';
      const timeoutDuration = 100;
      fetchStub.mockImplementation(fetchAborter);

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

      const assertion = expect(requestPromise).rejects.toThrow(
        TIMEOUT_EXPIRED_MESSAGE
      );

      // Advance time past the timeout
      await vi.advanceTimersByTimeAsync(timeoutDuration + 1);

      await assertion;
    });

    it('should pass internal signal to fetch options', async () => {
      const mockResponse = new Response('{}', {
        status: 200,
        statusText: 'OK'
      });
      fetchStub.mockResolvedValue(mockResponse);

      await makeRequest(
        {
          model: 'models/model-name',
          task: Task.GENERATE_CONTENT,
          apiSettings: fakeApiSettings,
          stream: false
        },
        ''
      );

      expect(fetchStub).toHaveBeenCalledTimes(1);
      const fetchOptions = fetchStub.mock.calls[0][1] as RequestInit;
      expect(fetchOptions.signal).toBeDefined();
      expect(fetchOptions.signal).toBeInstanceOf(AbortSignal);
      expect(fetchOptions.signal?.aborted).toBe(false);
    });

    it('should abort immediately if timeout is 0', async () => {
      fetchStub.mockImplementation(fetchAborter);
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

      const assertion = expect(requestPromise).rejects.toThrow(
        TIMEOUT_EXPIRED_MESSAGE
      );

      // Tick the clock just enough to trigger a timeout(0)
      await vi.advanceTimersByTimeAsync(1);

      await assertion;
    });

    it('should not error if signal is aborted after completion', async () => {
      const controller = new AbortController();
      const mockResponse = new Response('{}', {
        status: 200,
        statusText: 'OK'
      });
      fetchStub.mockResolvedValue(mockResponse);

      const response = await makeRequest(
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

      expect(response.ok).toBe(true);
    });
  });
});
