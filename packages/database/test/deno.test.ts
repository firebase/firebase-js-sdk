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

import { expect, use } from 'chai';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';

import { setTimeoutNonBlocking } from '../src/core/util/util';
use(sinonChai);
describe('Deno tests', () => {
  let oldSetTimeout;
  beforeEach(() => {
    oldSetTimeout = globalThis.setTimeout;
  });
  afterEach(() => {
    globalThis.setTimeout = oldSetTimeout;
  });
  it('should call the deno unrefTimer() if in Deno', () => {
    // @ts-ignore override nodejs behavior
    global.Deno = {
      unrefTimer: sinon.spy()
    };
    // @ts-ignore override nodejs behavior
    global.setTimeout = () => 1;
    setTimeoutNonBlocking(() => {}, 0);
    expect(globalThis.Deno.unrefTimer).to.have.been.called;
  });
  it('should not call the deno unrefTimer() if not in Deno', () => {
    // @ts-ignore override nodejs behavior
    global.Deno2 = {
      unrefTimer: sinon.spy()
    };
    // @ts-ignore override node.js behavior
    global.setTimeout = () => 1;
    setTimeoutNonBlocking(() => {}, 0);
    expect(globalThis.Deno2.unrefTimer).to.not.have.been.called;
  });
});
