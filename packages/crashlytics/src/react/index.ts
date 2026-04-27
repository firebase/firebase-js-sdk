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

import { FirebaseApp } from '@firebase/app';
import { registerCrashlytics } from '../register';
import { recordError, getCrashlytics } from '../api';
import { CrashlyticsOptions, Crashlytics } from '../public-types';
import { useEffect, useState, useCallback } from 'react';
import { Span, trace, SpanOptions, context } from '@opentelemetry/api';
import { CrashlyticsService } from '../service';
import React from 'react';

registerCrashlytics();

export * from '../public-types';

/**
 * Registers event listeners for uncaught errors and automatically traces network requests.
 *
 * This should be installed near the root of your application, wrapping your main content.
 * Background network requests (fetch/XHR) triggered without user interaction will be
 * automatically traced, and the spans will end only after the UI has completed rendering and painting.
 *
 * @example
 * ```tsx
 * import { FirebaseCrashlytics } from "@firebase/crashlytics/react";
 *
 * export default function MyApp() {
 *   return (
 *     <FirebaseCrashlytics firebaseApp={app}>
 *       <App />
 *     </FirebaseCrashlytics>
 *   );
 * }
 * ```
 *
 * @param firebaseApp - The {@link @firebase/app#FirebaseApp} instance to use.
 * @param crashlyticsOptions - {@link CrashlyticsOptions} that configure the Crashlytics instance.
 * @param children - The application content to be rendered and traced.
 * @returns The rendered children.
 *
 * @public
 */
export function FirebaseCrashlytics({
  firebaseApp,
  crashlyticsOptions,
  children
}: {
  firebaseApp: FirebaseApp;
  crashlyticsOptions?: CrashlyticsOptions;
  children?: React.ReactNode;
}): React.ReactElement | null {
  const [crashlytics, setCrashlytics] = useState<Crashlytics | undefined>();

  useEffect(() => {
    const inst = getCrashlytics(firebaseApp, crashlyticsOptions);
    setCrashlytics(inst);

    if (typeof window === 'undefined') {
      return;
    }

    const errorListener = (event: ErrorEvent): void => {
      recordError(inst, event.error, {});
    };

    const unhandledRejectionListener = (event: PromiseRejectionEvent): void => {
      recordError(inst, event.reason, {});
    };

    try {
      window.addEventListener('error', errorListener);
      window.addEventListener('unhandledrejection', unhandledRejectionListener);
    } catch (error) {
      // Log the error here, but don't die.
      console.warn(`Firebase Crashlytics was not initialized:\n`, error);
    }
    return () => {
      window.removeEventListener('error', errorListener);
      window.removeEventListener(
        'unhandledrejection',
        unhandledRejectionListener
      );
    };
  }, [firebaseApp, crashlyticsOptions]);

  useAutoNetworkTracing(crashlytics);

  return (
    React.createElement(React.Fragment, null, children) as React.ReactElement
  ) || null;
}

/**
 * A hook that ends the provided OpenTelemetry span when the component has finished rendering
 * and the browser has painted the frame.
 *
 * @param span - The OpenTelemetry span to end.
 *
 * @public
 */
export function useReportRenderComplete(span: Span | undefined): void {
  useEffect(() => {
    if (!span) {
      return;
    }

    let rafId1: number;
    let rafId2: number;
    let ended = false;

    // Use double requestAnimationFrame to ensure the browser has painted the frame
    rafId1 = requestAnimationFrame(() => {
      rafId2 = requestAnimationFrame(() => {
        if (!ended) {
          span.end();
          ended = true;
        }
      });
    });

    return () => {
      if (rafId1) {
        cancelAnimationFrame(rafId1);
      }
      if (rafId2) {
        cancelAnimationFrame(rafId2);
      }
      if (!ended) {
        span.end();
        ended = true;
      }
    };
  }, [span]);
}

