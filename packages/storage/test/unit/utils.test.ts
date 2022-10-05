/**
 * @license
 * Copyright 2022 Google LLC
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

import { expect } from 'chai';
import { isRetryStatusCode } from '../../src/implementation/utils';

describe('Storage Utils', () => {
  it('does not deem 400 as a retry status code', () => {
    const isRetry = isRetryStatusCode(400, []);
    expect(isRetry).to.be.false;
  });
  it('deems extra retry codes as retryable ', () => {
    let isRetry = isRetryStatusCode(408, []);
    expect(isRetry).to.be.true;
    isRetry = isRetryStatusCode(429, []);
    expect(isRetry).to.be.true;
  });
  it('deems error codes beyond 500 as retryable', () => {
    const isRetry = isRetryStatusCode(503, []);
    expect(isRetry).to.be.true;
  });
  it('deems additional error codes as retryable', () => {
    const isRetry = isRetryStatusCode(400, [400]);
    expect(isRetry).to.be.true;
  });
});
