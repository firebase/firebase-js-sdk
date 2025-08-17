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

import { expect, use } from 'chai'; // FIX: Import 'use' from Chai.
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { RealtimeHandler } from '../../src/client/realtime_handler';
import { _FirebaseInstallationsInternal } from '@firebase/installations';
import { Logger } from '@firebase/logger';
import { Storage } from '../../src/storage/storage';
import { StorageCache } from '../../src/storage/storage_cache';
import { CachingClient } from '../../src/client/caching_client';
import {
 ConfigUpdateObserver,
 FetchResponse
} from '../../src/public_types';
import { ErrorCode } from '../../src/errors';
import { VisibilityMonitor } from '../../src/client/visibility_monitor';

use(sinonChai);

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
 sinon.stub(reader, 'read').callsFake(originalRead.bind(reader));
 return reader;
}

describe('RealtimeHandler', () => {
 let mockFetch: sinon.SinonStub;
 let mockInstallations: sinon.SinonStubbedInstance<_FirebaseInstallationsInternal>;
 let mockStorage: sinon.SinonStubbedInstance<Storage>;
 let mockStorageCache: sinon.SinonStubbedInstance<StorageCache>;
 let mockCachingClient: sinon.SinonStubbedInstance<CachingClient>;
 let mockLogger: sinon.SinonStubbedInstance<Logger>;
 let realtime: RealtimeHandler;
 let clock: sinon.SinonFakeTimers;
 let visibilityMonitorOnStub: sinon.SinonStub;

 beforeEach(async () => {
  mockFetch = sinon.stub(window, 'fetch');
  mockInstallations = {
   getId: sinon.stub().resolves(INSTALLATION_ID_STRING),
   getToken: sinon.stub().resolves(INSTALLATION_AUTH_TOKEN_STRING)
  } as any;

  mockLogger = sinon.createStubInstance(Logger);

 
  mockStorage = {
   getRealtimeBackoffMetadata: sinon.stub().resolves(undefined),
   setRealtimeBackoffMetadata: sinon.stub().resolves(),
   getActiveConfigEtag: sinon.stub().resolves('etag-1'),
   getActiveConfigTemplateVersion: sinon.stub().resolves(1),
   getActiveConfig: sinon.stub().resolves({}),

   getLastFetchStatus: sinon.stub(),
   setLastFetchStatus: sinon.stub(),
   getLastSuccessfulFetchTimestampMillis: sinon.stub(),
   setLastSuccessfulFetchTimestampMillis: sinon.stub(),
   getLastSuccessfulFetchResponse: sinon.stub(),
   setLastSuccessfulFetchResponse: sinon.stub(),
   setActiveConfig: sinon.stub(),
   setActiveConfigEtag: sinon.stub(),
   getThrottleMetadata: sinon.stub(),
   setThrottleMetadata: sinon.stub(),
   deleteThrottleMetadata: sinon.stub(),
   getCustomSignals: sinon.stub(),
   setCustomSignals: sinon.stub(),
   setActiveConfigTemplateVersion: sinon.stub()
  } as sinon.SinonStubbedInstance<Storage>;

  mockStorageCache = sinon.createStubInstance(StorageCache);
  mockStorageCache.getLastFetchStatus.returns('success');
  mockStorageCache.getCustomSignals.returns(undefined);

  mockCachingClient = sinon.createStubInstance(CachingClient);
  mockCachingClient.fetch.resolves(DUMMY_FETCH_RESPONSE);

  visibilityMonitorOnStub = sinon.stub();
  sinon.stub(VisibilityMonitor, 'getInstance').returns({
   on: visibilityMonitorOnStub
  } as any);

  clock = sinon.useFakeTimers(FAKE_NOW);

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
  sinon.restore();
  clock.restore();
 });

 describe('constructor', () => {
  it('should initialize with default retries if no backoff metadata in storage', async () => {
   await clock.runAllAsync();
   expect((realtime as any).httpRetriesRemaining).to.equal(ORIGINAL_RETRIES);
  });

  it('should set retries remaining from storage if available', async () => {
   sinon.restore(); // Restore to allow new constructor call
   mockStorage.getRealtimeBackoffMetadata.resolves({
    backoffEndTimeMillis: new Date(FAKE_NOW - 1000), // In the past, so no immediate backoff
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
   await clock.runAllAsync();
   expect((realtime as any).httpRetriesRemaining).to.equal(
    ORIGINAL_RETRIES - 3
   ); // 8 - 3 = 5
  });
 });

 describe('getRealtimeUrl', () => {
  it('should construct the correct URL', () => {
   const url = (realtime as any).getRealtimeUrl();
   expect(url.toString()).to.equal(
    `https://firebaseremoteconfigrealtime.googleapis.com/v1/projects/${PROJECT_NUMBER}/namespaces/namespace:streamFetchInvalidations?key=${API_KEY}`
   );
  });

  it('should use the URL base from window if it exists', () => {
   (window as any).FIREBASE_REMOTE_CONFIG_URL_BASE =
    'https://test.googleapis.com';
   const url = (realtime as any).getRealtimeUrl();
   expect(url.toString()).to.equal(
    `https://test.googleapis.com/v1/projects/${PROJECT_NUMBER}/namespaces/namespace:streamFetchInvalidations?key=${API_KEY}`
   );
   delete (window as any).FIREBASE_REMOTE_CONFIG_URL_BASE;
  });
 });

 describe('isStatusCodeRetryable', () => {
  it('should return true for retryable status codes', () => {
   const retryableCodes = [408, 429, 502, 503, 504];
   retryableCodes.forEach(code => {
    expect((realtime as any).isStatusCodeRetryable(code)).to.be.true;
   });
  });

  it('should return true for undefined status code', () => {
   expect((realtime as any).isStatusCodeRetryable(undefined)).to.be.true;
  });

  it('should return false for non-retryable status codes', () => {
   const nonRetryableCodes = [200, 304, 400, 401, 403];
   nonRetryableCodes.forEach(code => {
    expect((realtime as any).isStatusCodeRetryable(code)).to.be.false;
   });
  });
 });

 describe('updateBackoffMetadataWithLastFailedStreamConnectionTime', () => {
  it('should increment numFailedStreams and set backoffEndTimeMillis', async () => {
   const spy = mockStorage.setRealtimeBackoffMetadata;
   const lastFailedTime = new Date(FAKE_NOW);

   await (
    realtime as any
   ).updateBackoffMetadataWithLastFailedStreamConnectionTime(
    lastFailedTime
   );

   expect(spy).to.have.been.calledOnce;
   const metadata = spy.getCall(0).args[0];
   expect(metadata.numFailedStreams).to.equal(1);
   expect(metadata.backoffEndTimeMillis.getTime()).to.be.greaterThan(
    lastFailedTime.getTime()
   );
  });
 });

 describe('updateBackoffMetadataWithRetryInterval', () => {
  it('should set backoffEndTimeMillis based on provided retryIntervalSeconds and then retry connection', async () => {
   const setMetadataSpy = mockStorage.setRealtimeBackoffMetadata;
   const retryHttpConnectionSpy = sinon.spy(
    realtime as any,
    'retryHttpConnectionWhenBackoffEnds'
   );
   const retryInterval = 10; 

   await (realtime as any).updateBackoffMetadataWithRetryInterval(
    retryInterval
   );

   expect(setMetadataSpy).to.have.been.calledOnce;
   const metadata = setMetadataSpy.getCall(0).args[0];
   expect(metadata.backoffEndTimeMillis.getTime()).to.be.closeTo(
    FAKE_NOW + retryInterval * 1000,
    100
   );
   expect(retryHttpConnectionSpy).to.have.been.calledOnce;
  });
 });

 describe('closeRealtimeHttpConnection', () => {
  let mockController: sinon.SinonStubbedInstance<AbortController>;
  let mockReader: sinon.SinonStubbedInstance<
   ReadableStreamDefaultReader<Uint8Array>
  >;

  beforeEach(() => {
   mockController = sinon.createStubInstance(AbortController);
   mockReader = sinon.createStubInstance(ReadableStreamDefaultReader);
   (realtime as any).controller = mockController;
   (realtime as any).reader = mockReader;
  });

  it('should abort controller and cancel reader', async () => {
   await (realtime as any).closeRealtimeHttpConnection();
   expect(mockController.abort).to.have.been.calledOnce;
   expect(mockReader.cancel).to.have.been.calledOnce;
   expect((realtime as any).controller).to.be.undefined;
   expect((realtime as any).reader).to.be.undefined;
  });

  it('should handle reader cancellation failure gracefully', async () => {
   mockReader.cancel.rejects(new Error('test error'));
   await (realtime as any).closeRealtimeHttpConnection();
   expect(mockLogger.debug).to.have.been.calledWith(
    'Failed to cancel the reader, connection is gone.'
   );
   expect((realtime as any).reader).to.be.undefined; // Should still clear reader
  });

  it('should handle being called when reader is already undefined', async () => {
   (realtime as any).reader = undefined;
   await (realtime as any).closeRealtimeHttpConnection();
   expect(mockController.abort).to.have.been.calledOnce;
   expect((realtime as any).controller).to.be.undefined;
  });

  it('should handle being called when controller is already undefined', async () => {
   (realtime as any).controller = undefined;
   await (realtime as any).closeRealtimeHttpConnection();
   expect(mockReader.cancel).to.have.been.calledOnce;
   expect((realtime as any).reader).to.be.undefined;
  });
 });

 describe('resetRealtimeBackoff', () => {
  it('should reset backoff metadata in storage', async () => {
   const spy = mockStorage.setRealtimeBackoffMetadata;
   await (realtime as any).resetRealtimeBackoff();
   expect(spy).to.have.been.calledOnce;
   const metadata = spy.getCall(0).args[0];
   expect(metadata.numFailedStreams).to.equal(0);
   expect(metadata.backoffEndTimeMillis.getTime()).to.equal(-1);
  });
 });

 describe('establishRealtimeConnection', () => {
  it('should send correct headers and body for realtime connection', async () => {
   mockStorage.getActiveConfigEtag.resolves('current-etag');
   mockStorage.getActiveConfigTemplateVersion.resolves(10);

   const url = new URL('https://example.com/stream');
   const signal = new AbortController().signal;

   await (realtime as any).establishRealtimeConnection(
    url,
    INSTALLATION_ID_STRING,
    INSTALLATION_AUTH_TOKEN_STRING,
    signal
   );

   expect(mockFetch).to.have.been.calledOnce;
   const [fetchUrl, fetchOptions] = mockFetch.getCall(0).args;
   expect(fetchUrl).to.equal(url);
   expect(fetchOptions.method).to.equal('POST');
   expect(fetchOptions.headers).to.deep.include({
    'X-Goog-Api-Key': API_KEY,
    'X-Goog-Firebase-Installations-Auth': INSTALLATION_AUTH_TOKEN_STRING,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'If-None-Match': 'current-etag',
    'Content-Encoding': 'gzip'
   });
   const body = JSON.parse(fetchOptions.body as string);
   expect(body).to.deep.equal({
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
  let makeRealtimeHttpConnectionSpy: sinon.SinonSpy;

  beforeEach(() => {
   makeRealtimeHttpConnectionSpy = sinon.spy(
    realtime as any,
    'makeRealtimeHttpConnection'
   );
  });

  it('should call makeRealtimeHttpConnection with 0 delay if no backoff metadata', async () => {
   mockStorage.getRealtimeBackoffMetadata.resolves(undefined);
   await (realtime as any).retryHttpConnectionWhenBackoffEnds();
   expect(makeRealtimeHttpConnectionSpy).to.have.been.calledWith(0);
  });

  it('should call makeRealtimeHttpConnection with calculated delay if backoff metadata exists', async () => {
   mockStorage.getRealtimeBackoffMetadata.resolves({
    backoffEndTimeMillis: new Date(FAKE_NOW + 5000), // 5 seconds in the future
    numFailedStreams: 1
   });
   await (realtime as any).retryHttpConnectionWhenBackoffEnds();
   expect(makeRealtimeHttpConnectionSpy).to.have.been.calledOnce;
   const delay = makeRealtimeHttpConnectionSpy.getCall(0).args[0];
   expect(delay).to.be.closeTo(5000, 100);
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
   expect(result).to.be.true;
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
   expect(result).to.be.false;
  });

  it('should return true if no config and lastFetchStatus is success', () => {
   const fetchResponse: FetchResponse = {
    config: undefined,
    templateVersion: undefined,
    status: 304,
    eTag: 'e'
   };
   mockStorageCache.getLastFetchStatus.returns('success');
   const result = (realtime as any).fetchResponseIsUpToDate(
    fetchResponse,
    5
   );
   expect(result).to.be.true;
  });

  it('should return false if no config and lastFetchStatus is not success', () => {
   const fetchResponse: FetchResponse = {
    config: undefined,
    templateVersion: undefined,
    status: 304,
    eTag: 'e'
   };
   mockStorageCache.getLastFetchStatus.returns('throttle'); // Or any other non-'success' status
   const result = (realtime as any).fetchResponseIsUpToDate(
    fetchResponse,
    5
   );
   expect(result).to.be.false;
  });
 });

 describe('fetchLatestConfig', () => {
  let autoFetchSpy: sinon.SinonSpy;
  let executeAllListenerCallbacksSpy: sinon.SinonSpy;

  beforeEach(() => {
   autoFetchSpy = sinon.spy(realtime as any, 'autoFetch');
   executeAllListenerCallbacksSpy = sinon.spy(
    realtime as any,
    'executeAllListenerCallbacks'
   );
   mockStorage.getActiveConfig.resolves({ existingKey: 'value' });
   mockStorage.getActiveConfigTemplateVersion.resolves(1);
  });

  afterEach(() => {
   autoFetchSpy.restore();
   executeAllListenerCallbacksSpy.restore();
  });

  it('should fetch, identify changed keys, and notify observers', async () => {
   mockCachingClient.fetch.resolves({
    config: { existingKey: 'new_value', newKey: 'value' },
    templateVersion: 2,
    status: 200,
    eTag: 'e'
   });

   await (realtime as any).fetchLatestConfig(MAXIMUM_FETCH_ATTEMPTS, 2);

   expect(mockCachingClient.fetch).to.have.been.calledOnce;
   expect(executeAllListenerCallbacksSpy).to.have.been.calledOnce;
   const configUpdate = executeAllListenerCallbacksSpy.getCall(0).args[0];
   expect(configUpdate.getUpdatedKeys()).to.deep.equal(
    new Set(['existingKey', 'newKey'])
   );
  });

  it('should retry with autoFetch if fetched version is not up-to-date', async () => {
   autoFetchSpy.restore();
   const autoFetchStub = sinon.stub(realtime as any, 'autoFetch');

   mockCachingClient.fetch.resolves({
    config: { k: 'v' },
    templateVersion: 1, 
    status: 200,
    eTag: 'e'
   });
   mockStorage.getActiveConfigTemplateVersion.resolves(0);

   await (realtime as any).fetchLatestConfig(MAXIMUM_FETCH_ATTEMPTS, 2);

   expect(mockCachingClient.fetch).to.have.been.calledOnce;
   expect(autoFetchStub).to.have.been.calledOnceWith(
    MAXIMUM_FETCH_ATTEMPTS - 1,
    2
   );
  });

  it('should not notify if no keys have changed', async () => {
   mockCachingClient.fetch.resolves({
    config: { existingKey: 'value' },
    templateVersion: 2,
    status: 200,
    eTag: 'e'
   });

   await (realtime as any).fetchLatestConfig(MAXIMUM_FETCH_ATTEMPTS, 2);

   expect(executeAllListenerCallbacksSpy).not.to.have.been.called;
  });

  it('should propagate error on fetch failure', async () => {
   const testError = new Error('Network failed');
   mockCachingClient.fetch.rejects(testError);
   const propagateErrorSpy = sinon.spy(realtime as any, 'propagateError');

   await (realtime as any).fetchLatestConfig(MAXIMUM_FETCH_ATTEMPTS, 2);

   expect(propagateErrorSpy).to.have.been.calledOnce;
   const error = propagateErrorSpy.getCall(0).args[0];
   expect(error.code).to.include(ErrorCode.CONFIG_UPDATE_NOT_FETCHED);
  });

  it('should include custom signals in fetch request', async () => {
   mockStorageCache.getCustomSignals.returns({ signal1: 'value1' });

   await (realtime as any).fetchLatestConfig(MAXIMUM_FETCH_ATTEMPTS, 2);
   expect(mockLogger.debug).to.have.been.calledWith(
    `Fetching config with custom signals: {"signal1":"value1"}`
   );
  });

  it('should handle null activatedConfigs gracefully', async () => {
   mockCachingClient.fetch.resolves({
    config: { newKey: 'value' },
    templateVersion: 2,
    status: 200,
    eTag: 'e'
   });
   mockStorage.getActiveConfig.resolves(null as any); 

   await (realtime as any).fetchLatestConfig(MAXIMUM_FETCH_ATTEMPTS, 2);

   expect(executeAllListenerCallbacksSpy).to.have.been.calledOnce;
   const configUpdate = executeAllListenerCallbacksSpy.getCall(0).args[0];
   expect(configUpdate.getUpdatedKeys()).to.deep.equal(
    new Set(['newKey'])
   );
  });
 });

 describe('autoFetch', () => {
  let fetchLatestConfigStub: sinon.SinonStub;
  let propagateErrorSpy: sinon.SinonSpy;

  beforeEach(() => {
   fetchLatestConfigStub = sinon.stub(realtime as any, 'fetchLatestConfig');
   propagateErrorSpy = sinon.spy(realtime as any, 'propagateError');
  });

  afterEach(() => {
   fetchLatestConfigStub.restore();
   propagateErrorSpy.restore();
  });

  it('should call fetchLatestConfig after a random delay', async () => {
   (realtime as any).autoFetch(MAXIMUM_FETCH_ATTEMPTS, 10);
   await clock.runAllAsync();

   expect(fetchLatestConfigStub).to.have.been.calledOnceWith(
    MAXIMUM_FETCH_ATTEMPTS,
    10
   );
  });


  it('should propagate an error if remaining attempts is zero', async () => {
   await (realtime as any).autoFetch(0, 10);
   expect(propagateErrorSpy).to.have.been.calledOnce;
   const error = propagateErrorSpy.getCall(0).args[0];
   expect(error.code).to.include(ErrorCode.CONFIG_UPDATE_NOT_FETCHED);
   expect(fetchLatestConfigStub).not.to.have.been.called;
  });
 });


 describe('handleNotifications', () => {
  let mockReader: ReadableStreamDefaultReader<Uint8Array>;
  let autoFetchSpy: sinon.SinonSpy;
  let executeAllListenerCallbacksSpy: sinon.SinonSpy;
  let propagateErrorSpy: sinon.SinonSpy;

  beforeEach(() => {
   autoFetchSpy = sinon.spy(realtime as any, 'autoFetch');
   executeAllListenerCallbacksSpy = sinon.spy(
    realtime as any,
    'executeAllListenerCallbacks'
   );
   propagateErrorSpy = sinon.spy(realtime as any, 'propagateError');
   (realtime as any).observers.add({});
  });

  afterEach(() => {
   autoFetchSpy.restore();
   executeAllListenerCallbacksSpy.restore();
   propagateErrorSpy.restore();
  });


  it('should set backoff metadata if REALTIME_RETRY_INTERVAL is present', async () => {
   const updateBackoffStub = sinon
    .stub(realtime as any, 'updateBackoffMetadataWithRetryInterval')
    .resolves();

   mockReader = createStreamingMockReader(['{"retryIntervalSeconds": 60}']);

   await (realtime as any).handleNotifications(mockReader);

   expect(updateBackoffStub).to.have.been.calledOnceWith(60);
  });


  it('should propagate error on invalid JSON', async () => {
   mockReader = createStreamingMockReader(['{invalid_json}']);

   await (realtime as any).handleNotifications(mockReader);

   expect(propagateErrorSpy).to.have.been.calledOnce;
   const error = propagateErrorSpy.getCall(0).args[0];
   expect(error.code).to.include(ErrorCode.CONFIG_UPDATE_MESSAGE_INVALID);
  });

  it('should break if event listeners become empty during handling', async () => {
   autoFetchSpy.restore();

   mockReader = createStreamingMockReader([
    '{"latestTemplateVersionNumber": 10}'
   ]);
   mockStorage.getActiveConfigTemplateVersion.resolves(5);
   mockCachingClient.fetch.resolves({
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

   expect(mockReader.read).to.have.been.calledOnce;

   JSON.parse = originalJsonParse;
  });
 });


 describe('beginRealtimeHttpStream', () => {
  let createRealtimeConnectionSpy: sinon.SinonStub;
  let listenForNotificationsSpy: sinon.SinonSpy;
  let closeRealtimeHttpConnectionSpy: sinon.SinonSpy;
  let retryHttpConnectionWhenBackoffEndsSpy: sinon.SinonStub;
  let updateBackoffMetadataWithLastFailedStreamConnectionTimeSpy: sinon.SinonSpy;
  let propagateErrorSpy: sinon.SinonSpy;
  let checkAndSetHttpConnectionFlagIfNotRunningSpy: sinon.SinonStub;

  beforeEach(() => {
   createRealtimeConnectionSpy = sinon.stub(
    realtime as any,
    'createRealtimeConnection'
   );
   listenForNotificationsSpy = sinon.spy(
    realtime as any,
    'listenForNotifications'
   );
   closeRealtimeHttpConnectionSpy = sinon.spy(
    realtime as any,
    'closeRealtimeHttpConnection'
   );
  
   retryHttpConnectionWhenBackoffEndsSpy = sinon
    .stub(realtime as any, 'retryHttpConnectionWhenBackoffEnds')
    .resolves();
   updateBackoffMetadataWithLastFailedStreamConnectionTimeSpy = sinon.spy(
    realtime as any,
    'updateBackoffMetadataWithLastFailedStreamConnectionTime'
   );
   propagateErrorSpy = sinon.spy(realtime as any, 'propagateError');
   checkAndSetHttpConnectionFlagIfNotRunningSpy = sinon
    .stub(realtime as any, 'checkAndSetHttpConnectionFlagIfNotRunning')
    .returns(true);

   createRealtimeConnectionSpy.resolves(
    new Response(createMockReadableStream(), { status: 200 })
   );

   mockStorage.getRealtimeBackoffMetadata.resolves({
    backoffEndTimeMillis: new Date(-1),
    numFailedStreams: 0
   });
   (realtime as any).httpRetriesRemaining = ORIGINAL_RETRIES;
  });

  afterEach(() => {
   retryHttpConnectionWhenBackoffEndsSpy.restore();
  });

  it('should successfully establish and handle a connection', async () => {
   const resetRealtimeBackoffSpy = sinon.spy(
    realtime as any,
    'resetRealtimeBackoff'
   );
   (realtime as any).observers.add({});
   await (realtime as any).beginRealtimeHttpStream();

   expect(createRealtimeConnectionSpy).to.have.been.calledOnce;
   expect(listenForNotificationsSpy).to.have.been.calledOnce;
   expect(resetRealtimeBackoffSpy).to.have.been.calledOnce;
   expect(closeRealtimeHttpConnectionSpy).to.have.been.calledOnce;
   expect(retryHttpConnectionWhenBackoffEndsSpy).to.have.been.calledOnce;
  });

  it('should return early if connection flag cannot be set', async () => {
   checkAndSetHttpConnectionFlagIfNotRunningSpy.returns(false);
   await (realtime as any).beginRealtimeHttpStream();
   expect(createRealtimeConnectionSpy).not.to.have.been.called;
  });

  it('should retry if currently in backoff period', async () => {
   mockStorage.getRealtimeBackoffMetadata.resolves({
    backoffEndTimeMillis: new Date(FAKE_NOW + 1000),
    numFailedStreams: 1
   });
   await (realtime as any).beginRealtimeHttpStream();
   expect(retryHttpConnectionWhenBackoffEndsSpy).to.have.been.calledOnce;
   expect(createRealtimeConnectionSpy).not.to.have.been.called;
  });

  it('should update backoff metadata on connection failure in foreground', async () => {
   (realtime as any).httpRetriesRemaining = 1;

   createRealtimeConnectionSpy.resolves(new Response(null, { status: 502 }));
   (realtime as any).observers.add({});

   await (realtime as any).beginRealtimeHttpStream();

   expect(updateBackoffMetadataWithLastFailedStreamConnectionTimeSpy)
    .to.have.been.calledOnce;
   expect(retryHttpConnectionWhenBackoffEndsSpy).to.have.been.calledOnce;
  });

  it('should NOT schedule a retry on connection failure in background', async () => {
   (realtime as any).isInBackground = true;

   (realtime as any).observers.add({});

   createRealtimeConnectionSpy.resolves(new Response(null, { status: 503 }));

   await (realtime as any).beginRealtimeHttpStream();

   expect(updateBackoffMetadataWithLastFailedStreamConnectionTimeSpy).not.to.have.been.called;

   expect(retryHttpConnectionWhenBackoffEndsSpy).not.to.have.been.called;
  });

  it('should propagate CONFIG_UPDATE_STREAM_ERROR if connection fails non-retryably', async () => {
   (realtime as any).httpRetriesRemaining = 1;
   createRealtimeConnectionSpy.resolves(new Response(null, { status: 400 }));
   (realtime as any).observers.add({});

   await (realtime as any).beginRealtimeHttpStream();

   expect(retryHttpConnectionWhenBackoffEndsSpy).not.to.have.been.called;
   expect(propagateErrorSpy).to.have.been.calledOnce;
  });

  it('should not propagate error if connection fails non-retryably in background', async () => {
   (realtime as any).httpRetriesRemaining = 1;
   createRealtimeConnectionSpy.resolves(new Response(null, { status: 400 }));
   (realtime as any).observers.add({});
   (realtime as any).isInBackground = true;

   await (realtime as any).beginRealtimeHttpStream();

   expect(propagateErrorSpy).to.have.been.calledOnce;
  });

  it('should propagate CONFIG_UPDATE_STREAM_ERROR if retries are exhausted', async () => {
   (realtime as any).httpRetriesRemaining = 0;
   (realtime as any).observers.add({});
   await (realtime as any).makeRealtimeHttpConnection(0);

   expect(propagateErrorSpy).to.have.been.calledOnce;
   const error = propagateErrorSpy.getCall(0).args[0];
   expect(error.code).to.include(ErrorCode.CONFIG_UPDATE_STREAM_ERROR);
  });

  it('should handle rejection from createRealtimeConnection', async () => {
   const testError = new Error('Connection refused');
   createRealtimeConnectionSpy.rejects(testError);
   (realtime as any).observers.add({});

   await (realtime as any).beginRealtimeHttpStream();

   expect(updateBackoffMetadataWithLastFailedStreamConnectionTimeSpy).to.have
    .been.calledOnce;
   expect(retryHttpConnectionWhenBackoffEndsSpy).to.have.been.calledOnce;
  });
 });

 describe('canEstablishStreamConnection', () => {
  it('returns true if all conditions are met', () => {
   (realtime as any).observers.add({});
   (realtime as any).isRealtimeDisabled = false;
   (realtime as any).isConnectionActive = false;
   (realtime as any).isInBackground = false;
   expect((realtime as any).canEstablishStreamConnection()).to.be.true;
  });

  it('returns false if there are no observers', () => {
   (realtime as any).observers.clear();
   expect((realtime as any).canEstablishStreamConnection()).to.be.false;
  });

  it('returns false if realtime is disabled', () => {
   (realtime as any).observers.add({});
   (realtime as any).isRealtimeDisabled = true;
   expect((realtime as any).canEstablishStreamConnection()).to.be.false;
  });

  it('returns false if a connection is already active', () => {
   (realtime as any).observers.add({});
   (realtime as any).isConnectionActive = true;
   expect((realtime as any).canEstablishStreamConnection()).to.be.false;
  });

  it('returns false if app is in background', () => {
   (realtime as any).observers.add({});
   (realtime as any).isInBackground = true;
   expect((realtime as any).canEstablishStreamConnection()).to.be.false;
  });
 });

 describe('addObserver/removeObserver', () => {
  let beginRealtimeStub: sinon.SinonStub;
  const observer: ConfigUpdateObserver = {
   next: () => { },
   error: () => { },
   complete: () => { }
  };

  beforeEach(() => {
   beginRealtimeStub = sinon.stub(realtime as any, 'beginRealtime').resolves();
  });

  afterEach(() => {
   beginRealtimeStub.restore();
  });

  it('addObserver should add an observer and start the realtime connection', async () => {
   await realtime.addObserver(observer);
   expect((realtime as any).observers.has(observer)).to.be.true;

   expect(beginRealtimeStub).to.have.been.calledOnce;
  });

  it('removeObserver should remove an observer', () => {
   (realtime as any).observers.add(observer);
   realtime.removeObserver(observer);
   expect((realtime as any).observers.has(observer)).to.be.false;
  });
 });
 describe('onVisibilityChange', () => {
  let closeConnectionSpy: sinon.SinonSpy;
  let beginRealtimeSpy: sinon.SinonSpy;

  beforeEach(() => {
   closeConnectionSpy = sinon.spy(
    realtime as any,
    'closeRealtimeHttpConnection'
   );
   beginRealtimeSpy = sinon.spy(realtime as any, 'beginRealtime');
  });

  afterEach(() => {
   closeConnectionSpy.restore();
   beginRealtimeSpy.restore();
  });

  it('should close connection when app goes to background', async () => {
   await (realtime as any).onVisibilityChange(false);
   expect((realtime as any).isInBackground).to.be.true;
   expect(closeConnectionSpy).to.have.been.calledOnce;
   expect(beginRealtimeSpy).not.to.have.been.called;
  });

  it('should start connection when app comes to foreground', async () => {
   await (realtime as any).onVisibilityChange(true);
   expect((realtime as any).isInBackground).to.be.false;
   expect(closeConnectionSpy).not.to.have.been.called;
   expect(beginRealtimeSpy).to.have.been.calledOnce;
  });
 });
});
