/**
 * @license
 * Copyright 2020 Google LLC
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

import { HttpHeader } from '../../src/api';
import { FetchProvider } from '../../src/core/util/fetch_provider';

export interface Call {
  request?: object | string;
  method?: string;
  headers: Headers;
}

export interface Route {
  response: object;
  status: number;
  calls: Call[];
}

let fetchImpl: typeof fetch | null;
const routes = new Map<string, Route>();

// Using a constant rather than a function to enforce the type matches fetch()
const fakeFetch: typeof fetch = (input: RequestInfo, request?: RequestInit) => {
  if (typeof input !== 'string') {
    throw new Error('URL passed to fetch was not a string');
  }

  if (!routes.has(input)) {
    console.error(`Unknown route being requested: ${input}`);
    throw new Error(`Unknown route being requested: ${input}`);
  }

  // Bang-assertion is fine since we check for routes.has() above
  const { response, status, calls } = routes.get(input)!;

  const headers = new (FetchProvider.headers())(request?.headers);
  const requestBody =
    request?.body && headers.get(HttpHeader.CONTENT_TYPE) === 'application/json'
      ? JSON.parse(request.body as string)
      : request?.body;

  calls.push({
    request: requestBody,
    method: request?.method,
    headers
  });

  return Promise.resolve(
    new (FetchProvider.response())(JSON.stringify(response), {
      status
    })
  );
};

export function setUpWithOverride(fetchOverride: typeof fetch): void {
  if (fetchImpl) {
    throw new Error('Mock fetch is already set up.');
  }
  fetchImpl = FetchProvider.fetch();
  FetchProvider.initialize(fetchOverride);
}

export function setUp(): void {
  return setUpWithOverride(fakeFetch);
}

export function mock(url: string, response: object, status = 200): Route {
  if (!fetchImpl) {
    throw new Error('Mock fetch is not set up. Call setUp() first');
  }
  const route: Route = {
    response,
    status,
    calls: []
  };

  routes.set(url, route);
  return route;
}

export function tearDown(): void {
  if (!fetchImpl) {
    throw new Error('Mock fetch is not set up. Call setUp() first');
  }
  FetchProvider.initialize(fetchImpl);
  fetchImpl = null;
  routes.clear();
}
