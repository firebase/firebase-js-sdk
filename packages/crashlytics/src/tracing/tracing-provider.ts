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
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { FirebaseApp } from '@firebase/app';

/**
 * Create a tracing provider for the current execution environment.
 *
 * @internal
 */
export function createTracingProvider(
  app: FirebaseApp,
  tracingUrl: string
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

  if (tracingUrl.endsWith('/')) {
    tracingUrl = tracingUrl.slice(0, -1);
  }

  const otlpEndpoint = `${tracingUrl}/v1/projects/${projectId}/apps/${appId}/traces`;

  const traceExporter = new OTLPTraceExporter({
    url: otlpEndpoint,
    headers: {
      'X-Goog-User-Project': projectId || '',
      ...(apiKey ? { 'X-Goog-Api-Key': apiKey } : {})
    }
  });

  const provider = new WebTracerProvider({
    resource,
    spanProcessors: [
      new SimpleSpanProcessor(new ConsoleSpanExporter()),
      new BatchSpanProcessor(traceExporter)
    ]
  });

  provider.register({
    propagator: new CompositePropagator({
      propagators: [new W3CTraceContextPropagator()]
    })
  });

  registerInstrumentations({
    instrumentations: [new DocumentLoadInstrumentation()]
  });

  return provider;
}
