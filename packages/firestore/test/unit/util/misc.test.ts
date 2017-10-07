/**
 * Copyright 2017 Google Inc.
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
import {
  immediatePredecessor,
  immediateSuccessor
} from '../../../src/util/misc';

describe('immediatePredecessor', () => {
  it('generates the correct immediate predecessor', () => {
    expect(immediatePredecessor('b')).to.equal('a');
    expect(immediatePredecessor('bbBB')).to.equal('bbBA');
    expect(immediatePredecessor('aaa\0')).to.equal('aaa');
    expect(immediatePredecessor('\0')).to.equal('');
    expect(immediatePredecessor('\0\0\0')).to.equal('\0\0');
    expect(immediatePredecessor('az\u00e0')).to.equal('az\u00df');
    expect(immediatePredecessor('\uffff\uffff\uffff')).to.equal(
      '\uffff\uffff\ufffe'
    );
    expect(immediatePredecessor('')).to.equal('');
  });
});

describe('immediateSuccessor', () => {
  it('generates the correct immediate successors', () => {
    expect(immediateSuccessor('hello')).to.equal('hello\0');
    expect(immediateSuccessor('')).to.equal('\0');
  });
});
