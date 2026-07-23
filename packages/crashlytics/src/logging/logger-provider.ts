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
  LoggerProvider as SdkLoggerProvider,
  BatchLogRecordProcessor,
  ReadableLogRecord,
  LogRecordExporter,
  LogRecordProcessor
} from '@opentelemetry/sdk-logs';
import { logs, LoggerProvider as ApiLoggerProvider } from '@opentelemetry/api-logs';
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
import { FirebaseAttributesProcessor } from './attributes-processor';
import { MicroOtelLoggerProvider } from './micro-otel-provider';

/**
 * Resolves or creates an OpenTelemetry LoggerProvider for the Crashlytics instance.
 *
 * Supports zero-config defaults as well as power user options (custom LoggerProvider,
 * global OTel binding, extra processors/exporters, and custom resources).
 *
 * @internal
 */
export function resolveLoggerProvider(
  app: FirebaseApp,
  crashlyticsOptions: CrashlyticsOptions = {},
  attributesStore: AttributesStore,
  dynamicHeaderProviders: DynamicHeaderProvider[] = []
): ApiLoggerProvider {
  // 1. Explicit user-supplied LoggerProvider
  if (crashlyticsOptions.loggerProvider) {
    return crashlyticsOptions.loggerProvider;
  }

  // 2. Use global OpenTelemetry LoggerProvider if requested
  if (crashlyticsOptions.useGlobalLoggerProvider) {
    const globalProvider = logs.getLoggerProvider();
    if (globalProvider && typeof globalProvider.getLogger === 'function') {
      return globalProvider;
    }
  }

  // 3. If extra OTel SDK features or automatic instrumentation are requested, use full SDK LoggerProvider
  if (
    crashlyticsOptions.extraProcessors ||
    crashlyticsOptions.extraExporters ||
    crashlyticsOptions.resource ||
    crashlyticsOptions.registerGlobalLoggerProvider ||
    crashlyticsOptions.instrumentation
  ) {
    let endpointUrl =
      crashlyticsOptions.endpointUrl || DEFAULT_TELEMETRY_ENDPOINT;
    if (endpointUrl.endsWith('/')) {
      endpointUrl = endpointUrl.slice(0, -1);
    }

    const { projectId, appId, apiKey } = app.options;
    const region = crashlyticsOptions.region || DEFAULT_TELEMETRY_REGION;
    const otlpEndpoint = `${endpointUrl}/v1/projects/${projectId}/apps/${appId}/locations/${region}/logs`;

    let resource = resourceFromAttributes({
      [ATTR_SERVICE_NAME]: 'firebase_telemetry_service',
      'firebase.project_id': projectId || '',
      'firebase.app_id': appId || ''
    });

    if (crashlyticsOptions.resource) {
      resource = resource.merge(crashlyticsOptions.resource);
    }

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

    const processors: LogRecordProcessor[] = [
      new FirebaseAttributesProcessor(attributesStore)
    ];

    if (crashlyticsOptions.extraProcessors) {
      processors.push(...crashlyticsOptions.extraProcessors);
    }

    processors.push(new BatchLogRecordProcessor(logExporter));

    if (crashlyticsOptions.extraExporters) {
      for (const exporter of crashlyticsOptions.extraExporters) {
        processors.push(new BatchLogRecordProcessor(exporter));
      }
    }

    const provider = new SdkLoggerProvider({
      resource,
      processors,
      logRecordLimits: {}
    });

    if (
      crashlyticsOptions.registerGlobalLoggerProvider ||
      crashlyticsOptions.instrumentation
    ) {
      logs.setGlobalLoggerProvider(provider);
    }

    return provider;
  }

  // 4. Default lightweight MicroOtelLoggerProvider (~1.5 kB gzipped)
  return new MicroOtelLoggerProvider(app, attributesStore, crashlyticsOptions);
}

/**
 * Backward compatible alias for resolveLoggerProvider.
 * @internal
 */
export function createLoggerProvider(
  app: FirebaseApp,
  crashlyticsOptions: CrashlyticsOptions,
  attributesStore: AttributesStore,
  dynamicHeaderProviders: DynamicHeaderProvider[] = []
): ApiLoggerProvider {
  return resolveLoggerProvider(
    app,
    crashlyticsOptions,
    attributesStore,
    dynamicHeaderProviders
  );
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
    logsToExport: ReadableLogRecord[],
    resultCallback: (result: ExportResult) => void
  ): Promise<void> {
    const installationIdAttribute =
      await this.attributesStore.getInstallationIdAttribute();

    if (installationIdAttribute) {
      logsToExport.forEach(log => {
        Object.assign(log.attributes, installationIdAttribute);
      });
    }
    super.export(logsToExport, resultCallback);
  }
}
