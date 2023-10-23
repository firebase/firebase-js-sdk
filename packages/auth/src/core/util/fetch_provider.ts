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

import { debugFail } from './assert';

export class FetchProvider {
  private static fetchImpl: typeof fetch | null;
  private static headersImpl: typeof Headers | null;
  private static responseImpl: typeof Response | null;

  static initialize(
    fetchImpl: typeof fetch,
    headersImpl?: typeof Headers,
    responseImpl?: typeof Response
  ): void {
    this.fetchImpl = fetchImpl;
    if (headersImpl) {
      this.headersImpl = headersImpl;
    }
    if (responseImpl) {
      this.responseImpl = responseImpl;
    }
  }

  static fetch(): typeof fetch {
    if (this.fetchImpl) {
      return this.fetchImpl;
    }
    if (typeof self !== 'undefined' && 'fetch' in self) {
      return self.fetch;
    }
    if (typeof globalThis !== 'undefined' && globalThis.fetch) {
      return globalThis.fetch;
    }
    if (typeof fetch !== 'undefined') {
      return fetch;
    }
    debugFail(
      'Could not find fetch implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill'
    );
  }

  static headers(): typeof Headers {
    if (this.headersImpl) {
      return this.headersImpl;
    }
    if (typeof self !== 'undefined' && 'Headers' in self) {
      return self.Headers;
    }
    if (typeof globalThis !== 'undefined' && globalThis.Headers) {
      return globalThis.Headers;
    }
    if (typeof Headers !== 'undefined') {
      return Headers;
    }
    debugFail(
      'Could not find Headers implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill'
    );
  }

  static response(): typeof Response {
    if (this.responseImpl) {
      return this.responseImpl;
    }
    if (typeof self !== 'undefined' && 'Response' in self) {
      return self.Response;
    }
    if (typeof globalThis !== 'undefined' && globalThis.Response) {
      return globalThis.Response;
    }
    if (typeof Response !== 'undefined') {
      return Response;
    }
    debugFail(
      'Could not find Response implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill'
    );
  }
}
