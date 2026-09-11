/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { expect, use, vi, MockInstance } from 'vitest';
import { RealtimeHandler } from '../../src/client/realtime_handler';
import { _FirebaseInstallationsInternal } from '@firebase/installations';
import { Logger } from '@firebase/logger';
import { Storage } from '../../src/storage/storage';
import { StorageCache } from '../../src/storage/storage_cache';
import { CachingClient } from '../../src/client/caching_client';
import { ConfigUpdateObserver, FetchResponse } from '../../src/public_types';
import { ErrorCode } from '../../src/errors';
import { VisibilityMonitor } from '../../src/client/visibility_monitor';
const FAKE_APP_ID = '1:123456789:web:abcdef';
const INSTALLATION_ID_STRING = 'installation-id-123';
const INSTALLATION_AUTH_TOKEN_STRING = 'installation-auth-token-456';
const PROJECT_NUMBER = '123456789';
const API_KEY = 'api-key-123';
const FAKE_NOW = 1234567890;
const ORIGINAL_RETRIES = 8;
const MAXIMUM_FETCH_ATTEMPTS = 3;

const DUMMY_FETCH_RESPONSE: FetchResponse = {
  status: 200,
  config: { testKey: 'test_value' },
  eTag: 'etag-2',
  templateVersion: 2
};

// Helper to create a mock ReadableStream from a string array.
function createMockReadableStream(
  chunks: string[] = []
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    }
  });
}

function createStreamingMockReader(
  chunks: string[]
): ReadableStreamDefaultReader<Uint8Array> {
  const stream = createMockReadableStream(chunks);
  const reader = stream.getReader();
  const originalRead = reader.read;
  vi.spyOn(reader, 'read').mockImplementation(originalRead.bind(reader));
  return reader;
}

