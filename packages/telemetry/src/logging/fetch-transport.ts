/*
 * @license
 * Copyright The OpenTelemetry Authors
 * Copyright 2025 Google LLC
 *
 * This file has been modified by Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  IExporterTransport,
  ExportResponse
} from '@opentelemetry/otlp-exporter-base';
import { diag } from '@opentelemetry/api';
import { DynamicHeaderProvider } from '../types';

function isExportRetryable(statusCode: number): boolean {
  const retryCodes = [429, 502, 503, 504];
  return retryCodes.includes(statusCode);
}

function parseRetryAfterToMills(
  retryAfter?: string | undefined | null
): number | undefined {
  if (retryAfter == null) {
    return undefined;
  }

  const seconds = Number.parseInt(retryAfter, 10);
  if (Number.isInteger(seconds)) {
    return seconds > 0 ? seconds * 1000 : -1;
  }
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Retry-After#directives
  const delay = new Date(retryAfter).getTime() - Date.now();

  if (delay >= 0) {
    return delay;
  }
  return 0;
}

/** @internal */
export interface FetchTransportParameters {
  url: string;
  headers: Headers;
  dynamicHeaders?: DynamicHeaderProvider[];
}

/**
 * An implementation of IExporterTransport.
 *
 * @internal
 */
export class FetchTransport implements IExporterTransport {
  constructor(private parameters: FetchTransportParameters) {}

  async send(data: Uint8Array, timeoutMillis: number): Promise<ExportResponse> {
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), timeoutMillis);
    try {
      const url = new URL(this.parameters.url);
      const headers = this.parameters.headers;

      if (
        this.parameters.dynamicHeaders &&
        this.parameters.dynamicHeaders.length > 0
      ) {
        const dynamicHeaderPromises = this.parameters.dynamicHeaders.map(
          provider => provider.getHeader()
        );
        const resolvedHeaders = await Promise.all(dynamicHeaderPromises);

        for (const header of resolvedHeaders) {
          if (header) {
            headers.append(...header);
          }
        }
      }

      const body = {
        method: 'POST',
        headers,
        signal: abortController.signal,
        keepalive: false,
        mode: 'cors',
        body: data
      } as RequestInit;
      const response = await fetch(url.href, body);

      if (response.status >= 200 && response.status <= 299) {
        diag.debug('response success');
        return { status: 'success' };
      } else if (isExportRetryable(response.status)) {
        const retryAfter = response.headers.get('Retry-After');
        const retryInMillis = parseRetryAfterToMills(retryAfter);
        return { status: 'retryable', retryInMillis };
      }
      return {
        status: 'failure',
        error: new Error('Fetch request failed with non-retryable status')
      };
    } catch (error) {
      if (error instanceof Error) {
        return { status: 'failure', error };
      }
      return {
        status: 'failure',
        error: new Error(`Fetch request errored: ${error}`)
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  shutdown(): void {
    // Intentionally left empty, nothing to do.
  }
}
