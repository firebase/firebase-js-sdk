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

import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  CompositePropagator,
  ExportResult,
  W3CTraceContextPropagator
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
import {
  OTLPExporterBase,
  OTLPExporterConfigBase,
  createOtlpNetworkExportDelegate
} from '@opentelemetry/otlp-exporter-base';
import { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';
import { DynamicHeaderProvider, DynamicSignalAttributeProvider } from '../types';
import { FirebaseApp } from '@firebase/app';
import { FirebaseSpanProcessor } from './firebase-span-processor';
import { sessionContextManager } from './session-context-manager';
import { JsonTraceSerializer } from '@opentelemetry/otlp-transformer';
import { FetchTransport } from '../logging/fetch-transport';

/**
 * Create a tracing provider for the current execution environment.
 *
 * @internal
 */
export function createTracingProvider(
  app: FirebaseApp,
  endpointUrl: string,
  dynamicHeaderProviders: DynamicHeaderProvider[] = [],
  dynamicSignalAttributeProviders: DynamicSignalAttributeProvider[] = []
): TracerProvider {
  if (typeof window === 'undefined') {
    return trace.getTracerProvider();
  }

  const { projectId, appId, apiKey } = app.options;

  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: appId,
    'gcp.project_id': projectId,
    'cloud.provider': 'gcp'
  });

  if (endpointUrl.endsWith('/')) {
    endpointUrl = endpointUrl.slice(0, -1);
  }

  const otlpEndpoint = `${endpointUrl}/v1/projects/${projectId}/locations/global/apps/${appId}/traces`;

  const traceExporter = new OTLPTraceExporter(
    {
      url: otlpEndpoint,
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'X-Goog-Api-Key': apiKey } : {})
      }
    },
    dynamicHeaderProviders,
    dynamicSignalAttributeProviders
  );

  const provider = new WebTracerProvider({
    resource,
    spanProcessors: [
      new FirebaseSpanProcessor(),
      // TODO: Remove console exporter before we ship
      new SimpleSpanProcessor(new ConsoleSpanExporter()),
      new BatchSpanProcessor(traceExporter)
    ]
  });

  provider.register({
    contextManager: sessionContextManager,
    propagator: new CompositePropagator({
      propagators: [new W3CTraceContextPropagator()]
    })
  });

  /* We must clean url before a regex match in the cases of special characters changing matched url.
     Ex: https://api.example.com/traces?version=1
     '.' -> matches any character so https://api-example.com/traces?version=1 will be ignored too
     `?` -> makes the `s` optional so https://api.example.com/trace?version=1 will be ignored too
  */
  const cleanedRegexEndpointUrl = endpointUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  registerInstrumentations({
    instrumentations: [
      new FetchInstrumentation({ ignoreUrls: [new RegExp(cleanedRegexEndpointUrl)] }),
      new XMLHttpRequestInstrumentation()
    ]
  });

  return provider;
}

class OTLPTraceExporter
  extends OTLPExporterBase<ReadableSpan[]>
  implements SpanExporter
{
  constructor(
    config: OTLPExporterConfigBase = {},
    dynamicHeaderProviders: DynamicHeaderProvider[] = [],
    private dynamicSignalAttributeProviders: DynamicSignalAttributeProvider[] = []
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
    const attributes = await Promise.all(
      this.dynamicSignalAttributeProviders.map(provider => provider.getAttribute())
    );

    const attributesToApply: Record<string, string> = {};
    for (const attr of attributes) {
      if (attr) {
        attributesToApply[attr[0]] = attr[1];
      }
    }

    if (Object.keys(attributesToApply).length > 0) {
      spans.forEach(span => {
        Object.assign(span.attributes, attributesToApply);
      });
    }
    super.export(spans, resultCallback);
  }
}
