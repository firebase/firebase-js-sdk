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
import { DynamicHeaderProvider, DynamicLogAttributeProvider } from '../types';
import { FirebaseApp } from '@firebase/app';
import { ExportResult } from '@opentelemetry/core';

/**
 * Create a logger provider for the current execution environment.
 *
 * @internal
 */
export function createLoggerProvider(
  app: FirebaseApp,
  endpointUrl: string,
  dynamicHeaderProviders: DynamicHeaderProvider[] = [],
  dynamicLogAttributeProviders: DynamicLogAttributeProvider[] = []
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
    dynamicHeaderProviders,
    dynamicLogAttributeProviders
  );

  const loggerProvider = new LoggerProvider({
    resource
  });
  loggerProvider.addLogRecordProcessor(
    new BatchLogRecordProcessor(logExporter)
  );

  return loggerProvider;
}

/** OTLP exporter that uses custom FetchTransport and resolves async attributes. */
class OTLPLogExporter
  extends OTLPExporterBase<ReadableLogRecord[]>
  implements LogRecordExporter
{
  constructor(
    config: OTLPExporterConfigBase = {},
    dynamicHeaderProviders: DynamicHeaderProvider[] = [],
    private dynamicLogAttributeProviders: DynamicLogAttributeProvider[] = []
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
          headers: new Headers(config.headers as Record<string, string>),
          dynamicHeaderProviders
        })
      )
    );
  }

  override async export(
    logs: ReadableLogRecord[],
    resultCallback: (result: ExportResult) => void
  ): Promise<void> {
    const attributes = await Promise.all(
      this.dynamicLogAttributeProviders.map(provider => provider.getAttribute())
    );

    const attributesToApply = Object.fromEntries(
      attributes.filter((attr): attr is [string, string] => attr != null)
    );

    if (Object.keys(attributesToApply).length > 0) {
      logs.forEach(log => {
        Object.assign(log.attributes, attributesToApply);
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
