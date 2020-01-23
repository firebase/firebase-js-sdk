/**
 * @license
 * Copyright 2019 Google Inc.
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

import * as sinon from 'sinon';

let routes: { [url: string]: Response } = {};

function fakeFetch(requestInfo: RequestInfo): Promise<Response> {
  if (typeof requestInfo !== 'string') {
    throw new Error('Only string URLs supported at this time');
  }
  if (requestInfo in routes) {
    return Promise.resolve(routes[requestInfo]);
  }
  throw new Error(`Attempted real HTTP connection, no mock for ${requestInfo}`);
}

export function mockFetch(url: string, body: string): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  routes[url] = new (window as any).Response(body, {
    status: 200,
    headers: {
      'Content-type': 'application/json'
    }
  });
  sinon.stub(window, 'fetch').callsFake(fakeFetch);
}

export function restoreFetch(): void {
  sinon.restore();
  routes = {};
}
