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
import { FirebaseApp } from '@firebase/app';
import * as sdkLogs from '@opentelemetry/sdk-logs';
import {
  LoggerProvider,
  BatchLogRecordProcessor
} from '@opentelemetry/sdk-logs';
import { createLoggerProvider } from './logger-provider';
import { AttributesStore } from '../attributes-store';
import { FirebaseAttributesProcessor } from './attributes-processor';

describe('createLoggerProvider', () => {
  let app: FirebaseApp;
  let attributesStore: AttributesStore;

  beforeEach(() => {
    app = {
      name: '[DEFAULT]',
      options: {
        projectId: 'test-project',
        appId: 'test-app',
        apiKey: 'test-api-key'
      }
    } as FirebaseApp;
    attributesStore = new AttributesStore(app.options);
  });

  it('should initialize LoggerProvider with FirebaseAttributesProcessor and BatchLogRecordProcessor', () => {
    const provider = createLoggerProvider(app, {}, attributesStore, []);
    expect(provider).to.be.an.instanceOf(LoggerProvider);

    const sharedState = (
      provider as unknown as {
        _sharedState: { registeredLogRecordProcessors: unknown[] };
      }
    )._sharedState;
    expect(sharedState.registeredLogRecordProcessors).to.have.lengthOf(2);
    expect(sharedState.registeredLogRecordProcessors[0]).to.be.an.instanceOf(
      FirebaseAttributesProcessor
    );
    expect(sharedState.registeredLogRecordProcessors[1]).to.be.an.instanceOf(
      BatchLogRecordProcessor
    );
  });

  describe('BatchLogRecordProcessor auto-flush on document hide', () => {
    it('should pass disableAutoFlushOnDocumentHide: true to BatchLogRecordProcessor', () => {
      const origDesc = Object.getOwnPropertyDescriptor(
        sdkLogs,
        'BatchLogRecordProcessor'
      );
      Object.defineProperty(sdkLogs, 'BatchLogRecordProcessor', {
        value: origDesc?.get ? origDesc.get() : sdkLogs.BatchLogRecordProcessor,
        configurable: true,
        writable: true
      });
      const batchProcessorSpy = sinon.spy(sdkLogs, 'BatchLogRecordProcessor');
      try {
        createLoggerProvider(app, {}, attributesStore, []);
        expect(batchProcessorSpy.calledOnce).to.be.true;
        const args = batchProcessorSpy.firstCall.args[0];
        expect(args).to.have.property('disableAutoFlushOnDocumentHide', true);
      } finally {
        batchProcessorSpy.restore();
        if (origDesc) {
          Object.defineProperty(sdkLogs, 'BatchLogRecordProcessor', origDesc);
        }
      }
    });
  });
});
