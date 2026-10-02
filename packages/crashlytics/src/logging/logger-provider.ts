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
  LogRecordExporter,
  LogRecordProcessor
} from '@opentelemetry/sdk-logs';
import { logs } from '@opentelemetry/api-logs';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { NavigationTimingInstrumentation } from '@opentelemetry/browser-instrumentation/experimental/navigation-timing';
import { UserActionInstrumentation } from '@opentelemetry/browser-instrumentation/experimental/user-action';
import { WebVitalsInstrumentation } from '@opentelemetry/browser-instrumentation/experimental/web-vitals';
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
import { ExportResult, ExportResultCode } from '@opentelemetry/core';
import { CrashlyticsOptions } from '../public-types';
import {
  DEFAULT_TELEMETRY_ENDPOINT,
  DEFAULT_TELEMETRY_REGION
} from '../constants';
import { AttributesStore } from '../attributes-store';
import { OnErrorLogRecordProcessor } from './on-error-log-record-processor';
import { TelemetryStore } from '../telemetry-store';
import { FirebaseAttributesProcessor } from './attributes-processor';
import { isTelemetryUrl } from '../helpers';

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
  crashlyticsOptions: CrashlyticsOptions = {},
  attributesStore: AttributesStore,
  telemetryStore: TelemetryStore,
  dynamicHeaderProviders: DynamicHeaderProvider[] = []
): LoggerProviderResult {
  let endpointUrl =
    crashlyticsOptions.endpointUrl || DEFAULT_TELEMETRY_ENDPOINT;
  if (endpointUrl.endsWith('/')) {
    endpointUrl = endpointUrl.slice(0, -1);
  }

  const { projectId, appId, apiKey } = app.options;
  const region = crashlyticsOptions.region || DEFAULT_TELEMETRY_REGION;
  const otlpEndpoint = `${endpointUrl}/v1/projects/${projectId}/apps/${appId}/locations/${region}/logs`;

  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'firebase_telemetry_service',
    'firebase.project_id': projectId || '',
    'firebase.app_id': appId || ''
  });

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

  const onErrorLogRecordProcessor = new OnErrorLogRecordProcessor(
    logExporter,
    telemetryStore
  );

  const processors: LogRecordProcessor[] = [
    new FirebaseAttributesProcessor(attributesStore, projectId),
    onErrorLogRecordProcessor
  ];

  const loggerProvider = new LoggerProvider({
    resource,
    processors,
    logRecordLimits: {}
  });

  if (crashlyticsOptions.registerGlobalLoggerProvider) {
    logs.setGlobalLoggerProvider(loggerProvider);
  }

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
    const webVitals = new WebVitalsInstrumentation({
      enabled: false,
      // TODO: Consider making the raw attribution flag configurable in the future. Some customers
      // may want to disable this for performance or data reasons.
      includeRawAttribution: true
    });

    if (unregisterInstrumentations) {
      unregisterInstrumentations();
    }

    unregisterInstrumentations = registerInstrumentations({
      loggerProvider,
      instrumentations: [
        navigationTiming,
        webVitals,
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
  private endpointUrl?: string;

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
    this.endpointUrl = config.url;
  }

  override async export(
    logsToExport: ReadableLogRecord[],
    resultCallback: (result: ExportResult) => void
  ): Promise<void> {
    const filteredLogs = logsToExport.filter(log => {
      const url =
        log.attributes?.['url.full'] ||
        log.attributes?.['http.url'] ||
        log.attributes?.['resource.url'];
      return !isTelemetryUrl(url, this.endpointUrl);
    });

    if (filteredLogs.length === 0) {
      resultCallback({ code: ExportResultCode.SUCCESS });
      return;
    }

    const installationIdAttribute =
      await this.attributesStore.getInstallationIdAttribute();

    if (installationIdAttribute) {
      filteredLogs.forEach(log => {
        Object.assign(log.attributes, installationIdAttribute);
      });
    }
    super.export(filteredLogs, resultCallback);
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
