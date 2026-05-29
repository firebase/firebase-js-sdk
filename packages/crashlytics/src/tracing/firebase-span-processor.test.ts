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

import { expect } from 'chai';
import * as sinon from 'sinon';
import { Span } from '@opentelemetry/sdk-trace-base';
import { FirebaseSpanProcessor } from './firebase-span-processor';
import { RootSpan, RootSpanContextManager } from './root-span-context-manager';
import { hrTimeToMilliseconds } from '@opentelemetry/core';
import {
  CRASHLYTICS_SESSION_ID_KEY,
  COMMON_SPAN_ATTRIBUTE_KEYS,
  CRASHLYTICS_ATTRIBUTE_KEYS
} from '../constants';

const MOCK_SESSION_ID = 'mock-session-id';

describe('FirebaseSpanProcessor', () => {
  let processor: FirebaseSpanProcessor;
  let mockSpan: any;
  let originalSessionStorage: Storage | undefined;
  let storage: Record<string, string> = {};
  let mockRootSpanContextManager: RootSpanContextManager;
  let activeRootSpanMock: any;
  let recordNetworkActivityStartStub: sinon.SinonStub;
  let recordNetworkActivityEndStub: sinon.SinonStub;

  beforeEach(() => {
    storage = {};
    originalSessionStorage = global.sessionStorage;
    const sessionStorageMock: Partial<Storage> = {
      getItem: (key: string) => storage[key] || null,
      setItem: (key: string, value: string) => {
        storage[key] = value;
      }
    };
    Object.defineProperty(global, 'sessionStorage', {
      value: sessionStorageMock,
      writable: true
    });

    recordNetworkActivityStartStub = sinon.stub();
    recordNetworkActivityEndStub = sinon.stub();

    activeRootSpanMock = {
      spanContext: () => ({ traceId: 'traceId1', spanId: 'rootSpan1' }),
      recordNetworkActivityStart: recordNetworkActivityStartStub,
      recordNetworkActivityEnd: recordNetworkActivityEndStub
    };

    mockRootSpanContextManager = {
      getActiveRootSpan: () => activeRootSpanMock as unknown as RootSpan,
      getRootSpanByTraceId: () => activeRootSpanMock as unknown as RootSpan,
      getActiveAppScreenId: () => undefined,
      registerExistingSpanAsRoot: sinon.stub()
    } as unknown as RootSpanContextManager;

    processor = new FirebaseSpanProcessor(mockRootSpanContextManager);
    mockSpan = {
      attributes: {},
      spanContext: () => ({ traceId: 'traceId1' }),
      setAttribute: (key: string, value: string) => {
        mockSpan.attributes[key] = value;
      }
    };
  });

  afterEach(() => {
    Object.defineProperty(global, 'sessionStorage', {
      value: originalSessionStorage,
      writable: true
    });
    sinon.restore();
  });

  describe('onStart', () => {
    it('should add session id to span if present in storage', () => {
      storage[CRASHLYTICS_SESSION_ID_KEY] = MOCK_SESSION_ID;
      processor.onStart(mockSpan as Span, {} as any);
      expect(
        mockSpan.attributes[COMMON_SPAN_ATTRIBUTE_KEYS.GCP_FIREBASE_SESSION_ID]
      ).to.equal(MOCK_SESSION_ID);
    });

    it('should not add session id if not present in storage', () => {
      processor.onStart(mockSpan as Span, {} as any);
      expect(
        mockSpan.attributes[COMMON_SPAN_ATTRIBUTE_KEYS.GCP_FIREBASE_SESSION_ID]
      ).to.be.undefined;
    });

    it('should add region to resource name if present in options', () => {
      processor = new FirebaseSpanProcessor(
        mockRootSpanContextManager,
        { region: 'us-central1' },
        { projectId: 'my-project' }
      );
      processor.onStart(mockSpan as Span, {} as any);
      expect(
        mockSpan.attributes[COMMON_SPAN_ATTRIBUTE_KEYS.GCP_RESOURCE_NAME]
      ).to.equal(
        '//firebasetelemetry.googleapis.com/projects/my-project/locations/us-central1/'
      );
    });

    it('should use default region in resource name if not present in options', () => {
      processor = new FirebaseSpanProcessor(
        mockRootSpanContextManager,
        {},
        { projectId: 'my-project' }
      );
      processor.onStart(mockSpan as Span, {} as any);
      expect(
        mockSpan.attributes[COMMON_SPAN_ATTRIBUTE_KEYS.GCP_RESOURCE_NAME]
      ).to.equal(
        '//firebasetelemetry.googleapis.com/projects/my-project/locations/global/'
      );
    });

    it('should add active app screen id to span if available', () => {
      const mockScreenId = 'screen-id';
      (mockRootSpanContextManager as any).getActiveAppScreenId = () =>
        mockScreenId;
      processor.onStart(mockSpan as Span, {} as any);
      expect(
        mockSpan.attributes[CRASHLYTICS_ATTRIBUTE_KEYS.APP_SCREEN_ID]
      ).to.equal(mockScreenId);
    });

    it('should not add active app screen id to span if not available', () => {
      (mockRootSpanContextManager as any).getActiveAppScreenId = () =>
        undefined;
      processor.onStart(mockSpan as Span, {} as any);
      expect(mockSpan.attributes[CRASHLYTICS_ATTRIBUTE_KEYS.APP_SCREEN_ID]).to
        .be.undefined;
    });

    it('should set app version attribute to the configured app version', () => {
      processor = new FirebaseSpanProcessor(
        mockRootSpanContextManager,
        { appVersion: '1.2.3' },
        {}
      );
      processor.onStart(mockSpan as Span, {} as any);
      expect(
        mockSpan.attributes[COMMON_SPAN_ATTRIBUTE_KEYS.GCP_FIREBASE_APP_VERSION]
      ).to.equal('1.2.3');
    });

    it("should set app version attribute to 'unset' if configured app version not available", () => {
      processor = new FirebaseSpanProcessor(mockRootSpanContextManager, {}, {});
      processor.onStart(mockSpan as Span, {} as any);
      expect(
        mockSpan.attributes[COMMON_SPAN_ATTRIBUTE_KEYS.GCP_FIREBASE_APP_VERSION]
      ).to.equal('unset');
    });
  });

  describe('network activity tracking', () => {
    it('should record network activity start if http.request.method attribute is present', () => {
      mockSpan.attributes['http.request.method'] = 'GET';
      processor.onStart(mockSpan as Span, {} as any);

      expect(recordNetworkActivityStartStub.calledOnce).to.be.true;
    });

    it('should record network activity start if legacy http.method attribute is present', () => {
      mockSpan.attributes['http.method'] = 'GET';
      processor.onStart(mockSpan as Span, {} as any);

      expect(recordNetworkActivityStartStub.calledOnce).to.be.true;
    });

    it('should not record network activity start if no HTTP method attributes are present', () => {
      processor.onStart(mockSpan as Span, {} as any);

      expect(recordNetworkActivityStartStub.called).to.be.false;
    });

    it('should record network activity end if http.request.method attribute is present', () => {
      mockSpan.attributes['http.request.method'] = 'GET';
      mockSpan.endTime = [1, 2000000];
      processor.onEnd(mockSpan as any);

      expect(
        recordNetworkActivityEndStub.calledWith(
          hrTimeToMilliseconds(mockSpan.endTime)
        )
      ).to.be.true;
    });

    it('should record network activity end if legacy http.method attribute is present', () => {
      mockSpan.attributes['http.method'] = 'GET';
      mockSpan.endTime = [1, 2000000];
      processor.onEnd(mockSpan as any);

      expect(
        recordNetworkActivityEndStub.calledWith(
          hrTimeToMilliseconds(mockSpan.endTime)
        )
      ).to.be.true;
    });

    it('should not record network activity end if no HTTP method attributes are present', () => {
      mockSpan.endTime = [1, 2000000];
      processor.onEnd(mockSpan as any);

      expect(recordNetworkActivityEndStub.called).to.be.false;
    });
  });
});
