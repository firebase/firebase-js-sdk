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
import sinon from 'sinon';
import { FirebaseApp } from '@firebase/app';
import { LoggerProvider } from '@opentelemetry/sdk-logs';
import { TracerProvider } from '@opentelemetry/api';
import { AttributesStore } from './attributes-store';
import { CrashlyticsService } from './service';
import { TelemetryStore } from './telemetry-store';

describe('CrashlyticsService', () => {
  const fakeApp = {} as FirebaseApp;

  const fakeAttributesStore = {
    updateAppVersion: (): void => {}
  } as unknown as AttributesStore;

  const fakeTelemetryStore = {} as unknown as TelemetryStore;

  afterEach(() => {
    sinon.restore();
  });

  describe('_delete() lifecycle', () => {
    it('should unsubscribe listeners, shutdown providers, and call OTel unregister functions', async () => {
      const unsubscribeSpy = sinon.spy();
      const loggerShutdownStub = sinon.stub().resolves();
      const tracingShutdownStub = sinon.stub().resolves();

      const fakeLoggerProvider = {
        shutdown: loggerShutdownStub
      } as unknown as LoggerProvider;

      const fakeTracingProvider = {
        shutdown: tracingShutdownStub
      } as unknown as TracerProvider;

      const service = new CrashlyticsService(
        fakeApp,
        fakeLoggerProvider,
        fakeTracingProvider,
        fakeAttributesStore,
        fakeTelemetryStore
      );

      service.unsubscribeListeners(unsubscribeSpy);

      await service._delete();

      expect(unsubscribeSpy.called).to.be.true;
      expect(loggerShutdownStub.called).to.be.true;
      expect(tracingShutdownStub.called).to.be.true;
    });

    it('should not throw if unsubscribeListeners is not registered and providers lack shutdown methods', async () => {
      const service = new CrashlyticsService(
        fakeApp,
        {} as LoggerProvider, // no shutdown method
        {} as TracerProvider, // no shutdown method
        fakeAttributesStore,
        fakeTelemetryStore
      );

      try {
        await service._delete();
      } catch (err) {
        expect.fail(
          'Should not throw if unsubscribeListeners is not registered and providers lack shutdown methods'
        );
      }
    });

    it('should not throw when provider shutdown methods reject', async () => {
      sinon.stub(console, 'warn');
      const loggerShutdownStub = sinon
        .stub()
        .rejects(new Error('Logger shutdown failed'));
      const tracingShutdownStub = sinon
        .stub()
        .rejects(new Error('Tracing shutdown failed'));

      const fakeLoggerProvider = {
        shutdown: loggerShutdownStub
      } as unknown as LoggerProvider;

      const fakeTracingProvider = {
        shutdown: tracingShutdownStub
      } as unknown as TracerProvider;

      const service = new CrashlyticsService(
        fakeApp,
        fakeLoggerProvider,
        fakeTracingProvider,
        fakeAttributesStore,
        fakeTelemetryStore
      );

      try {
        await service._delete();
      } catch (err) {
        expect.fail('Should not throw when provider shutdown methods reject');
      }

      expect(loggerShutdownStub.called).to.be.true;
      expect(tracingShutdownStub.called).to.be.true;
    });
  });
});
