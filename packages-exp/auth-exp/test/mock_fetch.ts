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

import { SinonStub, stub } from 'sinon';

export interface Call {
  request?: object;
  method?: string;
  headers?: HeadersInit;
}

export interface Route {
  response: object;
  status: number;
  calls: Call[];
}

let fetchStub: SinonStub | null = null;
let routes = new Map<string, Route>();

// Using a constant rather than a function to enforce the type matches fetch()
const fakeFetch: typeof fetch = (input: RequestInfo, request?: RequestInit) => {
  if (typeof input !== 'string') {
    throw new Error('URL passed to fetch was not a string');
  }

  if (!routes.has(input)) {
    throw new Error(`Unknown route being requested: ${input}`);
  }

  // Bang-assertion is fine since we check for routes.has() above
  const { response, status, calls } = routes.get(input)!;

  calls.push({
    request: request?.body ? JSON.parse(request.body as string) : undefined,
    method: request?.method,
    headers: request?.headers
  });

  const blob = new Blob([JSON.stringify(response)]);
  return Promise.resolve(
    new Response(blob, {
      status
    })
  );
};

export function setUp(): void {
  fetchStub = stub(self, 'fetch');
  fetchStub.callsFake(fakeFetch);
}

export function mock(url: string, response: object, status = 200): Route {
  if (!fetchStub) {
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
  fetchStub?.restore();
  fetchStub = null;
  routes = new Map();
}