/**
 * A hook that manages a span for a logical operation that includes both an async action
 * (like a fetch) and the subsequent UI render.
 *
 * @example
 * ```tsx
 * function MyComponent({ id }) {
 *   const [data, setData] = useState(null);
 *   const { run } = useTraceOperation('fetch-and-render', [id]);
 *
 *   useEffect(() => {
 *     run(async () => {
 *       const res = await fetch(`/api/data/${id}`);
 *       setData(await res.json());
 *     });
 *   }, [id, run]);
 *
 *   return <div>{data?.name}</div>;
 * }
 * ```
 *
 * @param operationName - The name of the span.
 * @param deps - Dependency array that triggers a new span when changed.
 * @param options - Optional span options.
 * @returns An object containing the current span and a `run` function to execute async logic.
 *
 * @public
 */
export function useTraceOperation(
  operationName: string,
  deps: readonly unknown[],
  options?: SpanOptions
): { span: Span | undefined; run: <T>(fn: () => Promise<T>) => Promise<T> } {
  const [span, setSpan] = useState<Span | undefined>();

  useEffect(() => {
    const tracer = trace.getTracer('@firebase/crashlytics');
    const newSpan = tracer.startSpan(operationName, options);
    setSpan(newSpan);
  }, deps);

  useReportRenderComplete(span);

  const run = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T> => {
      if (!span) {
        return fn();
      }
      return context.with(trace.setSpan(context.active(), span), () => fn());
    },
    [span]
  );

  return { span, run };
}

/**
 * Internal hook to automatically trace network requests with render completion.
 */
function useAutoNetworkTracing(crashlytics: Crashlytics | undefined): void {
  useEffect(() => {
    if (!crashlytics || typeof window === 'undefined') {
      return;
    }

    const service = crashlytics as CrashlyticsService;
    const { tracingProvider } = service;
    if (!tracingProvider) {
      return;
    }
    const tracer = tracingProvider.getTracer('@firebase/crashlytics-auto');

    // Get endpoints to ignore
    const options = service.options;
    const endpointUrl = options?.endpointUrl || 'http://localhost';
    const tracingUrl =
      options?.tracingUrl ||
      'https://staging-firebasetelemetry.sandbox.googleapis.com';

    const shouldIgnore = (url: string): boolean => {
      return url.includes(endpointUrl) || url.includes(tracingUrl);
    };

    /**
     * Determines if the current request should wait for a UI render before ending the span.
     * We only wait if the request was NOT triggered by a direct user interaction.
     */
    const shouldWaitByRender = (): boolean => {
      // isActive is true if there's an ongoing user interaction (click, keydown, etc.)
      return !(navigator as any).userActivation?.isActive;
    };

    // Instrument Fetch
    const originalFetch = window.fetch;
    window.fetch = function (...args): Promise<Response> {
      const url =
        typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;

      // If this is a user-initiated request, don't create a parent span.
      // Auto-instrumentation will handle it.
      if (shouldIgnore(url) || !shouldWaitByRender()) {
        return originalFetch.apply(window, args);
      }

      const span = tracer.startSpan(`fetch ${url}`);
      return context.with(trace.setSpan(context.active(), span), async () => {
        try {
          return await originalFetch.apply(window, args);
        } finally {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              span.end();
            });
          });
        }
      });
    };

    // Instrument XMLHttpRequest
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (
      this: XMLHttpRequest & { _span?: Span },
      ...args: any[]
    ): void {
      const url = args[1];
      // Only create a parent span if it's a background request
      if (!shouldIgnore(url) && shouldWaitByRender()) {
        this._span = tracer.startSpan(`xhr ${url}`);
      }
      return originalOpen.apply(this, args as any);
    };

    XMLHttpRequest.prototype.send = function (
      this: XMLHttpRequest & { _span?: Span },
      ...args: any[]
    ): void {
      if (this._span) {
        const span = this._span;
        this.addEventListener('loadend', () => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              span.end();
            });
          });
        });
        return context.with(trace.setSpan(context.active(), span), () =>
          originalSend.apply(this, args as any)
        );
      }
      return originalSend.apply(this, args as any);
    };

    return () => {
      window.fetch = originalFetch;
      XMLHttpRequest.prototype.open = originalOpen;
      XMLHttpRequest.prototype.send = originalSend;
    };
  }, [crashlytics]);
}
