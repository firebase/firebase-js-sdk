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

import { useEffect } from 'react';
import { Span, trace, context } from '@opentelemetry/api';
import { Crashlytics } from '../public-types';
import { CrashlyticsService } from '../service';

/**
 * Internal hook to automatically trace network requests with render completion.
 *
 * @internal
 */
export function useAutoNetworkTracing(
  crashlytics: Crashlytics | undefined
): void {
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

    const endSpan = (span: Span): void => {
      if (shouldWaitByRender()) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            span.end();
          });
        });
      } else {
        span.end();
      }
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
          endSpan(span);
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
          endSpan(span);
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
