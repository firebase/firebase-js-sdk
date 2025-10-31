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
  LogRecordExporter
} from '@opentelemetry/sdk-logs';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { JsonLogsSerializer } from '@opentelemetry/otlp-transformer';
import type { OTLPExporterConfigBase } from '@opentelemetry/otlp-exporter-base';
import {
  OTLPExporterBase,
  createOtlpNetworkExportDelegate
} from '@opentelemetry/otlp-exporter-base';
import { FetchTransport } from './fetch-transport';
import { DynamicHeaderProvider } from '../types';
import { FirebaseApp } from '@firebase/app';

/**
 * Create a logger provider for the current execution environment.
 *
 * @internal
 */
export function createLoggerProvider(
  app: FirebaseApp,
  endpointUrl: string,
  dynamicHeaderProviders: DynamicHeaderProvider[] = []
): LoggerProvider {
  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'firebase_telemetry_service'
  });
  if (endpointUrl.endsWith('/')) {
    endpointUrl = endpointUrl.slice(0, -1);
  }
  const { projectId, appId, apiKey } = app.options;
  const otlpEndpoint = `${endpointUrl}/v1/projects/${projectId}/apps/${appId}/logs`;
  const logExporter = new OTLPLogExporter(
    {
      url: otlpEndpoint,
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'X-Goog-Api-Key': apiKey } : {})
      }
    },
    dynamicHeaderProviders
  );

  return new LoggerProvider({
    resource,
    processors: [new BatchLogRecordProcessor(logExporter)],
    logRecordLimits: {}
  });
}

/** OTLP exporter that uses custom FetchTransport. */
class OTLPLogExporter
  extends OTLPExporterBase<ReadableLogRecord[]>
  implements LogRecordExporter
{
  constructor(
    config: OTLPExporterConfigBase = {},
    dynamicHeaderProviders: DynamicHeaderProvider[] = []
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
          headers: new Headers(config.headers),
          dynamicHeaderProviders
        })
      )
    );
  }
}
