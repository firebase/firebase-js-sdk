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
import {
  LoggerProvider,
  BatchLogRecordProcessor
} from '@opentelemetry/sdk-logs';
import { createLoggerProvider } from './logger-provider';
import { AttributesStore } from '../attributes-store';
import { FirebaseAttributesProcessor } from './attributes-processor';
import { TelemetryStore } from '../telemetry-store';
import { OnErrorLogRecordProcessor } from './on-error-log-record-processor';

describe('createLoggerProvider', () => {
  let app: FirebaseApp;
  let attributesStore: AttributesStore;
  let telemetryStore: TelemetryStore;

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
    telemetryStore = new TelemetryStore();
  });

  it('should initialize LoggerProvider with FirebaseAttributesProcessor and OnErrorLogRecordProcessor', () => {
    const { loggerProvider: provider } = createLoggerProvider(
      app,
      {},
      attributesStore,
      telemetryStore,
      []
    );
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
      OnErrorLogRecordProcessor
    );
    expect(sharedState.registeredLogRecordProcessors[1]).to.be.an.instanceOf(
      BatchLogRecordProcessor
    );
  });

  describe('BatchLogRecordProcessor auto-flush on document hide', () => {
    it('should pass disableAutoFlushOnDocumentHide: true to BatchLogRecordProcessor', () => {
      if ('_onInit' in BatchLogRecordProcessor.prototype) {
        // Browser environment (Webpack ES module bundle where namespace exports are non-configurable)
        const onInitSpy = sinon.spy(
          BatchLogRecordProcessor.prototype as unknown as {
            _onInit: (options: unknown) => void;
          },
          '_onInit'
        );
        try {
          createLoggerProvider(app, {}, attributesStore, telemetryStore, []);
          expect(onInitSpy.calledOnce).to.be.true;
          const args = onInitSpy.firstCall.args[0];
          expect(args).to.have.property('disableAutoFlushOnDocumentHide', true);
        } finally {
          onInitSpy.restore();
        }
      } else {
        // Node environment
        const BaseSpy = sinon.spy(function (this: unknown, options: unknown) {
          return Reflect.construct(
            BatchLogRecordProcessor,
            [options],
            new.target
          );
        });
        Object.setPrototypeOf(
          BaseSpy,
          Object.getPrototypeOf(BatchLogRecordProcessor)
        );
        BaseSpy.prototype = BatchLogRecordProcessor.prototype;
        Object.setPrototypeOf(OnErrorLogRecordProcessor, BaseSpy);
        try {
          createLoggerProvider(app, {}, attributesStore, telemetryStore, []);
          expect(BaseSpy.calledOnce).to.be.true;
          const args = BaseSpy.firstCall.args[0];
          expect(args).to.have.property('disableAutoFlushOnDocumentHide', true);
        } finally {
          Object.setPrototypeOf(
            OnErrorLogRecordProcessor,
            BatchLogRecordProcessor
          );
        }
      }
    });
  });
});
