/**
 * @license
 * Copyright 2021 Google LLC
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
import { getModularInstance } from '../src/compat';

describe('getModularInstance()', () => {
  it('returns _delegate from a compat object', () => {
    const compat = {
      _delegate: {}
    };
    const modularThing = getModularInstance(compat);
    expect(modularThing).to.eq(compat._delegate);
  });

  it('returns the object itself if it is not a compat object', () => {
    const thing = {};
    const modularThing = getModularInstance(thing);
    expect(modularThing).to.eq(thing);
  });
});
