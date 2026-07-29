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

import {
  LoggerProvider,
  ReadableLogRecord,
  LogRecordExporter
} from '@opentelemetry/sdk-logs';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { NavigationTimingInstrumentation } from '@opentelemetry/browser-instrumentation/experimental/navigation-timing';
import { UserActionInstrumentation } from '@opentelemetry/browser-instrumentation/experimental/user-action';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { JsonLogsSerializer } from '@opentelemetry/otlp-transformer';
import type { OTLPExporterConfigBase } from '@opentelemetry/otlp-exporter-base';
import {
  OTLPExporterBase,
  createOtlpNetworkExportDelegate
} from '@opentelemetry/otlp-exporter-base';
import { FetchTransport } from '../fetch-transport';
import { DynamicHeaderProvider } from '../types';
import { FirebaseApp } from '@firebase/app';
import { ExportResult } from '@opentelemetry/core';
import { CrashlyticsOptions } from '../public-types';
import {
  DEFAULT_TELEMETRY_ENDPOINT,
  DEFAULT_TELEMETRY_REGION
} from '../constants';
import { AttributesStore } from '../attributes-store';
import { OnErrorLogRecordProcessor } from './on-error-log-record-processor';

let unregisterInstrumentations: (() => void) | undefined;

/**
 * Result returned by {@link createLoggerProvider}.
 *
 * @internal
 */
export interface LoggerProviderResult {
  loggerProvider: LoggerProvider;
  onErrorLogRecordProcessor: OnErrorLogRecordProcessor;
}

/**
 * Create a logger provider for the current execution environment.
 *
 * @internal
 */
export function createLoggerProvider(
  app: FirebaseApp,
  crashlyticsOptions: CrashlyticsOptions,
  attributesStore: AttributesStore,
  dynamicHeaderProviders: DynamicHeaderProvider[] = []
): LoggerProviderResult {
  let endpointUrl =
    crashlyticsOptions.endpointUrl || DEFAULT_TELEMETRY_ENDPOINT;

  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'firebase_telemetry_service'
  });
  if (endpointUrl.endsWith('/')) {
    endpointUrl = endpointUrl.slice(0, -1);
  }
  const { projectId, appId, apiKey } = app.options;
  const region = crashlyticsOptions.region || DEFAULT_TELEMETRY_REGION;
  const otlpEndpoint = `${endpointUrl}/v1/projects/${projectId}/apps/${appId}/locations/${region}/logs`;
  const logExporter = new OTLPLogExporter(
    {
      url: otlpEndpoint,
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'X-Goog-Api-Key': apiKey } : {})
      }
    },
    dynamicHeaderProviders,
    attributesStore
  );

  const onErrorLogRecordProcessor = new OnErrorLogRecordProcessor(logExporter);

  // TODO: Remove this custom processor and use applyCustomLogRecordData in the instrumentation config once
  // @opentelemetry/browser-instrumentation supports it across all standard/experimental packages.
  const customAttributesProcessor = {
    onEmit: (logRecord: ReadableLogRecord) => {
      Object.assign(logRecord.attributes, attributesStore.getLogAttributes());
    },
    forceFlush: () => Promise.resolve(),
    shutdown: () => Promise.resolve()
  };

  const loggerProvider = new LoggerProvider({
    resource,
    processors: [customAttributesProcessor, onErrorLogRecordProcessor],
    logRecordLimits: {}
  });

  // TODO: Enable once @opentelemetry/browser-instrumentation supports applyCustomLogRecordData across its packages
  // const applyCustomLogRecordData = (logRecord: LogRecord): void => {
  //   logRecord.attributes = {
  //     ...logRecord.attributes,
  //     ...attributesStore.getLogAttributes()
  //   };
  // };

  if (typeof window !== 'undefined') {
    /*
     * Initialize as disabled to prevent the instrumentation from auto-enabling during construction.
     * In SSR frameworks (like Next.js), the page is already loaded when this script executes, so
     * it will try to emit the navigation timing immediately. Deferring the enable state ensures
     * the loggerProvider is fully bound by registerInstrumentations before the event is emitted.
     * registerInstrumentations will automatically enable it once the provider is set.
     */
    const navigationTiming = new NavigationTimingInstrumentation({
      enabled: false
    });

    if (unregisterInstrumentations) {
      unregisterInstrumentations();
    }

    unregisterInstrumentations = registerInstrumentations({
      loggerProvider,
      instrumentations: [
        navigationTiming,
        new UserActionInstrumentation({
          autoCapturedActions: ['click']
        })
      ]
    });
  }

  return { loggerProvider, onErrorLogRecordProcessor };
}

/** OTLP exporter that uses custom FetchTransport and resolves async attributes. */
class OTLPLogExporter
  extends OTLPExporterBase<ReadableLogRecord[]>
  implements LogRecordExporter
{
  constructor(
    config: OTLPExporterConfigBase = {},
    dynamicHeaderProviders: DynamicHeaderProvider[] = [],
    private attributesStore: AttributesStore
  ) {
    super(
      createOtlpNetworkExportDelegate(
        {
          timeoutMillis: 10000,
          concurrencyLimit: 5,
          compression: 'none'
        },
        JsonLogsSerializer,
        new FetchTransport({
          url: config.url!,
          headers: new Headers(
            typeof config.headers === 'object'
              ? (config.headers as Record<string, string>)
              : {}
          ),
          dynamicHeaderProviders
        })
      )
    );
  }

  override async export(
    logs: ReadableLogRecord[],
    resultCallback: (result: ExportResult) => void
  ): Promise<void> {
    const installationIdAttribute =
      await this.attributesStore.getInstallationIdAttribute();

    if (installationIdAttribute) {
      logs.forEach(log => {
        Object.assign(log.attributes, installationIdAttribute);
      });
    }
    super.export(logs, resultCallback);
  }

  async shutdown(): Promise<void> {
    // Basic implementation of shutdown for interface compliance
    console.log('OTLPLogExporter: shutdown called');
  }

  async forceFlush(): Promise<void> {
    // Basic implementation of forceFlush for interface compliance
    console.log('OTLPLogExporter: forceFlush called');
  }
}

/** @internal */
export function unregisterLoggerInstrumentations(): void {
  if (unregisterInstrumentations) {
    unregisterInstrumentations();
    unregisterInstrumentations = undefined;
  }
}