describe('RealtimeHandler', () => {
  let mockFetch: MockInstance;
  let mockInstallations: any;
  let mockStorage: any;
  let mockStorageCache: any;
  let mockCachingClient: any;
  let mockLogger: any;
  let realtime: RealtimeHandler;
  let clock: any;
  let visibilityMonitorOnStub: MockInstance;

  beforeEach(async () => {
    mockFetch = vi.spyOn(window, 'fetch').mockResolvedValue(new Response());
    mockInstallations = {
      getId: vi.fn().mockResolvedValue(INSTALLATION_ID_STRING),
      getToken: vi.fn().mockResolvedValue(INSTALLATION_AUTH_TOKEN_STRING)
    } as any;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    } as any;

    mockStorage = {
      getRealtimeBackoffMetadata: vi.fn().mockResolvedValue(undefined),
      setRealtimeBackoffMetadata: vi.fn().mockResolvedValue(),
      getActiveConfigEtag: vi.fn().mockResolvedValue('etag-1'),
      getActiveConfigTemplateVersion: vi.fn().mockResolvedValue(1),
      getActiveConfig: vi.fn().mockResolvedValue({}),

      getLastFetchStatus: vi.fn(),
      setLastFetchStatus: vi.fn(),
      getLastSuccessfulFetchTimestampMillis: vi.fn(),
      setLastSuccessfulFetchTimestampMillis: vi.fn(),
      getLastSuccessfulFetchResponse: vi.fn(),
      setLastSuccessfulFetchResponse: vi.fn(),
      setActiveConfig: vi.fn(),
      setActiveConfigEtag: vi.fn(),
      getThrottleMetadata: vi.fn(),
      setThrottleMetadata: vi.fn(),
      deleteThrottleMetadata: vi.fn(),
      getCustomSignals: vi.fn(),
      setCustomSignals: vi.fn(),
      setActiveConfigTemplateVersion: vi.fn()
    } as any;

    mockStorageCache = {
      getLastFetchStatus: vi.fn().mockReturnValue('success'),
      getCustomSignals: vi.fn().mockReturnValue(undefined)
    } as any;
    mockStorageCache.getLastFetchStatus.mockReturnValue('success');
    mockStorageCache.getCustomSignals.mockReturnValue(undefined);

    mockCachingClient = {
      fetch: vi.fn().mockResolvedValue(DUMMY_FETCH_RESPONSE)
    } as any;
    mockCachingClient.fetch.mockResolvedValue(DUMMY_FETCH_RESPONSE);

    visibilityMonitorOnStub = vi.fn();
    vi.spyOn(VisibilityMonitor, 'getInstance').mockReturnValue({
      on: visibilityMonitorOnStub
    } as any);

    vi.useFakeTimers({ now: FAKE_NOW });

    realtime = new RealtimeHandler(
      mockInstallations,
      mockStorage as any,
      'sdk-version',
      'namespace',
      PROJECT_NUMBER,
      API_KEY,
      FAKE_APP_ID,
      mockLogger as any,
      mockStorageCache as any,
      mockCachingClient as any
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should initialize with default retries if no backoff metadata in storage', async () => {
      await vi.runAllTimersAsync();
      expect((realtime as any).httpRetriesRemaining).toBe(ORIGINAL_RETRIES);
    });

    it('should set retries remaining from storage if available', async () => {
      mockStorage.getRealtimeBackoffMetadata.mockResolvedValue({
        backoffEndTimeMillis: new Date(FAKE_NOW - 1000), // In the past, so no backoff
        numFailedStreams: 3
      });

      realtime = new RealtimeHandler(
        mockInstallations,
        mockStorage as any,
        'sdk-version',
        'namespace',
        PROJECT_NUMBER,
        API_KEY,
        FAKE_APP_ID,
        mockLogger as any,
        mockStorageCache as any,
        mockCachingClient as any
      );
      await vi.runAllTimersAsync();
      expect((realtime as any).httpRetriesRemaining).toBe(ORIGINAL_RETRIES - 3);
    });
  });

  describe('getRealtimeUrl', () => {
    it('should construct the correct URL', () => {
      const url = (realtime as any).getRealtimeUrl();
      expect(url.toString()).toBe(
        `https://firebaseremoteconfigrealtime.googleapis.com/v1/projects/${PROJECT_NUMBER}/namespaces/namespace:streamFetchInvalidations?key=${API_KEY}`
      );
    });

    it('should use the URL base from window if it exists', () => {
      (window as any).FIREBASE_REMOTE_CONFIG_URL_BASE =
        'https://test.googleapis.com';
      const url = (realtime as any).getRealtimeUrl();
      expect(url.toString()).toBe(
        `https://test.googleapis.com/v1/projects/${PROJECT_NUMBER}/namespaces/namespace:streamFetchInvalidations?key=${API_KEY}`
      );
      delete (window as any).FIREBASE_REMOTE_CONFIG_URL_BASE;
    });
  });

  describe('isStatusCodeRetryable', () => {
    it('should return true for retryable status codes', () => {
      const retryableCodes = [408, 429, 502, 503, 504];
      retryableCodes.forEach(code => {
        expect((realtime as any).isStatusCodeRetryable(code)).toBe(true);
      });
    });

    it('should return true for undefined status code', () => {
      expect((realtime as any).isStatusCodeRetryable(undefined)).toBe(true);
    });

    it('should return false for non-retryable status codes', () => {
      // This is a sample of non-retryable codes for testing purposes.
      const nonRetryableCodes = [200, 304, 400, 401, 403];
      nonRetryableCodes.forEach(code => {
        expect((realtime as any).isStatusCodeRetryable(code)).toBe(false);
      });
    });
  });

  describe('updateBackoffMetadataWithLastFailedStreamConnectionTime', () => {
    it('should increment numFailedStreams and set backoffEndTimeMillis', async () => {
      const spy = mockStorage.setRealtimeBackoffMetadata;
      const lastFailedTime = new Date(FAKE_NOW);

      await (
        realtime as any
      ).updateBackoffMetadataWithLastFailedStreamConnectionTime(lastFailedTime);

      expect(spy).toHaveBeenCalledTimes(1);
      const metadata = spy.mock.calls[0][0];
      expect(metadata.numFailedStreams).toBe(1);
      expect(metadata.backoffEndTimeMillis.getTime()).toBeGreaterThan(
        lastFailedTime.getTime()
      );
    });
  });

  describe('updateBackoffMetadataWithRetryInterval', () => {
    it('should set backoffEndTimeMillis based on provided retryIntervalSeconds and then retry connection', async () => {
      const setMetadataSpy = mockStorage.setRealtimeBackoffMetadata;
      const retryHttpConnectionSpy = vi.spyOn(
        realtime as any,
        'retryHttpConnectionWhenBackoffEnds'
      );
      const retryInterval = 10;

      await (realtime as any).updateBackoffMetadataWithRetryInterval(
        retryInterval
      );

      expect(setMetadataSpy).toHaveBeenCalledTimes(1);
      const metadata = setMetadataSpy.mock.calls[0][0];
      expect(metadata.backoffEndTimeMillis.getTime()).toBeCloseTo(
        FAKE_NOW + retryInterval * 1000,
        100
      );
      expect(retryHttpConnectionSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('closeRealtimeHttpConnection', () => {
    let mockController: any;
    let mockReader: any;

    beforeEach(() => {
      mockController = {
        abort: vi.fn()
      } as any;
      mockReader = {
        cancel: vi.fn().mockResolvedValue(undefined),
        read: vi.fn()
      } as any;
      (realtime as any).controller = mockController;
      (realtime as any).reader = mockReader;
    });

    it('should abort controller and cancel reader', async () => {
      await (realtime as any).closeRealtimeHttpConnection();
      expect(mockController.abort).toHaveBeenCalledTimes(1);
      expect(mockReader.cancel).toHaveBeenCalledTimes(1);
      expect((realtime as any).controller).toBeUndefined();
      expect((realtime as any).reader).toBeUndefined();
    });

    it('should handle reader cancellation failure gracefully', async () => {
      mockReader.cancel.mockRejectedValue(new Error('test error'));
      await (realtime as any).closeRealtimeHttpConnection();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Failed to cancel the reader, connection was lost.'
      );
      // Should still clear reader
      expect((realtime as any).reader).toBeUndefined();
    });

    it('should handle being called when reader is already undefined', async () => {
      (realtime as any).reader = undefined;
      await (realtime as any).closeRealtimeHttpConnection();
      expect(mockController.abort).toHaveBeenCalledTimes(1);
      expect((realtime as any).controller).toBeUndefined();
    });

    it('should handle being called when controller is already undefined', async () => {
      (realtime as any).controller = undefined;
      await (realtime as any).closeRealtimeHttpConnection();
      expect(mockReader.cancel).toHaveBeenCalledTimes(1);
      expect((realtime as any).reader).toBeUndefined();
    });
  });

  describe('resetRealtimeBackoff', () => {
    it('should reset backoff metadata in storage', async () => {
      const spy = mockStorage.setRealtimeBackoffMetadata;
      await (realtime as any).resetRealtimeBackoff();
      expect(spy).toHaveBeenCalledTimes(1);
      const metadata = spy.mock.calls[0][0];
      expect(metadata.numFailedStreams).toBe(0);
      expect(metadata.backoffEndTimeMillis.getTime()).toBe(-1);
    });
  });

  describe('establishRealtimeConnection', () => {
    it('should send correct headers and body for realtime connection', async () => {
      mockStorage.getActiveConfigEtag.mockResolvedValue('current-etag');
      mockStorage.getActiveConfigTemplateVersion.mockResolvedValue(10);

      const url = new URL('https://example.com/stream');
      const signal = new AbortController().signal;

      await (realtime as any).establishRealtimeConnection(
        url,
        INSTALLATION_ID_STRING,
        INSTALLATION_AUTH_TOKEN_STRING,
        signal
      );

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [fetchUrl, fetchOptions] = mockFetch.mock.calls[0];
      expect(fetchUrl).toBe(url);
      expect(fetchOptions.method).toBe('POST');
      expect(fetchOptions.headers).toEqual(
        expect.objectContaining({
          'X-Goog-Api-Key': API_KEY,
          'X-Goog-Firebase-Installations-Auth': INSTALLATION_AUTH_TOKEN_STRING,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'If-None-Match': 'current-etag',
          'Content-Encoding': 'gzip'
        })
      );
      const body = JSON.parse(fetchOptions.body as string);
      expect(body).toEqual({
        project: PROJECT_NUMBER,
        namespace: 'namespace',
        lastKnownVersionNumber: 10,
        appId: FAKE_APP_ID,
        sdkVersion: 'sdk-version',
        appInstanceId: INSTALLATION_ID_STRING
      });
    });
  });

  describe('retryHttpConnectionWhenBackoffEnds', () => {
    let makeRealtimeHttpConnectionSpy: MockInstance;

    beforeEach(() => {
      makeRealtimeHttpConnectionSpy = vi.spyOn(
        realtime as any,
        'makeRealtimeHttpConnection'
      );
    });

    it('should call makeRealtimeHttpConnection with 0 delay if no backoff metadata', async () => {
      mockStorage.getRealtimeBackoffMetadata.mockResolvedValue(undefined);
      await (realtime as any).retryHttpConnectionWhenBackoffEnds();
      expect(makeRealtimeHttpConnectionSpy).toHaveBeenCalledWith(0);
    });

    it('should call makeRealtimeHttpConnection with calculated delay if backoff metadata exists', async () => {
      mockStorage.getRealtimeBackoffMetadata.mockResolvedValue({
        // 5 seconds in the future
        backoffEndTimeMillis: new Date(FAKE_NOW + 5000),
        numFailedStreams: 1
      });
      await (realtime as any).retryHttpConnectionWhenBackoffEnds();
      expect(makeRealtimeHttpConnectionSpy).toHaveBeenCalledTimes(1);
      const delay = makeRealtimeHttpConnectionSpy.mock.calls[0][0];
      expect(delay).toBeCloseTo(5000, 100);
    });
  });

  describe('fetchResponseIsUpToDate', () => {
    it('should return true if templateVersion is greater or equal', () => {
      const fetchResponse: FetchResponse = {
        config: { k: 'v' },
        templateVersion: 5,
        status: 200,
        eTag: 'e'
      };
      const result = (realtime as any).fetchResponseIsUpToDate(
        fetchResponse,
        5
      );
      expect(result).toBe(true);
    });

    it('should return false if templateVersion is smaller', () => {
      const fetchResponse: FetchResponse = {
        config: { k: 'v' },
        templateVersion: 4,
        status: 200,
        eTag: 'e'
      };
      const result = (realtime as any).fetchResponseIsUpToDate(
        fetchResponse,
        5
      );
      expect(result).toBe(false);
    });

    it('should return true if no config and lastFetchStatus is success', () => {
      const fetchResponse: FetchResponse = {
        config: undefined,
        templateVersion: undefined,
        status: 304,
        eTag: 'e'
      };
      mockStorageCache.getLastFetchStatus.mockReturnValue('success');
      const result = (realtime as any).fetchResponseIsUpToDate(
        fetchResponse,
        5
      );
      expect(result).toBe(true);
    });

    it('should return false if no config and lastFetchStatus is not success', () => {
      const fetchResponse: FetchResponse = {
        config: undefined,
        templateVersion: undefined,
        status: 304,
        eTag: 'e'
      };
      mockStorageCache.getLastFetchStatus.mockReturnValue('throttle'); // Or any other non-'success' status
      const result = (realtime as any).fetchResponseIsUpToDate(
        fetchResponse,
        5
      );
      expect(result).toBe(false);
    });
  });

  describe('fetchLatestConfig', () => {
    let autoFetchSpy: MockInstance;
    let executeAllListenerCallbacksSpy: MockInstance;

    beforeEach(() => {
      autoFetchSpy = vi.spyOn(realtime as any, 'autoFetch');
      executeAllListenerCallbacksSpy = vi.spyOn(
        realtime as any,
        'executeAllListenerCallbacks'
      );
      mockStorage.getActiveConfig.mockResolvedValue({ existingKey: 'value' });
      mockStorage.getActiveConfigTemplateVersion.mockResolvedValue(1);
    });

    afterEach(() => {
      autoFetchSpy.mockRestore();
      executeAllListenerCallbacksSpy.mockRestore();
    });

    it('should fetch, identify changed keys, and notify observers', async () => {
      mockCachingClient.fetch.mockResolvedValue({
        config: { existingKey: 'new_value', newKey: 'value' },
        templateVersion: 2,
        status: 200,
        eTag: 'e'
      });

      await (realtime as any).fetchLatestConfig(MAXIMUM_FETCH_ATTEMPTS, 2);

      expect(mockCachingClient.fetch).toHaveBeenCalledTimes(1);
      expect(executeAllListenerCallbacksSpy).toHaveBeenCalledTimes(1);
      const configUpdate = executeAllListenerCallbacksSpy.mock.calls[0][0];
      expect(configUpdate.getUpdatedKeys()).toEqual(
        new Set(['existingKey', 'newKey'])
      );
    });

    it('should retry with autoFetch if fetched version is not up-to-date', async () => {
      autoFetchSpy.mockRestore();
      const autoFetchStub = vi
        .spyOn(realtime as any, 'autoFetch')
        .mockResolvedValue(undefined);

      mockCachingClient.fetch.mockResolvedValue({
        config: { k: 'v' },
        templateVersion: 1,
        status: 200,
        eTag: 'e'
      });
      mockStorage.getActiveConfigTemplateVersion.mockResolvedValue(0);

      await (realtime as any).fetchLatestConfig(MAXIMUM_FETCH_ATTEMPTS, 2);

      expect(mockCachingClient.fetch).toHaveBeenCalledTimes(1);
      expect(autoFetchStub).toHaveBeenCalledWith(MAXIMUM_FETCH_ATTEMPTS - 1, 2);
    });

    it('should not notify if no keys have changed', async () => {
      mockCachingClient.fetch.mockResolvedValue({
        config: { existingKey: 'value' },
        templateVersion: 2,
        status: 200,
        eTag: 'e'
      });

      await (realtime as any).fetchLatestConfig(MAXIMUM_FETCH_ATTEMPTS, 2);

      expect(executeAllListenerCallbacksSpy).not.toHaveBeenCalled();
    });

    it('should propagate error on fetch failure', async () => {
      const testError = new Error('Network failed');
      mockCachingClient.fetch.mockRejectedValue(testError);
      const propagateErrorSpy = vi.spyOn(realtime as any, 'propagateError');

      await (realtime as any).fetchLatestConfig(MAXIMUM_FETCH_ATTEMPTS, 2);

      expect(propagateErrorSpy).toHaveBeenCalledTimes(1);
      const error = propagateErrorSpy.mock.calls[0][0];
      expect(error.code).toContain(ErrorCode.CONFIG_UPDATE_NOT_FETCHED);
    });

    it('should include custom signals in fetch request', async () => {
      mockStorageCache.getCustomSignals.mockReturnValue({ signal1: 'value1' });

      await (realtime as any).fetchLatestConfig(MAXIMUM_FETCH_ATTEMPTS, 2);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Fetching config with custom signals: {"signal1":"value1"}`
      );
    });

    it('should identify changed keys from updated experiment descriptions', async () => {
      mockStorage.getActiveConfig.mockResolvedValue({
        keyA: 'valueA',
        keyB: 'valueB',
        keyC: 'valueC'
      });
      mockStorage.getLastSuccessfulFetchResponse.mockResolvedValue({
        status: 200,
        config: { keyA: 'valueA', keyB: 'valueB', keyC: 'valueC' },
        experiments: [
          {
            experimentId: 'exp1',
            variantId: '1',
            experimentStartTime: '',
            triggerTimeoutMillis: '',
            timeToLiveMillis: '',
            affectedParameterKeys: ['keyA', 'keyB']
          }
        ]
      });

      mockCachingClient.fetch.mockResolvedValue({
        config: { keyA: 'valueA', keyB: 'valueB', keyC: 'valueC' },
        templateVersion: 2,
        status: 200,
        eTag: 'e',
        experiments: [
          {
            experimentId: 'exp1',
            variantId: '1',
            experimentStartTime: '',
            triggerTimeoutMillis: '',
            timeToLiveMillis: '',
            affectedParameterKeys: ['keyB', 'keyC']
          }
        ]
      });

      await (realtime as any).fetchLatestConfig(MAXIMUM_FETCH_ATTEMPTS, 2);

      expect(executeAllListenerCallbacksSpy).toHaveBeenCalledTimes(1);
      const configUpdate = executeAllListenerCallbacksSpy.mock.calls[0][0];
      expect(configUpdate.getUpdatedKeys()).toEqual(new Set(['keyA', 'keyC']));
    });

    it('should ignore experiments if descriptions have not changed', async () => {
      mockStorage.getActiveConfig.mockResolvedValue({
        keyA: 'valueA',
        keyB: 'valueB'
      });
      const experiments = [
        {
          experimentId: 'exp1',
          variantId: '1',
          experimentStartTime: '',
          triggerTimeoutMillis: '',
          timeToLiveMillis: '',
          affectedParameterKeys: ['keyA', 'keyB']
        }
      ];
      mockStorage.getLastSuccessfulFetchResponse.mockResolvedValue({
        status: 200,
        config: { keyA: 'valueA', keyB: 'valueB' },
        experiments
      });

      mockCachingClient.fetch.mockResolvedValue({
        config: { keyA: 'valueA', keyB: 'valueB' },
        templateVersion: 2,
        status: 200,
        eTag: 'e',
        experiments
      });

      await (realtime as any).fetchLatestConfig(MAXIMUM_FETCH_ATTEMPTS, 2);

      expect(executeAllListenerCallbacksSpy).not.toHaveBeenCalled();
    });

    it('should identify changed keys when an experiment variant ID is updated', async () => {
      mockStorage.getActiveConfig.mockResolvedValue({
        keyA: 'valueA',
        keyB: 'valueB'
      });
      mockStorage.getLastSuccessfulFetchResponse.mockResolvedValue({
        status: 200,
        config: { keyA: 'valueA', keyB: 'valueB' },
        experiments: [
          {
            experimentId: 'exp1',
            variantId: '1',
            experimentStartTime: '',
            triggerTimeoutMillis: '',
            timeToLiveMillis: '',
            affectedParameterKeys: ['keyA', 'keyB']
          }
        ]
      });

      mockCachingClient.fetch.mockResolvedValue({
        config: { keyA: 'valueA', keyB: 'valueB' },
        templateVersion: 2,
        status: 200,
        eTag: 'e',
        experiments: [
          {
            experimentId: 'exp1',
            variantId: '2',
            experimentStartTime: '',
            triggerTimeoutMillis: '',
            timeToLiveMillis: '',
            affectedParameterKeys: ['keyA', 'keyB']
          }
        ]
      });

      await (realtime as any).fetchLatestConfig(MAXIMUM_FETCH_ATTEMPTS, 2);

      expect(executeAllListenerCallbacksSpy).toHaveBeenCalledTimes(1);
      const configUpdate = executeAllListenerCallbacksSpy.mock.calls[0][0];
      expect(configUpdate.getUpdatedKeys()).toEqual(new Set(['keyA', 'keyB']));
    });

    it('should ignore experiment descriptions starting with _exp_rollout', async () => {
      mockStorage.getActiveConfig.mockResolvedValue({
        keyA: 'valueA',
        keyB: 'valueB',
        keyC: 'valueC'
      });
      mockStorage.getLastSuccessfulFetchResponse.mockResolvedValue({
        status: 200,
        config: { keyA: 'valueA', keyB: 'valueB', keyC: 'valueC' },
        experiments: [
          {
            experimentId: '_exp_rollout_1',
            variantId: '1',
            experimentStartTime: '',
            triggerTimeoutMillis: '',
            timeToLiveMillis: '',
            affectedParameterKeys: ['keyA', 'keyB']
          }
        ]
      });

      mockCachingClient.fetch.mockResolvedValue({
        config: { keyA: 'valueA', keyB: 'valueB', keyC: 'valueC' },
        templateVersion: 2,
        status: 200,
        eTag: 'e',
        experiments: [
          {
            experimentId: '_exp_rollout_1',
            variantId: '1',
            experimentStartTime: '',
            triggerTimeoutMillis: '',
            timeToLiveMillis: '',
            affectedParameterKeys: ['keyB', 'keyC']
          }
        ]
      });

      await (realtime as any).fetchLatestConfig(MAXIMUM_FETCH_ATTEMPTS, 2);

      expect(executeAllListenerCallbacksSpy).not.toHaveBeenCalled();
    });

    it('should identify changed keys from updated rollout metadata (new rollout added)', async () => {
      mockStorage.getActiveConfig.mockResolvedValue({
        keyA: 'valueA',
        keyB: 'valueB'
      });
      mockStorage.getLastSuccessfulFetchResponse.mockResolvedValue({
        status: 200,
        config: { keyA: 'valueA', keyB: 'valueB' },
        rollouts: []
      });

      mockCachingClient.fetch.mockResolvedValue({
        config: { keyA: 'valueA', keyB: 'valueB' },
        templateVersion: 2,
        status: 200,
        eTag: 'e',
        rollouts: [
          {
            rolloutId: '_exp_rollout_1',
            variantId: 'variantA',
            affectedParameterKeys: ['keyA']
          }
        ]
      });

      await (realtime as any).fetchLatestConfig(MAXIMUM_FETCH_ATTEMPTS, 2);

      expect(executeAllListenerCallbacksSpy).toHaveBeenCalledTimes(1);
      const configUpdate = executeAllListenerCallbacksSpy.mock.calls[0][0];
      expect(configUpdate.getUpdatedKeys()).toEqual(new Set(['keyA']));
    });

    it('should identify changed keys from updated rollout metadata (rollout removed)', async () => {
      mockStorage.getActiveConfig.mockResolvedValue({
        keyA: 'valueA',
        keyB: 'valueB'
      });
      mockStorage.getLastSuccessfulFetchResponse.mockResolvedValue({
        status: 200,
        config: { keyA: 'valueA', keyB: 'valueB' },
        rollouts: [
          {
            rolloutId: '_exp_rollout_1',
            variantId: 'variantA',
            affectedParameterKeys: ['keyA']
          }
        ]
      });

      mockCachingClient.fetch.mockResolvedValue({
        config: { keyA: 'valueA', keyB: 'valueB' },
        templateVersion: 2,
        status: 200,
        eTag: 'e',
        rollouts: []
      });

      await (realtime as any).fetchLatestConfig(MAXIMUM_FETCH_ATTEMPTS, 2);

      expect(executeAllListenerCallbacksSpy).toHaveBeenCalledTimes(1);
      const configUpdate = executeAllListenerCallbacksSpy.mock.calls[0][0];
      expect(configUpdate.getUpdatedKeys()).toEqual(new Set(['keyA']));
    });

    it('should identify changed keys when a rollout variant ID is updated', async () => {
      mockStorage.getActiveConfig.mockResolvedValue({
        keyA: 'valueA',
        keyB: 'valueB'
      });
      mockStorage.getLastSuccessfulFetchResponse.mockResolvedValue({
        status: 200,
        config: { keyA: 'valueA', keyB: 'valueB' },
        rollouts: [
          {
            rolloutId: '_exp_rollout_1',
            variantId: 'variantA',
            affectedParameterKeys: ['keyA']
          }
        ]
      });

      mockCachingClient.fetch.mockResolvedValue({
        config: { keyA: 'valueA', keyB: 'valueB' },
        templateVersion: 2,
        status: 200,
        eTag: 'e',
        rollouts: [
          {
            rolloutId: '_exp_rollout_1',
            variantId: 'variantB',
            affectedParameterKeys: ['keyA']
          }
        ]
      });

      await (realtime as any).fetchLatestConfig(MAXIMUM_FETCH_ATTEMPTS, 2);

      expect(executeAllListenerCallbacksSpy).toHaveBeenCalledTimes(1);
      const configUpdate = executeAllListenerCallbacksSpy.mock.calls[0][0];
      expect(configUpdate.getUpdatedKeys()).toEqual(new Set(['keyA']));
    });

    it('should ignore rollouts if their metadata has not changed', async () => {
      mockStorage.getActiveConfig.mockResolvedValue({
        keyA: 'valueA',
        keyB: 'valueB'
      });
      mockStorage.getLastSuccessfulFetchResponse.mockResolvedValue({
        status: 200,
        config: { keyA: 'valueA', keyB: 'valueB' },
        rollouts: [
          {
            rolloutId: '_exp_rollout_1',
            variantId: 'variantA',
            affectedParameterKeys: ['keyA']
          }
        ]
      });

      mockCachingClient.fetch.mockResolvedValue({
        config: { keyA: 'valueA', keyB: 'valueB' },
        templateVersion: 2,
        status: 200,
        eTag: 'e',
        rollouts: [
          {
            rolloutId: '_exp_rollout_1',
            variantId: 'variantA',
            affectedParameterKeys: ['keyA']
          }
        ]
      });

      await (realtime as any).fetchLatestConfig(MAXIMUM_FETCH_ATTEMPTS, 2);

      expect(executeAllListenerCallbacksSpy).not.toHaveBeenCalled();
    });

    it('should handle null activatedConfigs gracefully', async () => {
      mockCachingClient.fetch.mockResolvedValue({
        config: { newKey: 'value' },
        templateVersion: 2,
        status: 200,
        eTag: 'e'
      });
      mockStorage.getActiveConfig.mockResolvedValue(null as any);

      await (realtime as any).fetchLatestConfig(MAXIMUM_FETCH_ATTEMPTS, 2);

      expect(executeAllListenerCallbacksSpy).toHaveBeenCalledTimes(1);
      const configUpdate = executeAllListenerCallbacksSpy.mock.calls[0][0];
      expect(configUpdate.getUpdatedKeys()).toEqual(new Set(['newKey']));
    });
  });

  describe('autoFetch', () => {
    let fetchLatestConfigStub: MockInstance;
    let propagateErrorSpy: MockInstance;

    beforeEach(() => {
      fetchLatestConfigStub = vi
        .spyOn(realtime as any, 'fetchLatestConfig')
        .mockResolvedValue(undefined);
      propagateErrorSpy = vi.spyOn(realtime as any, 'propagateError');
    });

    afterEach(() => {
      fetchLatestConfigStub.mockRestore();
      propagateErrorSpy.mockRestore();
    });

    it('should call fetchLatestConfig after a random delay', async () => {
      (realtime as any).autoFetch(MAXIMUM_FETCH_ATTEMPTS, 10);
      await vi.runAllTimersAsync();

      expect(fetchLatestConfigStub).toHaveBeenCalledWith(
        MAXIMUM_FETCH_ATTEMPTS,
        10
      );
    });

    it('should propagate an error if remaining attempts is zero', async () => {
      await (realtime as any).autoFetch(0, 10);
      expect(propagateErrorSpy).toHaveBeenCalledTimes(1);
      const error = propagateErrorSpy.mock.calls[0][0];
      expect(error.code).toContain(ErrorCode.CONFIG_UPDATE_NOT_FETCHED);
      expect(fetchLatestConfigStub).not.toHaveBeenCalled();
    });
  });

  describe('handleNotifications', () => {
    let mockReader: ReadableStreamDefaultReader<Uint8Array>;
    let autoFetchSpy: MockInstance;
    let executeAllListenerCallbacksSpy: MockInstance;
    let propagateErrorSpy: MockInstance;

    beforeEach(() => {
      autoFetchSpy = vi.spyOn(realtime as any, 'autoFetch');
      executeAllListenerCallbacksSpy = vi.spyOn(
        realtime as any,
        'executeAllListenerCallbacks'
      );
      propagateErrorSpy = vi.spyOn(realtime as any, 'propagateError');
      (realtime as any).observers.add({});
    });

    afterEach(() => {
      autoFetchSpy.mockRestore();
      executeAllListenerCallbacksSpy.mockRestore();
      propagateErrorSpy.mockRestore();
    });

    it('should set backoff metadata if REALTIME_RETRY_INTERVAL is present', async () => {
      const updateBackoffStub = vi
        .spyOn(realtime as any, 'updateBackoffMetadataWithRetryInterval')
        .mockResolvedValue(undefined);

      mockReader = createStreamingMockReader(['{"retryIntervalSeconds": 60}']);

      await (realtime as any).handleNotifications(mockReader);

      expect(updateBackoffStub).toHaveBeenCalledWith(60);
    });

    it('should propagate error on invalid JSON', async () => {
      mockReader = createStreamingMockReader(['{invalid_json}']);

      await (realtime as any).handleNotifications(mockReader);

      expect(propagateErrorSpy).toHaveBeenCalledTimes(1);
      const error = propagateErrorSpy.mock.calls[0][0];
      expect(error.code).toContain(ErrorCode.CONFIG_UPDATE_MESSAGE_INVALID);
    });

    it('should break if event listeners become empty during handling', async () => {
      autoFetchSpy.mockRestore();

      mockReader = createStreamingMockReader([
        '{"latestTemplateVersionNumber": 10}'
      ]);
      mockStorage.getActiveConfigTemplateVersion.mockResolvedValue(5);
      mockCachingClient.fetch.mockResolvedValue({
        config: { k: 'v' },
        templateVersion: 10,
        status: 200,
        eTag: 'e'
      });

      const observer = (realtime as any).observers.values().next().value;
      const originalJsonParse = JSON.parse;
      JSON.parse = (text: string) => {
        (realtime as any).observers.delete(observer);
        return originalJsonParse(text);
      };

      await (realtime as any).handleNotifications(mockReader);

      expect(mockReader.read).toHaveBeenCalledTimes(1);

      JSON.parse = originalJsonParse;
    });
  });

  describe('beginRealtimeHttpStream', () => {
    let createRealtimeConnectionSpy: MockInstance;
    let listenForNotificationsSpy: MockInstance;
    let closeRealtimeHttpConnectionSpy: MockInstance;
    let retryHttpConnectionWhenBackoffEndsSpy: MockInstance;
    let updateBackoffMetadataWithLastFailedStreamConnectionTimeSpy: MockInstance;
    let propagateErrorSpy: MockInstance;
    let checkAndSetHttpConnectionFlagIfNotRunningSpy: MockInstance;

    beforeEach(() => {
      createRealtimeConnectionSpy = vi.spyOn(
        realtime as any,
        'createRealtimeConnection'
      );
      listenForNotificationsSpy = vi.spyOn(
        realtime as any,
        'listenForNotifications'
      );
      closeRealtimeHttpConnectionSpy = vi.spyOn(
        realtime as any,
        'closeRealtimeHttpConnection'
      );

      retryHttpConnectionWhenBackoffEndsSpy = vi
        .spyOn(realtime as any, 'retryHttpConnectionWhenBackoffEnds')
        .mockResolvedValue(undefined);
      updateBackoffMetadataWithLastFailedStreamConnectionTimeSpy = vi.spyOn(
        realtime as any,
        'updateBackoffMetadataWithLastFailedStreamConnectionTime'
      );
      propagateErrorSpy = vi.spyOn(realtime as any, 'propagateError');
      checkAndSetHttpConnectionFlagIfNotRunningSpy = vi
        .spyOn(realtime as any, 'checkAndSetHttpConnectionFlagIfNotRunning')
        .mockReturnValue(true);

      createRealtimeConnectionSpy.mockResolvedValue(
        new Response(createMockReadableStream(), { status: 200 })
      );

      mockStorage.getRealtimeBackoffMetadata.mockResolvedValue({
        backoffEndTimeMillis: new Date(-1),
        numFailedStreams: 0
      });
      (realtime as any).httpRetriesRemaining = ORIGINAL_RETRIES;
    });

    afterEach(() => {
      retryHttpConnectionWhenBackoffEndsSpy.mockRestore();
    });

    it('should successfully establish and handle a connection', async () => {
      const resetRealtimeBackoffSpy = vi.spyOn(
        realtime as any,
        'resetRealtimeBackoff'
      );
      (realtime as any).observers.add({});
      await (realtime as any).prepareAndBeginRealtimeHttpStream();

      expect(createRealtimeConnectionSpy).toHaveBeenCalledTimes(1);
      expect(listenForNotificationsSpy).toHaveBeenCalledTimes(1);
      expect(resetRealtimeBackoffSpy).toHaveBeenCalledTimes(1);
      expect(closeRealtimeHttpConnectionSpy).toHaveBeenCalledTimes(1);
      expect(retryHttpConnectionWhenBackoffEndsSpy).toHaveBeenCalledTimes(1);
    });

    it('should return early if connection flag cannot be set', async () => {
      checkAndSetHttpConnectionFlagIfNotRunningSpy.mockReturnValue(false);
      await (realtime as any).prepareAndBeginRealtimeHttpStream();
      expect(createRealtimeConnectionSpy).not.toHaveBeenCalled();
    });

    it('should retry if currently in backoff period', async () => {
      mockStorage.getRealtimeBackoffMetadata.mockResolvedValue({
        backoffEndTimeMillis: new Date(FAKE_NOW + 1000),
        numFailedStreams: 1
      });
      await (realtime as any).prepareAndBeginRealtimeHttpStream();
      expect(retryHttpConnectionWhenBackoffEndsSpy).toHaveBeenCalledTimes(1);
      expect(createRealtimeConnectionSpy).not.toHaveBeenCalled();
    });

    it('should update backoff metadata on connection failure in foreground', async () => {
      (realtime as any).httpRetriesRemaining = 1;

      createRealtimeConnectionSpy.mockResolvedValue(
        new Response(null, { status: 502 })
      );
      (realtime as any).observers.add({});

      await (realtime as any).prepareAndBeginRealtimeHttpStream();

      expect(
        updateBackoffMetadataWithLastFailedStreamConnectionTimeSpy
      ).toHaveBeenCalledTimes(1);
      expect(retryHttpConnectionWhenBackoffEndsSpy).toHaveBeenCalledTimes(1);
    });

    it('should NOT schedule a retry on connection failure in background', async () => {
      (realtime as any).isInBackground = true;

      (realtime as any).observers.add({});

      createRealtimeConnectionSpy.mockResolvedValue(
        new Response(null, { status: 503 })
      );

      await (realtime as any).prepareAndBeginRealtimeHttpStream();

      expect(
        updateBackoffMetadataWithLastFailedStreamConnectionTimeSpy
      ).not.toHaveBeenCalled();

      expect(retryHttpConnectionWhenBackoffEndsSpy).not.toHaveBeenCalled();
    });

    it('should propagate CONFIG_UPDATE_STREAM_ERROR if connection fails non-retryably', async () => {
      (realtime as any).httpRetriesRemaining = 1;
      createRealtimeConnectionSpy.mockResolvedValue(
        new Response(null, { status: 400 })
      );
      (realtime as any).observers.add({});

      await (realtime as any).prepareAndBeginRealtimeHttpStream();

      expect(retryHttpConnectionWhenBackoffEndsSpy).not.toHaveBeenCalled();
      expect(propagateErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('should not propagate error if connection fails non-retryably in background', async () => {
      (realtime as any).httpRetriesRemaining = 1;
      createRealtimeConnectionSpy.mockResolvedValue(
        new Response(null, { status: 400 })
      );
      (realtime as any).observers.add({});
      (realtime as any).isInBackground = true;

      await (realtime as any).prepareAndBeginRealtimeHttpStream();

      expect(propagateErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('should propagate CONFIG_UPDATE_STREAM_ERROR if retries are exhausted', async () => {
      (realtime as any).httpRetriesRemaining = 0;
      (realtime as any).observers.add({});
      await (realtime as any).makeRealtimeHttpConnection(0);

      expect(propagateErrorSpy).toHaveBeenCalledTimes(1);
      const error = propagateErrorSpy.mock.calls[0][0];
      expect(error.code).toContain(ErrorCode.CONFIG_UPDATE_STREAM_ERROR);
    });

    it('should handle rejection from createRealtimeConnection', async () => {
      const testError = new Error('Connection refused');
      createRealtimeConnectionSpy.mockRejectedValue(testError);
      (realtime as any).observers.add({});

      await (realtime as any).prepareAndBeginRealtimeHttpStream();

      expect(
        updateBackoffMetadataWithLastFailedStreamConnectionTimeSpy
      ).toHaveBeenCalledTimes(1);
      expect(retryHttpConnectionWhenBackoffEndsSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('canEstablishStreamConnection', () => {
    it('returns true if all conditions are met', () => {
      (realtime as any).observers.add({});
      (realtime as any).isRealtimeDisabled = false;
      (realtime as any).isConnectionActive = false;
      (realtime as any).isInBackground = false;
      expect((realtime as any).canEstablishStreamConnection()).toBe(true);
    });

    it('returns false if there are no observers', () => {
      (realtime as any).observers.clear();
      expect((realtime as any).canEstablishStreamConnection()).toBe(false);
    });

    it('returns false if realtime is disabled', () => {
      (realtime as any).observers.add({});
      (realtime as any).isRealtimeDisabled = true;
      expect((realtime as any).canEstablishStreamConnection()).toBe(false);
    });

    it('returns false if a connection is already active', () => {
      (realtime as any).observers.add({});
      (realtime as any).isConnectionActive = true;
      expect((realtime as any).canEstablishStreamConnection()).toBe(false);
    });

    it('returns false if app is in background', () => {
      (realtime as any).observers.add({});
      (realtime as any).isInBackground = true;
      expect((realtime as any).canEstablishStreamConnection()).toBe(false);
    });
  });

  describe('addObserver/removeObserver', () => {
    let beginRealtimeStub: MockInstance;
    const observer: ConfigUpdateObserver = {
      next: () => {},
      error: () => {},
      complete: () => {}
    };

    beforeEach(() => {
      beginRealtimeStub = vi
        .spyOn(realtime as any, 'beginRealtime')
        .mockResolvedValue(undefined);
    });

    afterEach(() => {
      beginRealtimeStub.mockRestore();
    });

    it('addObserver should add an observer and start the realtime connection', async () => {
      await realtime.addObserver(observer);
      expect((realtime as any).observers.has(observer)).toBe(true);

      expect(beginRealtimeStub).toHaveBeenCalledTimes(1);
    });

    it('removeObserver should remove an observer', () => {
      (realtime as any).observers.add(observer);
      realtime.removeObserver(observer);
      expect((realtime as any).observers.has(observer)).toBe(false);
    });
  });
  describe('onVisibilityChange', () => {
    let closeConnectionSpy: MockInstance;
    let beginRealtimeSpy: MockInstance;

    beforeEach(() => {
      closeConnectionSpy = vi.spyOn(
        realtime as any,
        'closeRealtimeHttpConnection'
      );
      beginRealtimeSpy = vi.spyOn(realtime as any, 'beginRealtime');
    });

    afterEach(() => {
      closeConnectionSpy.mockRestore();
      beginRealtimeSpy.mockRestore();
    });

    it('should close connection when app goes to background', async () => {
      await (realtime as any).onVisibilityChange(false);
      expect((realtime as any).isInBackground).toBe(true);
      expect(closeConnectionSpy).toHaveBeenCalledTimes(1);
      expect(beginRealtimeSpy).not.toHaveBeenCalled();
    });

    it('should start connection when app comes to foreground', async () => {
      await (realtime as any).onVisibilityChange(true);
      expect((realtime as any).isInBackground).toBe(false);
      expect(closeConnectionSpy).not.toHaveBeenCalled();
      expect(beginRealtimeSpy).toHaveBeenCalledTimes(1);
    });
  });
});
