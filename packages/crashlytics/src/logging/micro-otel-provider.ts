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
import { Logger, LoggerProvider, LogRecord } from '@opentelemetry/api-logs';
import { AttributesStore, ATTR_KEY_INSTALLATION_ID } from '../attributes-store';
import { CrashlyticsOptions } from '../public-types';
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
 * An ultra-lightweight OpenTelemetry Logger implementation (~1.5 kB gzipped) that converts
 * emitted LogRecord objects into OTLP-compliant JSON payloads and posts them over HTTP fetch.
 */
export class MicroOtelLogger implements Logger {
  private endpointUrl: string;

  constructor(
    private app: FirebaseApp,
    private attributesStore: AttributesStore,
    options?: CrashlyticsOptions
  ) {
    let endpointUrl =
      options?.endpointUrl || DEFAULT_TELEMETRY_ENDPOINT;
    if (endpointUrl.endsWith('/')) {
      endpointUrl = endpointUrl.slice(0, -1);
    }
    const { projectId, appId } = app.options;
    const region = options?.region || DEFAULT_TELEMETRY_REGION;
    this.endpointUrl = `${endpointUrl}/v1/projects/${projectId}/apps/${appId}/locations/${region}/logs`;
  }

  emit(logRecord: LogRecord): void {
    const dynamicAttributes = this.attributesStore.getLogAttributes();
    const mergedAttributes: Record<string, unknown> = {
      ...dynamicAttributes,
      ...(logRecord.attributes || {})
    };

    const cachedIid = this.attributesStore.getCachedInstallationId();
    if (cachedIid && mergedAttributes[ATTR_KEY_INSTALLATION_ID] === undefined) {
      mergedAttributes[ATTR_KEY_INSTALLATION_ID] = cachedIid;
    }

    const resourceAttributes: Record<string, unknown> = {
      'service.name': 'firebase_telemetry_service',
      'firebase.project_id': this.app.options.projectId || '',
      'firebase.app_id': this.app.options.appId || ''
    };

    const timeNano = logRecord.timestamp
      ? String(
          typeof logRecord.timestamp === 'number'
            ? logRecord.timestamp * 1000000
            : Date.now() * 1000000
        )
      : String(Date.now() * 1000000);

    const bodyVal =
      typeof logRecord.body === 'string'
        ? { stringValue: logRecord.body }
        : formatOtlpAttributeValue(logRecord.body);

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
              logRecords: [
                {
                  timeUnixNano: timeNano,
                  severityNumber: logRecord.severityNumber || 17,
                  severityText: logRecord.severityText || 'ERROR',
                  body: bodyVal,
                  attributes: formatOtlpAttributes(mergedAttributes)
                }
              ]
            }
          ]
        }
      ]
    };

    const apiKey = this.app.options.apiKey;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (apiKey) {
      headers['X-Goog-Api-Key'] = apiKey;
    }

    void fetch(this.endpointUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(otlpPayload)
    }).catch(() => {
      // Background telemetry send error ignored
    });
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
      logger = new MicroOtelLogger(this.app, this.attributesStore, this.options);
      this.loggers.set(name, logger);
    }
    return logger;
  }
}
