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

import { setTimeoutNonBlocking } from '../src/core/util/util';

describe('Deno tests', () => {
  let oldSetTimeout;
  beforeEach(() => {
    oldSetTimeout = globalThis.setTimeout;
  });
  afterEach(() => {
    globalThis.setTimeout = oldSetTimeout;
    delete (globalThis as any).Deno;
    delete (globalThis as any).Deno2;
  });
  it('should call the deno unrefTimer() if in Deno', () => {
    // @ts-ignore override nodejs behavior
    globalThis.Deno = {
      unrefTimer: vi.fn()
    };
    // @ts-ignore override nodejs behavior
    globalThis.setTimeout = () => 1;
    setTimeoutNonBlocking(() => {}, 0);
    expect(globalThis.Deno.unrefTimer).toHaveBeenCalled();
  });
  it('should not call the deno unrefTimer() if not in Deno', () => {
    // @ts-ignore override nodejs behavior
    globalThis.Deno2 = {
      unrefTimer: vi.fn()
    };
    // @ts-ignore override node.js behavior
    globalThis.setTimeout = () => 1;
    setTimeoutNonBlocking(() => {}, 0);
    expect(globalThis.Deno2.unrefTimer).not.toHaveBeenCalled();
  });
});
