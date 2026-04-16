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
import { Span } from '@opentelemetry/api';
import { FirebaseSpanProcessor } from './firebase-span-processor';
import {
  CRASHLYTICS_SESSION_ID_KEY,
  CRASHLYTICS_ATTRIBUTE_KEYS
} from '../constants';

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

    processor = new FirebaseSpanProcessor();
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
    expect(mockSpan.attributes[CRASHLYTICS_ATTRIBUTE_KEYS.SESSION_ID]).to.equal(
      MOCK_SESSION_ID
    );
  });

  it('should not add session id if not present in storage', () => {
    processor.onStart(mockSpan as Span, {} as any);
    expect(mockSpan.attributes[CRASHLYTICS_ATTRIBUTE_KEYS.SESSION_ID]).to.be
      .undefined;
  });
});
