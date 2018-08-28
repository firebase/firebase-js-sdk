/**
 * Copyright 2018 Google Inc.
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
import { ListenSequence } from '../../../src/core/listen_sequence';
import { ListenSequenceNumber } from '../../../src/core/types';

type SequenceNumberCallback = (sequenceNumber: ListenSequenceNumber) => void;

describe('ListenSequence', () => {
  it('writes the new sequence number to local storage', () => {
    const writtenNumbers: ListenSequenceNumber[] = [];
    const producedNumbers: ListenSequenceNumber[] = [];
    const syncParams = {
      setSequenceNumberListener: (cb: SequenceNumberCallback) => void {},
      writeSequenceNumber: (sequenceNumber: ListenSequenceNumber): void => {
        writtenNumbers.push(sequenceNumber);
      }
    };
    const listenSequence = new ListenSequence(0, syncParams);
    for (let i = 0; i < 3; i++) {
      producedNumbers.push(listenSequence.next());
    }
    expect(writtenNumbers).to.deep.equal(producedNumbers);
  });

  it('bumps the next value based on local storage writes', () => {
    let remoteSequenceNumber: SequenceNumberCallback;
    const syncParams = {
      setSequenceNumberListener: (cb: SequenceNumberCallback): void => {
        remoteSequenceNumber = cb;
      },
      writeSequenceNumber: (sequenceNumber: ListenSequenceNumber): void => {}
    };
    const listenSequence = new ListenSequence(0, syncParams);
    remoteSequenceNumber!(5);
    expect(listenSequence.next()).to.equal(6);
    expect(listenSequence.next()).to.equal(7);
    remoteSequenceNumber!(18);
    expect(listenSequence.next()).to.equal(19);
  });
});
