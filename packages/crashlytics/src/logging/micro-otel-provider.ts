/**
 * @license
 * Copyright 2026 Google LLC
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
import { context } from '@opentelemetry/api';
import { Logger, LoggerProvider, LogRecord } from '@opentelemetry/api-logs';
import { suppressTracing } from '@opentelemetry/core';
import { AttributesStore } from '../attributes-store';
import { CrashlyticsOptions } from '../public-types';
import { isTelemetryUrl } from '../helpers';
import {
  DEFAULT_TELEMETRY_ENDPOINT,
  DEFAULT_TELEMETRY_REGION
} from '../constants';

export interface OtlpAttributeValue {
  stringValue?: string;
  boolValue?: boolean;
  intValue?: number;
  doubleValue?: number;
  arrayValue?: { values: OtlpAttributeValue[] };
  kvListValue?: { values: OtlpKeyValue[] };
}

export interface OtlpKeyValue {
  key: string;
  value: OtlpAttributeValue;
}

function formatOtlpAttributeValue(val: unknown): OtlpAttributeValue {
  if (typeof val === 'string') {
    return { stringValue: val };
  }
  if (typeof val === 'boolean') {
    return { boolValue: val };
  }
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { intValue: val } : { doubleValue: val };
  }
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.map(v => formatOtlpAttributeValue(v))
      }
    };
  }
  if (typeof val === 'object' && val !== null) {
    return {
      kvListValue: {
        values: formatOtlpAttributes(val as Record<string, unknown>)
      }
    };
  }
  return { stringValue: String(val) };
}

function formatOtlpAttributes(attrs: Record<string, unknown>): OtlpKeyValue[] {
  const result: OtlpKeyValue[] = [];
  for (const [key, value] of Object.entries(attrs)) {
    if (value !== undefined && value !== null) {
      result.push({
        key,
        value: formatOtlpAttributeValue(value)
      });
    }
  }
  return result;
}

/**
 * An ultra-lightweight OpenTelemetry Logger implementation (~1.8 kB gzipped) that converts
 * emitted LogRecord objects into OTLP-compliant JSON payloads, micro-batches bursts,
 * supports async flush(), and falls back to sendBeacon on page unload.
 */
