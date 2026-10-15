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

  afterEach(() => {
    sinon.restore();
  });

  it('should initialize LoggerProvider with FirebaseAttributesProcessor and BatchLogRecordProcessor by default when enableBreadcrumbs is not set', () => {
    const { loggerProvider: provider, onErrorLogRecordProcessor } =
      createLoggerProvider(app, {}, attributesStore, telemetryStore, []);
    expect(provider).to.be.an.instanceOf(LoggerProvider);
    expect(onErrorLogRecordProcessor).to.be.undefined;

    const attributesEmitSpy = sinon.spy(
      FirebaseAttributesProcessor.prototype,
      'onEmit'
    );
    const batchEmitSpy = sinon.spy(BatchLogRecordProcessor.prototype, 'onEmit');
    const onErrorEmitSpy = sinon.spy(
      OnErrorLogRecordProcessor.prototype,
      'onEmit'
    );

    provider.getLogger('test-logger').emit({ body: 'test log' });

    expect(attributesEmitSpy.calledOnce).to.be.true;
    expect(batchEmitSpy.calledOnce).to.be.true;
    expect(onErrorEmitSpy.called).to.be.false;
    sinon.assert.callOrder(attributesEmitSpy, batchEmitSpy);
  });

  it('should initialize LoggerProvider with FirebaseAttributesProcessor and OnErrorLogRecordProcessor when enableBreadcrumbs is true', () => {
    const { loggerProvider: provider, onErrorLogRecordProcessor } =
      createLoggerProvider(
        app,
        { enableBreadcrumbs: true },
        attributesStore,
        telemetryStore,
        []
      );
    expect(provider).to.be.an.instanceOf(LoggerProvider);
    expect(onErrorLogRecordProcessor).to.be.an.instanceOf(
      OnErrorLogRecordProcessor
    );

    const attributesEmitSpy = sinon.spy(
      FirebaseAttributesProcessor.prototype,
      'onEmit'
    );
    const batchEmitSpy = sinon.spy(BatchLogRecordProcessor.prototype, 'onEmit');
    const onErrorEmitSpy = sinon.spy(
      OnErrorLogRecordProcessor.prototype,
      'onEmit'
    );

    provider.getLogger('test-logger').emit({ body: 'test log' });

    expect(attributesEmitSpy.calledOnce).to.be.true;
    expect(onErrorEmitSpy.calledOnce).to.be.true;
    expect(batchEmitSpy.called).to.be.false;
    sinon.assert.callOrder(attributesEmitSpy, onErrorEmitSpy);
  });

  describe('BatchLogRecordProcessor auto-flush on document hide', () => {
    it('should pass disableAutoFlushOnDocumentHide: true to BatchLogRecordProcessor by default when enableBreadcrumbs is not set', () => {
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
        // Node environment (CommonJS where exports are configurable)
        const origDesc = Object.getOwnPropertyDescriptor(
          sdkLogs,
          'BatchLogRecordProcessor'
        );
        Object.defineProperty(sdkLogs, 'BatchLogRecordProcessor', {
          value: origDesc?.get
            ? origDesc.get()
            : sdkLogs.BatchLogRecordProcessor,
          configurable: true,
          writable: true
        });
        const batchProcessorSpy = sinon.spy(sdkLogs, 'BatchLogRecordProcessor');
        try {
          createLoggerProvider(app, {}, attributesStore, telemetryStore, []);
          expect(batchProcessorSpy.calledOnce).to.be.true;
          const args = batchProcessorSpy.firstCall.args[0];
          expect(args).to.have.property('disableAutoFlushOnDocumentHide', true);
        } finally {
          batchProcessorSpy.restore();
          if (origDesc) {
            Object.defineProperty(sdkLogs, 'BatchLogRecordProcessor', origDesc);
          }
        }
      }
    });

    it('should pass disableAutoFlushOnDocumentHide: true to BatchLogRecordProcessor via OnErrorLogRecordProcessor when enableBreadcrumbs is true', () => {
      if ('_onInit' in BatchLogRecordProcessor.prototype) {
        // Browser environment (Webpack ES module bundle where namespace exports are non-configurable)
        const onInitSpy = sinon.spy(
          BatchLogRecordProcessor.prototype as unknown as {
            _onInit: (options: unknown) => void;
          },
          '_onInit'
        );
        try {
          createLoggerProvider(
            app,
            { enableBreadcrumbs: true },
            attributesStore,
            telemetryStore,
            []
          );
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
          createLoggerProvider(
            app,
            { enableBreadcrumbs: true },
            attributesStore,
            telemetryStore,
            []
          );
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
