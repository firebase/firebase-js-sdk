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
import {
  AttributesStore,
  SESSION_STORAGE_SESSION_ID_KEY,
  SPAN_ATTR_KEY
} from '../attributes-store';

const MOCK_SESSION_ID = 'mock-session-id';

describe('FirebaseSpanProcessor', () => {
  let processor: FirebaseSpanProcessor;
  let mockSpan: any;
  let originalSessionStorage: Storage | undefined;
  let storage: Record<string, string> = {};

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

    const attributesStore = new AttributesStore({ projectId: 'my-project' });
    processor = new FirebaseSpanProcessor(attributesStore);
    mockSpan = {
      attributes: {},
      spanContext: () => ({ traceId: 'traceId1' }),
      setAttribute: (key: string, value: string) => {
        mockSpan.attributes[key] = value;
      },
      setAttributes: (attrs: Record<string, any>) => {
        Object.assign(mockSpan.attributes, attrs);
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
      storage[SESSION_STORAGE_SESSION_ID_KEY] = MOCK_SESSION_ID;
      const attributesStore = new AttributesStore({ projectId: 'my-project' });
      processor = new FirebaseSpanProcessor(attributesStore);
      processor.onStart(mockSpan as Span, {} as any);
      expect(
        mockSpan.attributes[SPAN_ATTR_KEY.GCP_FIREBASE_SESSION_ID]
      ).to.equal(MOCK_SESSION_ID);
    });

    it('should not add session id if not present in storage', () => {
      const attributesStore = new AttributesStore({ projectId: 'my-project' });
      processor = new FirebaseSpanProcessor(attributesStore);
      processor.onStart(mockSpan as Span, {} as any);
      expect(mockSpan.attributes[SPAN_ATTR_KEY.GCP_FIREBASE_SESSION_ID]).to.be
        .undefined;
    });

    it('should add region to resource name if present in options', () => {
      const attributesStore = new AttributesStore(
        { projectId: 'my-project' },
        { region: 'us-central1' }
      );
      processor = new FirebaseSpanProcessor(attributesStore);
      processor.onStart(mockSpan as Span, {} as any);
      expect(mockSpan.attributes[SPAN_ATTR_KEY.GCP_RESOURCE_NAME]).to.equal(
        '//firebasetelemetry.googleapis.com/projects/my-project/locations/us-central1/'
      );
    });

    it('should use default region in resource name if not present in options', () => {
      const attributesStore = new AttributesStore({ projectId: 'my-project' });
      processor = new FirebaseSpanProcessor(attributesStore);
      processor.onStart(mockSpan as Span, {} as any);
      expect(mockSpan.attributes[SPAN_ATTR_KEY.GCP_RESOURCE_NAME]).to.equal(
        '//firebasetelemetry.googleapis.com/projects/my-project/locations/global/'
      );
    });

    it('should add active app screen id to span if available', () => {
      const attributesStore = new AttributesStore({ projectId: 'my-project' });
      attributesStore.setRoutePathProvider(() => 'mock-screen-id');
      processor = new FirebaseSpanProcessor(attributesStore);
      processor.onStart(mockSpan as Span, {} as any);
      expect(mockSpan.attributes[SPAN_ATTR_KEY.APP_SCREEN_ID]).to.equal(
        'mock-screen-id'
      );
    });

    it('should not add active app screen id to span if not available', () => {
      const attributesStore = new AttributesStore({ projectId: 'my-project' });
      processor = new FirebaseSpanProcessor(attributesStore);
      processor.onStart(mockSpan as Span, {} as any);
      expect(mockSpan.attributes[SPAN_ATTR_KEY.APP_SCREEN_ID]).to.be.undefined;
    });

    it('should set app version attribute to the configured app version', () => {
      const attributesStore = new AttributesStore(
        { projectId: 'my-project' },
        { appVersion: '1.2.3' }
      );
      processor = new FirebaseSpanProcessor(attributesStore);
      processor.onStart(mockSpan as Span, {} as any);
      expect(
        mockSpan.attributes[SPAN_ATTR_KEY.GCP_FIREBASE_APP_VERSION]
      ).to.equal('1.2.3');
    });

    it("should set app version attribute to 'unset' if configured app version not available", () => {
      const attributesStore = new AttributesStore(
        { projectId: 'my-project' },
        {}
      );
      processor = new FirebaseSpanProcessor(attributesStore);
      processor.onStart(mockSpan as Span, {} as any);
      expect(
        mockSpan.attributes[SPAN_ATTR_KEY.GCP_FIREBASE_APP_VERSION]
      ).to.equal('unset');
    });
  });
});
