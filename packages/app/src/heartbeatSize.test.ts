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

import { base64Encode } from '@firebase/util';
import { expect } from 'chai';
import '../test/setup';
import {
  countBytes,
  countHeartbeatBytes,
  splitHeartbeatsCache
} from './heartbeatSize';

function generateUserAgentString(pairs: number): string {
  let uaString = '';
  for (let i = 0; i < pairs; i++) {
    uaString += `test-platform/${i % 10}.${i % 10}.${i % 10}`;
  }
  return uaString;
}

function generateDates(count: number): string[] {
  let currentTimestamp = Date.now();
  const dates = [];
  for (let i = 0; i < count; i++) {
    dates.push(new Date(currentTimestamp).toISOString().slice(0, 10));
    currentTimestamp += 24 * 60 * 60 * 1000;
  }
  return dates;
}

describe('splitHeartbeatsCache()', () => {
  it('returns empty heartbeatsToKeep if it cannot get under maxSize', () => {
    const heartbeats = [
      { userAgent: generateUserAgentString(1), dates: generateDates(1) }
    ];
    const { heartbeatsToKeep, heartbeatsToSend } = splitHeartbeatsCache(
      heartbeats,
      5
    );
    expect(heartbeatsToSend.length).to.equal(0);
    expect(heartbeatsToKeep).to.deep.equal(heartbeats);
  });
  it('splits heartbeats array', () => {
    const heartbeats = [
      { userAgent: generateUserAgentString(20), dates: generateDates(8) },
      { userAgent: generateUserAgentString(4), dates: generateDates(10) }
    ];
    const heartbeat1Size = countHeartbeatBytes(heartbeats[0]);
    const { heartbeatsToKeep, heartbeatsToSend } = splitHeartbeatsCache(
      heartbeats,
      heartbeat1Size + 1
    );
    expect(heartbeatsToSend.length).to.equal(1);
    expect(heartbeatsToKeep.length).to.equal(1);
  });
  it('splits the first heartbeat if needed', () => {
    const heartbeats = [
      { userAgent: generateUserAgentString(20), dates: generateDates(50) },
      { userAgent: generateUserAgentString(4), dates: generateDates(10) }
    ];
    const heartbeat1Size = countHeartbeatBytes(heartbeats[0]);
    const { heartbeatsToKeep, heartbeatsToSend } = splitHeartbeatsCache(
      heartbeats,
      heartbeat1Size - 50
    );
    expect(heartbeatsToSend.length).to.equal(1);
    expect(heartbeatsToKeep.length).to.equal(2);
    expect(
      heartbeatsToSend[0].dates.length + heartbeatsToKeep[0].dates.length
    ).to.equal(heartbeats[0].dates.length);
    expect(heartbeatsToSend[0].userAgent).to.equal(
      heartbeatsToKeep[0].userAgent
    );
  });
});

describe('countBytes()', () => {
  it('counts how many bytes there will be in a stringified, encoded header', () => {
    const heartbeats = [
      { userAgent: generateUserAgentString(1), dates: generateDates(1) },
      { userAgent: generateUserAgentString(3), dates: generateDates(2) }
    ];
    let size: number = 0;
    const headerString = base64Encode(
      JSON.stringify({ version: 2, heartbeats })
    );
    console.log(JSON.stringify({ version: 2, heartbeats }));
    // We don't use this measurement method in the app because user
    // environments are much more unpredictable while we know the
    // tests will run in either a standard headless browser or Node.
    if (typeof Blob !== 'undefined') {
      const blob = new Blob([headerString]);
      size = blob.size;
    } else if (typeof Buffer !== 'undefined') {
      const buffer = Buffer.from(headerString);
      size = buffer.byteLength;
    }
    expect(countBytes(heartbeats)).to.equal(size);
  });
});