export class MicroOtelLogger implements Logger {
  private endpointUrl: string;
  private pendingLogRecords: LogRecord[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingPromises: Set<Promise<void>> = new Set();
  private maxBatchSize = 10;
  private debounceMs = 250;

  constructor(
    private app: FirebaseApp,
    private attributesStore: AttributesStore,
    options?: CrashlyticsOptions
  ) {
    let endpointUrl = options?.endpointUrl || DEFAULT_TELEMETRY_ENDPOINT;
    if (endpointUrl.endsWith('/')) {
      endpointUrl = endpointUrl.slice(0, -1);
    }
    const { projectId, appId } = app.options;
    const region = options?.region || DEFAULT_TELEMETRY_REGION;
    this.endpointUrl = `${endpointUrl}/v1/projects/${projectId}/apps/${appId}/locations/${region}/logs`;
  }

  enabled(): boolean {
    return true;
  }

  emit(logRecord: LogRecord): void {
    const url =
      logRecord.attributes?.['url.full'] ||
      logRecord.attributes?.['http.url'] ||
      logRecord.attributes?.['resource.url'];
    if (isTelemetryUrl(url, this.endpointUrl)) {
      return;
    }

    this.pendingLogRecords.push(logRecord);

    if (
      this.pendingLogRecords.length >= this.maxBatchSize ||
      (typeof document !== 'undefined' && document.visibilityState === 'hidden')
    ) {
      void this.flush();
    } else if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => {
        this.flushTimer = null;
        void this.flush();
      }, this.debounceMs);
    }
  }

  async flush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.pendingLogRecords.length === 0) {
      await Promise.all(Array.from(this.pendingPromises));
      return;
    }

    const recordsToExport = [...this.pendingLogRecords];
    this.pendingLogRecords = [];

    const dynamicAttributes = this.attributesStore.getLogAttributes();

    const formattedLogRecords = recordsToExport.map(logRecord => {
      const mergedAttributes: Record<string, unknown> = {
        ...dynamicAttributes,
        ...(logRecord.attributes || {})
      };

      let timeNano: string;
      if (logRecord.timestamp instanceof Date) {
        timeNano = String(logRecord.timestamp.getTime() * 1000000);
      } else if (typeof logRecord.timestamp === 'number') {
        timeNano = String(logRecord.timestamp * 1000000);
      } else if (Array.isArray(logRecord.timestamp)) {
        timeNano = String(
          logRecord.timestamp[0] * 1000000000 + logRecord.timestamp[1]
        );
      } else {
        timeNano = String(Date.now() * 1000000);
      }

      const bodyVal =
        typeof logRecord.body === 'string'
          ? { stringValue: logRecord.body }
          : formatOtlpAttributeValue(logRecord.body);

      return {
        timeUnixNano: timeNano,
        severityNumber: logRecord.severityNumber || 17,
        severityText: logRecord.severityText || 'ERROR',
        body: bodyVal,
        attributes: formatOtlpAttributes(mergedAttributes)
      };
    });

    const resourceAttributes: Record<string, unknown> = {
      'service.name': 'firebase_telemetry_service',
      'firebase.project_id': this.app.options.projectId || '',
      'firebase.app_id': this.app.options.appId || ''
    };

    const otlpPayload = {
      resourceLogs: [
        {
          resource: {
            attributes: formatOtlpAttributes(resourceAttributes)
          },
          scopeLogs: [
            {
              scope: {
                name: '@firebase/crashlytics',
                version: '0.0.1'
              },
              logRecords: formattedLogRecords
            }
          ]
        }
      ]
    };

    const payloadStr = JSON.stringify(otlpPayload);

    // Fall back to sendBeacon if page is unloading
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.sendBeacon === 'function' &&
      typeof document !== 'undefined' &&
      document.visibilityState === 'hidden'
    ) {
      try {
        const blob = new Blob([payloadStr], { type: 'application/json' });
        if (navigator.sendBeacon(this.endpointUrl, blob)) {
          return;
        }
      } catch (e) {
        // Fall back to fetch
      }
    }

    const apiKey = this.app.options.apiKey;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (apiKey) {
      headers['X-Goog-Api-Key'] = apiKey;
    }

    const sendRequest = async (retriesLeft = 1): Promise<void> => {
      try {
        const response = await context.with(
          suppressTracing(context.active()),
          () =>
            fetch(this.endpointUrl, {
              method: 'POST',
              headers,
              body: payloadStr
            })
        );
        if (!response.ok && retriesLeft > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return sendRequest(retriesLeft - 1);
        }
      } catch (err) {
        if (retriesLeft > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return sendRequest(retriesLeft - 1);
        }
      }
    };

    const sendPromise = sendRequest().finally(() => {
      this.pendingPromises.delete(sendPromise);
    });

    this.pendingPromises.add(sendPromise);
    await sendPromise;
  }
}

/**
 * A lightweight OpenTelemetry LoggerProvider implementing the LoggerProvider interface.
 */
export class MicroOtelLoggerProvider implements LoggerProvider {
  private loggers: Map<string, MicroOtelLogger> = new Map();

  constructor(
    private app: FirebaseApp,
    private attributesStore: AttributesStore,
    private options?: CrashlyticsOptions
  ) {}

  getLogger(name: string, _version?: string, _options?: unknown): Logger {
    let logger = this.loggers.get(name);
    if (!logger) {
      logger = new MicroOtelLogger(
        this.app,
        this.attributesStore,
        this.options
      );
      this.loggers.set(name, logger);
    }
    return logger;
  }

  async flush(): Promise<void> {
    const flushPromises: Array<Promise<void>> = [];
    for (const logger of this.loggers.values()) {
      flushPromises.push(logger.flush());
    }
    await Promise.all(flushPromises);
  }

  async forceFlush(): Promise<void> {
    await this.flush();
  }

  async shutdown(): Promise<void> {
    await this.flush();
  }
}
