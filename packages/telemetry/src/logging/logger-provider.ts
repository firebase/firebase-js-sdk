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
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { JsonLogsSerializer } from '@opentelemetry/otlp-transformer';
import type { OTLPExporterConfigBase } from '@opentelemetry/otlp-exporter-base';
import {
  OTLPExporterBase,
  createOtlpNetworkExportDelegate
} from '@opentelemetry/otlp-exporter-base';
import { FetchTransportEdge } from './fetch-transport.edge';

/**
 * Create a logger provider for the current execution environment.
 *
 * @internal
 */
export function createLoggerProvider(): LoggerProvider {
  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'firebase_telemetry_service'
  });
  const otlpEndpoint = `${process.env.OTEL_ENDPOINT}/api/v1/logs`;

  if (process?.env?.NEXT_RUNTIME === 'edge') {
    // We need a slightly custom implementation for the Edge Runtime, because it doesn't have access
    // to many features available in Node.
    const logExporter = new OTLPLogExporterEdge({ url: otlpEndpoint });
    const provider = new LoggerProvider({
      resource,
      processors: [new BatchLogRecordProcessor(logExporter)],
      logRecordLimits: {}
    });
    return provider;
  } else {
    const logExporter = new OTLPLogExporter({ url: otlpEndpoint });
    return new LoggerProvider({
      resource,
      processors: [new BatchLogRecordProcessor(logExporter)]
    });
  }
}

/** OTLP exporter that uses custom FetchTransport for use in the Edge Runtime. */
class OTLPLogExporterEdge
  extends OTLPExporterBase<ReadableLogRecord[]>
  implements LogRecordExporter
{
  constructor(config: OTLPExporterConfigBase = {}) {
    super(
      createOtlpNetworkExportDelegate(
        {
          timeoutMillis: 10000,
          concurrencyLimit: 5,
          compression: 'none'
        },
        JsonLogsSerializer,
        new FetchTransportEdge({
          url: config.url!,
          headers: () => ({
            'Content-Type': 'application/json'
          })
        })
      )
    );
  }
}
