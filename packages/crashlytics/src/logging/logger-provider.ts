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
  BatchLogRecordProcessorBrowserOptions,
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
  DEFAULT_TELEMETRY_REGION,
  RESOURCE_ATTRIBUTE_KEYS
} from '../constants';
import { AttributesStore } from '../attributes-store';
import type { OnErrorLogRecordProcessor } from './on-error-log-record-processor';
import type { TelemetryStore } from '../telemetry-store';
import { FirebaseAttributesLogProcessor } from './attributes-log-processor';
import type { SessionSampler } from '../sampling/session-sampler';
import {
  getBreadcrumbsFeature,
  getTelemetryEndpointUrl,
  isTelemetryUrl
} from '../helpers';

/**
 * Result returned by {@link createLoggerProvider}.
 *
 * @internal
 */
export interface LoggerProviderResult {
  loggerProvider: LoggerProvider;
  onErrorLogRecordProcessor?: OnErrorLogRecordProcessor;
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
  telemetryStore?: TelemetryStore,
  dynamicHeaderProviders: DynamicHeaderProvider[] = [],
  sessionSampler?: SessionSampler
): LoggerProviderResult {
  const endpointUrl = getTelemetryEndpointUrl(crashlyticsOptions);

  const { projectId, appId, apiKey } = app.options;
  const region = crashlyticsOptions.region || DEFAULT_TELEMETRY_REGION;
  const otlpEndpoint = `${endpointUrl}/v1/logs`;

  const resourceAttributes: Record<string, string> = {
    [ATTR_SERVICE_NAME]: 'firebase_telemetry_service'
  };
  if (projectId) {
    resourceAttributes[RESOURCE_ATTRIBUTE_KEYS.GCP_PROJECT_ID] = projectId;
  }
  if (appId) {
    resourceAttributes[RESOURCE_ATTRIBUTE_KEYS.GCP_FIREBASE_APP_ID] = appId;
  }
  if (region !== DEFAULT_TELEMETRY_REGION) {
    resourceAttributes[RESOURCE_ATTRIBUTE_KEYS.CLOUD_REGION] = region;
  }
  const resource = resourceFromAttributes(resourceAttributes);

  const logExporter = new OTLPLogExporter(
    {
      url: otlpEndpoint,
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'X-Goog-Api-Key': apiKey } : {})
      }
    },
    dynamicHeaderProviders,
    attributesStore,
    sessionSampler
  );

  let onErrorLogRecordProcessor: OnErrorLogRecordProcessor | undefined;
  const processors: LogRecordProcessor[] = [
    new FirebaseAttributesLogProcessor(attributesStore, projectId)
  ];

  const breadcrumbsFeature = getBreadcrumbsFeature(crashlyticsOptions);
  if (breadcrumbsFeature) {
    onErrorLogRecordProcessor = breadcrumbsFeature.createLogRecordProcessor(
      logExporter,
      telemetryStore ?? breadcrumbsFeature.createTelemetryStore()
    );
    processors.push(onErrorLogRecordProcessor);
  } else {
    processors.push(
      new BatchLogRecordProcessor({
        exporter: logExporter,
        disableAutoFlushOnDocumentHide: true
      } as BatchLogRecordProcessorBrowserOptions)
    );
  }

  const loggerProvider = new LoggerProvider({
    resource,
    processors,
    logRecordLimits: {}
  });

  if (crashlyticsOptions.registerGlobalLoggerProvider) {
    logs.setGlobalLoggerProvider(loggerProvider);
  }

  if (breadcrumbsFeature && typeof window !== 'undefined') {
    breadcrumbsFeature.initializeLoggerInstrumentations(loggerProvider);
  }

  return { loggerProvider, onErrorLogRecordProcessor };
}

/**
 * OTLP exporter that uses custom FetchTransport, applies the session sampling decision and
 * resolves async attributes.
 */
class OTLPLogExporter
  extends OTLPExporterBase<ReadableLogRecord[]>
  implements LogRecordExporter
{
  private endpointUrl?: string;

  constructor(
    config: OTLPExporterConfigBase = {},
    dynamicHeaderProviders: DynamicHeaderProvider[] = [],
    private attributesStore: AttributesStore,
    private sessionSampler?: SessionSampler
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

    // Session sampling: the decision is made at the first export attempt of the session. Logs of
    // unsampled sessions are dropped here, before any network transmission. Logs of sampled
    // sessions carry the rate the decision was made with, so the backend can extrapolate counts
    // and reconcile the rate against the live configuration.
    if (this.sessionSampler) {
      const decision = await this.sessionSampler.getDecision();
      if (!decision.sampled) {
        resultCallback({ code: ExportResultCode.SUCCESS });
        return;
      }
      const samplingAttribute =
        this.sessionSampler.getSamplingAttribute(decision);
      filteredLogs.forEach(log => {
        Object.assign(log.attributes, samplingAttribute);
      });
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
