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

import { FirebaseApp } from '@firebase/app';
import {
  BatchLogRecordProcessor,
  LoggerProvider
} from '@opentelemetry/sdk-logs';
import { AttributesStore } from '../attributes-store';
import { breadcrumbs } from '../breadcrumbs';
import { TelemetryStore } from '../telemetry-store';
import { FirebaseAttributesLogProcessor } from './attributes-log-processor';
import { createLoggerProvider } from './logger-provider';
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
    vi.restoreAllMocks();
  });

  it('should initialize LoggerProvider with FirebaseAttributesLogProcessor and BatchLogRecordProcessor by default when breadcrumbs() is not set', () => {
    const { loggerProvider: provider, onErrorLogRecordProcessor } =
      createLoggerProvider(app, {}, attributesStore, telemetryStore, []);
    expect(provider).toBeInstanceOf(LoggerProvider);
    expect(onErrorLogRecordProcessor).toBeUndefined();

    const attributesEmitSpy = vi.spyOn(
      FirebaseAttributesLogProcessor.prototype,
      'onEmit'
    );
    const batchEmitSpy = vi.spyOn(BatchLogRecordProcessor.prototype, 'onEmit');
    const onErrorEmitSpy = vi.spyOn(
      OnErrorLogRecordProcessor.prototype,
      'onEmit'
    );

    provider.getLogger('test-logger').emit({ body: 'test log' });

    expect(attributesEmitSpy).toHaveBeenCalledTimes(1);
    expect(batchEmitSpy).toHaveBeenCalledTimes(1);
    expect(onErrorEmitSpy).not.toHaveBeenCalled();
    expect(attributesEmitSpy.mock.invocationCallOrder[0]).toBeLessThan(
      batchEmitSpy.mock.invocationCallOrder[0]
    );
  });

  it('should initialize LoggerProvider with FirebaseAttributesLogProcessor and OnErrorLogRecordProcessor when breadcrumbs() is enabled', () => {
    const { loggerProvider: provider, onErrorLogRecordProcessor } =
      createLoggerProvider(
        app,
        { features: [breadcrumbs()] },
        attributesStore,
        telemetryStore,
        []
      );
    expect(provider).toBeInstanceOf(LoggerProvider);
    expect(onErrorLogRecordProcessor).toBeInstanceOf(OnErrorLogRecordProcessor);

    const attributesEmitSpy = vi.spyOn(
      FirebaseAttributesLogProcessor.prototype,
      'onEmit'
    );
    const batchEmitSpy = vi.spyOn(BatchLogRecordProcessor.prototype, 'onEmit');
    const onErrorEmitSpy = vi.spyOn(
      OnErrorLogRecordProcessor.prototype,
      'onEmit'
    );

    provider.getLogger('test-logger').emit({ body: 'test log' });

    expect(attributesEmitSpy).toHaveBeenCalledTimes(1);
    expect(onErrorEmitSpy).toHaveBeenCalledTimes(1);
    expect(batchEmitSpy).not.toHaveBeenCalled();
    expect(attributesEmitSpy.mock.invocationCallOrder[0]).toBeLessThan(
      onErrorEmitSpy.mock.invocationCallOrder[0]
    );
  });

  describe('BatchLogRecordProcessor auto-flush on document hide', () => {
    it('should pass disableAutoFlushOnDocumentHide: true to BatchLogRecordProcessor by default when breadcrumbs() is not enabled', () => {
      if ('_onInit' in BatchLogRecordProcessor.prototype) {
        // Browser environment (Webpack ES module bundle where namespace exports are non-configurable)
        const onInitSpy = vi.spyOn(
          BatchLogRecordProcessor.prototype as unknown as {
            _onInit: (options: unknown) => void;
          },
          '_onInit'
        );
        try {
          createLoggerProvider(app, {}, attributesStore, telemetryStore, []);
          expect(onInitSpy).toHaveBeenCalledTimes(1);
          const args = onInitSpy.mock.calls[0][0];
          expect(args).toHaveProperty('disableAutoFlushOnDocumentHide', true);
        } finally {
          onInitSpy.mockRestore();
        }
      } else {
        // Node environment
        const BaseClass = Object.getPrototypeOf(BatchLogRecordProcessor);
        const BaseSpy = vi.fn(function (this: object, options: unknown) {
          return Reflect.construct(
            BaseClass,
            [options],
            new.target || this.constructor
          );
        });
        Object.setPrototypeOf(BaseSpy, Object.getPrototypeOf(BaseClass));
        BaseSpy.prototype = BaseClass.prototype;
        Object.setPrototypeOf(BatchLogRecordProcessor, BaseSpy);
        try {
          createLoggerProvider(app, {}, attributesStore, telemetryStore, []);
          expect(BaseSpy).toHaveBeenCalledTimes(1);
          const args = BaseSpy.mock.calls[0][0];
          expect(args).toHaveProperty('disableAutoFlushOnDocumentHide', true);
        } finally {
          Object.setPrototypeOf(BatchLogRecordProcessor, BaseClass);
        }
      }
    });

    it('should pass disableAutoFlushOnDocumentHide: true to BatchLogRecordProcessor when breadcrumbs() is enabled', () => {
      if ('_onInit' in BatchLogRecordProcessor.prototype) {
        // Browser environment (Webpack ES module bundle where namespace exports are non-configurable)
        const onInitSpy = vi.spyOn(
          BatchLogRecordProcessor.prototype as unknown as {
            _onInit: (options: unknown) => void;
          },
          '_onInit'
        );
        try {
          createLoggerProvider(
            app,
            { features: [breadcrumbs()] },
            attributesStore,
            telemetryStore,
            []
          );
          expect(onInitSpy).toHaveBeenCalledTimes(1);
          const args = onInitSpy.mock.calls[0][0];
          expect(args).toHaveProperty('disableAutoFlushOnDocumentHide', true);
        } finally {
          onInitSpy.mockRestore();
        }
      } else {
        // Node environment
        const BaseSpy = vi.fn(function (this: object, options: unknown) {
          return Reflect.construct(
            BatchLogRecordProcessor,
            [options],
            new.target || this.constructor
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
            { features: [breadcrumbs()] },
            attributesStore,
            telemetryStore,
            []
          );
          expect(BaseSpy).toHaveBeenCalledTimes(1);
          const args = BaseSpy.mock.calls[0][0];
          expect(args).toHaveProperty('disableAutoFlushOnDocumentHide', true);
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
