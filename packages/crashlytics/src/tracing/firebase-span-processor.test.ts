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
import { Span } from '@opentelemetry/sdk-trace-base';
import { FirebaseSpanProcessor } from './firebase-span-processor';
import { RootSpan, RootSpanContextManager } from './root-span-context-manager';
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

    mockRootSpanContextManager = {
      getActiveRootSpan: () =>
        ({
          spanContext: () => ({ traceId: 'traceId1', spanId: 'rootSpan1' })
        } as unknown as RootSpan),
      getActiveAppScreenId: () => undefined
    } as unknown as RootSpanContextManager;

    processor = new FirebaseSpanProcessor(mockRootSpanContextManager);
    mockSpan = {
      attributes: {},
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
  });

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

  it('should use default region if not present in options', () => {
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
    (mockRootSpanContextManager as any).getActiveAppScreenId = () => undefined;
    processor.onStart(mockSpan as Span, {} as any);
    expect(mockSpan.attributes[CRASHLYTICS_ATTRIBUTE_KEYS.APP_SCREEN_ID]).to.be
      .undefined;
  });
});
