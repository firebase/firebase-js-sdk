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
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
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
import { TelemetryStore } from '../telemetry-store';
import { OnErrorSpanProcessor } from './on-error-span-processor';
import { FirebaseAttributesSpanProcessor } from './attributes-span-processor';
import { JsonTraceSerializer } from '@opentelemetry/otlp-transformer';
import { FetchTransport } from '../fetch-transport';
import {
  DEFAULT_TELEMETRY_REGION,
  GCP_FIREBASE_DOMAIN,
  RESOURCE_ATTRIBUTE_KEYS
} from '../constants';
import { CrashlyticsOptions } from '../public-types';
import { getTelemetryEndpointUrl } from '../helpers';

let unregisterInstrumentations: (() => void) | undefined;

/**
 * Result returned by {@link createTracingProvider}.
 *
 * @internal
 */
export interface TracingProviderResult {
  tracingProvider: TracerProvider;
  onErrorSpanProcessor?: OnErrorSpanProcessor;
}

/**
 * Create a tracing provider for the current execution environment.
 *
 * @internal
 */
export function createTracingProvider(
  app: FirebaseApp,
  crashlyticsOptions: CrashlyticsOptions,
  attributesStore: AttributesStore,
  telemetryStore: TelemetryStore,
  dynamicHeaderProviders: DynamicHeaderProvider[] = []
): TracingProviderResult {
  if (typeof window === 'undefined') {
    return { tracingProvider: trace.getTracerProvider() };
  }
  const endpointUrl = getTelemetryEndpointUrl(crashlyticsOptions);

  const { projectId, appId, apiKey } = app.options;
  const region = crashlyticsOptions.region || DEFAULT_TELEMETRY_REGION;

  const resourceAttributes: Record<string, string> = {
    [GCP_FIREBASE_DOMAIN]: window.location.hostname
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

  const otlpEndpoint = `${endpointUrl}/v1/traces`;
  let traceExporter;
  if (endpointUrl === 'http://localhost:4318') {
    traceExporter = new OTLPStandardTraceExporter({
      url: otlpEndpoint,
      headers: {
        'X-Goog-User-Project': projectId || '',
        ...(apiKey ? { 'X-Goog-Api-Key': apiKey } : {})
      }
    });
  } else {
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

  const onErrorSpanProcessor = new OnErrorSpanProcessor(
    traceExporter,
    telemetryStore
  );

  const tracingProvider = new WebTracerProvider({
    resource,
    spanProcessors: [
      new FirebaseAttributesSpanProcessor(attributesStore),
      onErrorSpanProcessor
    ]
  });

  tracingProvider.register({
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

  const networkInstrumentationConfig = {
    ignoreUrls: [new RegExp(cleanedRegexEndpointUrl)],
    semconvStabilityOptIn: 'http'
  };

  if (unregisterInstrumentations) {
    unregisterInstrumentations();
  }

  unregisterInstrumentations = registerInstrumentations({
    instrumentations: [
      new FetchInstrumentation(networkInstrumentationConfig),
      new XMLHttpRequestInstrumentation(networkInstrumentationConfig),
      new DocumentLoadInstrumentation({
        semconvStabilityOptIn: 'http'
      })
    ]
  });

  return { tracingProvider, onErrorSpanProcessor };
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

/** @internal */
export function unregisterTracingInstrumentations(): void {
  if (unregisterInstrumentations) {
    unregisterInstrumentations();
    unregisterInstrumentations = undefined;
  }
}
