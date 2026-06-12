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

import { createTracingProvider } from './tracing-provider';
import { expect } from 'chai';
import { FirebaseApp } from '@firebase/app';
import { RootSpanContextManager } from './root-span-context-manager';
import { CrashlyticsOptions } from '../public-types';
import { AttributesStore } from '../attributes-store';

describe('createTracingProvider', () => {
  let mockApp: FirebaseApp;
  let mockRootSpanContextManager: RootSpanContextManager;
  let mockCrashlyticsOptions: CrashlyticsOptions;
  let mockAttributesStore: AttributesStore;
  beforeEach(() => {
    mockApp = {
      options: {
        projectId: 'test-project',
        appId: 'test-app-id',
        apiKey: 'test-api-key'
      }
    } as unknown as FirebaseApp;
    mockRootSpanContextManager = {
      enable: () => {},
      startRootSpan: () => ({})
    } as unknown as RootSpanContextManager;
    mockCrashlyticsOptions = {} as CrashlyticsOptions;
    mockAttributesStore = {} as unknown as AttributesStore;
  });

  it('should return a tracer provider instance', () => {
    const provider = createTracingProvider(
      mockApp,
      mockRootSpanContextManager,
      mockCrashlyticsOptions,
      mockAttributesStore
    );
    expect(provider).to.be.ok;
  });
});
