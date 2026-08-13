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
  BatchLogRecordProcessor,
  ReadableLogRecord,
  LogRecordExporter,
  LogRecordProcessor
} from '@opentelemetry/sdk-logs';
import { logs } from '@opentelemetry/api-logs';
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
import { FirebaseAttributesProcessor } from './attributes-processor';
import { isTelemetryUrl } from '../helpers';

/**
 * Create a logger provider for the current execution environment.
 *
 * @internal
 */
export function createLoggerProvider(
  app: FirebaseApp,
  crashlyticsOptions: CrashlyticsOptions = {},
  attributesStore: AttributesStore,
  dynamicHeaderProviders: DynamicHeaderProvider[] = []
): LoggerProvider {
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

  const processors: LogRecordProcessor[] = [
    new FirebaseAttributesProcessor(attributesStore, projectId),
    new BatchLogRecordProcessor({ exporter: logExporter })
  ];

  const provider = new LoggerProvider({
    resource,
    processors,
    logRecordLimits: {}
  });

  if (crashlyticsOptions.registerGlobalLoggerProvider) {
    logs.setGlobalLoggerProvider(provider);
  }

  return provider;
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
}
