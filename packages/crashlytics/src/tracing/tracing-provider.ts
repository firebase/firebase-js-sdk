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

import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  CompositePropagator,
  W3CTraceContextPropagator,
  ExportResult
} from '@opentelemetry/core';
import { TracerProvider, trace } from '@opentelemetry/api';
import {
  WebTracerProvider,
  BatchSpanProcessor,
  SimpleSpanProcessor,
  ConsoleSpanExporter
} from '@opentelemetry/sdk-trace-web';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { OTLPTraceExporter as OTLPStandardTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import {
  OTLPExporterBase,
  OTLPExporterConfigBase,
  createOtlpNetworkExportDelegate
} from '@opentelemetry/otlp-exporter-base';
import { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';
import { DynamicHeaderProvider } from '../types';
import { FirebaseApp } from '@firebase/app';
import { AttributesStore } from '../attributes-store';
import { FirebaseSpanProcessor } from './firebase-span-processor';
import { JsonTraceSerializer } from '@opentelemetry/otlp-transformer';
import { FetchTransport } from '../fetch-transport';
import {
  RESOURCE_ATTRIBUTE_KEYS,
  DEFAULT_TELEMETRY_REGION
} from '../constants';
import { CrashlyticsOptions } from '../public-types';

/**
 * Create a tracing provider for the current execution environment.
 *
 * @internal
 */
export function createTracingProvider(
  app: FirebaseApp,
  crashlyticsOptions: CrashlyticsOptions,
  attributesStore: AttributesStore,
  dynamicHeaderProviders: DynamicHeaderProvider[] = []
): TracerProvider {
  if (typeof window === 'undefined') {
    return trace.getTracerProvider();
  }
  // TODO: change to default endpoint once it exists
  const endpointUrl = crashlyticsOptions.endpointUrl || 'http://localhost';
  let tracingUrl = crashlyticsOptions.tracingUrl || 'http://localhost';

  const { projectId, appId, apiKey } = app.options;
  const region = crashlyticsOptions.region || DEFAULT_TELEMETRY_REGION;

  const resource = resourceFromAttributes({
    [RESOURCE_ATTRIBUTE_KEYS.CLOUD_RESOURCE_ID]: `//firebasetelemetry.googleapis.com/projects/${projectId}/locations/${region}/`,
    [RESOURCE_ATTRIBUTE_KEYS.GCP_FIREBASE_APP_ID]: appId,
    [RESOURCE_ATTRIBUTE_KEYS.GCP_FIREBASE_DOMAIN]: window.location.hostname,
    [RESOURCE_ATTRIBUTE_KEYS.SERVICE_NAMESPACE]: `//firebasetelemetry.googleapis.com/projects/${projectId}`,
    [RESOURCE_ATTRIBUTE_KEYS.GCP_PROJECT_ID]: projectId
  });

  if (tracingUrl.endsWith('/')) {
    tracingUrl = tracingUrl.slice(0, -1);
  }
  let otlpEndpoint;
  let traceExporter;
  if (tracingUrl === 'http://localhost:4318') {
    otlpEndpoint = `${tracingUrl}/v1/projects/${projectId}/apps/${appId}/traces`;
    traceExporter = new OTLPStandardTraceExporter({
      url: otlpEndpoint,
      headers: {
        'X-Goog-User-Project': projectId || '',
        ...(apiKey ? { 'X-Goog-Api-Key': apiKey } : {})
      }
    });
  } else {
    otlpEndpoint = `${tracingUrl}/v1/projects/${projectId}/apps/${appId}/locations/${region}/traces`;
    traceExporter = new OTLPTraceExporter(
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
  }

  const provider = new WebTracerProvider({
    resource,
    spanProcessors: [
      new FirebaseSpanProcessor(attributesStore),
      // TODO: Remove console exporter before we ship
      new SimpleSpanProcessor(new ConsoleSpanExporter()),
      new BatchSpanProcessor(traceExporter)
    ]
  });

  provider.register({
    propagator: new CompositePropagator({
      propagators: [new W3CTraceContextPropagator()]
    })
  });

  /* We must clean url before a regex match in the cases of special characters changing matched url.
     Ex: https://api.example.com/traces?version=1
     '.' -> matches any character so https://api-example.com/traces?version=1 will be ignored too
     `?` -> makes the `s` optional so https://api.example.com/traceversion=1 will be ignored too
  */
  const cleanedRegexEndpointUrl = endpointUrl.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  );
  const cleanedRegexTracingUrl = tracingUrl.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  );

  const networkInstrumentationConfig = {
    ignoreUrls: [
      new RegExp(cleanedRegexTracingUrl),
      new RegExp(cleanedRegexEndpointUrl)
    ],
    semconvStabilityOptIn: 'http'
  };

  registerInstrumentations({
    instrumentations: [
      new FetchInstrumentation(networkInstrumentationConfig),
      new XMLHttpRequestInstrumentation(networkInstrumentationConfig),
      new DocumentLoadInstrumentation({ semconvStabilityOptIn: 'http' })
    ]
  });

  return provider;
}

/** @internal */
export class OTLPTraceExporter
  extends OTLPExporterBase<ReadableSpan[]>
  implements SpanExporter
{
  constructor(
    config: OTLPExporterConfigBase = {},
    dynamicHeaderProviders: DynamicHeaderProvider[] = [],
    private attributesStore?: AttributesStore
  ) {
    super(
      createOtlpNetworkExportDelegate(
        {
          timeoutMillis: 10000,
          concurrencyLimit: 5,
          compression: 'none'
        },
        JsonTraceSerializer,
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
    spans: ReadableSpan[],
    resultCallback: (result: ExportResult) => void
  ): Promise<void> {
    const installationIdAttribute =
      await this.attributesStore?.getInstallationIdAttribute();

    if (installationIdAttribute) {
      spans.forEach(span => {
        Object.assign(span.attributes, installationIdAttribute);
      });
    }
    super.export(spans, resultCallback);
  }
}
