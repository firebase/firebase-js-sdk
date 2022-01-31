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
import '../test/setup';
import {
  countBytes,
  HeartbeatServiceImpl,
  extractHeartbeatsForHeader
} from './heartbeatService';
import {
  Component,
  ComponentType,
  ComponentContainer
} from '@firebase/component';
import { PlatformLoggerService } from './types';
import { FirebaseApp } from './public-types';
import * as firebaseUtil from '@firebase/util';
import { SinonStub, stub, useFakeTimers } from 'sinon';
import * as indexedDb from './indexeddb';
import { base64Encode, isIndexedDBAvailable } from '@firebase/util';

declare module '@firebase/component' {
  interface NameServiceMapping {
    'platform-logger': PlatformLoggerService;
  }
}

const USER_AGENT_STRING_1 = 'vs1/1.2.3 vs2/2.3.4';
const USER_AGENT_STRING_2 = 'different/1.2.3';

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

describe('HeartbeatServiceImpl', () => {
  describe('If IndexedDB has no entries', () => {
    let heartbeatService: HeartbeatServiceImpl;
    let clock = useFakeTimers();
    let userAgentString = USER_AGENT_STRING_1;
    let writeStub: SinonStub;
    before(() => {
      const container = new ComponentContainer('heartbeatTestContainer');
      container.addComponent(
        new Component(
          'app',
          () =>
            ({
              options: { appId: 'an-app-id' },
              name: 'an-app-name'
            } as FirebaseApp),
          ComponentType.VERSION
        )
      );
      container.addComponent(
        new Component(
          'platform-logger',
          () => ({ getPlatformInfoString: () => userAgentString }),
          ComponentType.VERSION
        )
      );
      heartbeatService = new HeartbeatServiceImpl(container);
    });
    beforeEach(() => {
      clock = useFakeTimers();
      writeStub = stub(heartbeatService._storage, 'overwrite');
    });
    /**
     * NOTE: The clock is being reset between each test because of the global
     * restore() in test/setup.ts. Don't assume previous clock state.
     */
    it(`triggerHeartbeat() stores a heartbeat`, async () => {
      await heartbeatService.triggerHeartbeat();
      expect(heartbeatService._heartbeatsCache?.length).to.equal(1);
      const heartbeat1 = heartbeatService._heartbeatsCache?.[0];
      expect(heartbeat1?.userAgent).to.equal(USER_AGENT_STRING_1);
      expect(heartbeat1?.date).to.equal('1970-01-01');
      expect(writeStub).to.be.calledWith([heartbeat1]);
    });
    it(`triggerHeartbeat() doesn't store another heartbeat on the same day`, async () => {
      expect(heartbeatService._heartbeatsCache?.length).to.equal(1);
      await heartbeatService.triggerHeartbeat();
      expect(heartbeatService._heartbeatsCache?.length).to.equal(1);
    });
    it(`triggerHeartbeat() does store another heartbeat on a different day`, async () => {
      expect(heartbeatService._heartbeatsCache?.length).to.equal(1);
      clock.tick(24 * 60 * 60 * 1000);
      await heartbeatService.triggerHeartbeat();
      expect(heartbeatService._heartbeatsCache?.length).to.equal(2);
      expect(heartbeatService._heartbeatsCache?.[1].date).to.equal(
        '1970-01-02'
      );
    });
    it(`triggerHeartbeat() stores another entry for a different user agent`, async () => {
      userAgentString = USER_AGENT_STRING_2;
      expect(heartbeatService._heartbeatsCache?.length).to.equal(2);
      clock.tick(2 * 24 * 60 * 60 * 1000);
      await heartbeatService.triggerHeartbeat();
      expect(heartbeatService._heartbeatsCache?.length).to.equal(3);
      expect(heartbeatService._heartbeatsCache?.[2].date).to.equal(
        '1970-01-03'
      );
    });
    it('getHeartbeatHeaders() gets stored heartbeats and clears heartbeats', async () => {
      const deleteStub = stub(heartbeatService._storage, 'deleteAll');
      const heartbeatHeaders = firebaseUtil.base64Decode(
        await heartbeatService.getHeartbeatsHeader()
      );
      expect(heartbeatHeaders).to.include(USER_AGENT_STRING_1);
      expect(heartbeatHeaders).to.include(USER_AGENT_STRING_2);
      expect(heartbeatHeaders).to.include('1970-01-01');
      expect(heartbeatHeaders).to.include('1970-01-02');
      expect(heartbeatHeaders).to.include('1970-01-03');
      expect(heartbeatHeaders).to.include(`"version":2`);
      expect(heartbeatService._heartbeatsCache).to.equal(null);
      const emptyHeaders = await heartbeatService.getHeartbeatsHeader();
      expect(emptyHeaders).to.equal('');
      expect(deleteStub).to.be.called;
    });
  });
  describe('If IndexedDB has entries', () => {
    let heartbeatService: HeartbeatServiceImpl;
    let clock = useFakeTimers();
    let writeStub: SinonStub;
    let userAgentString = USER_AGENT_STRING_1;
    const mockIndexedDBHeartbeats = [
      // Chosen so one will exceed 30 day limit and one will not.
      {
        userAgent: 'old-user-agent',
        date: '1969-12-01'
      },
      {
        userAgent: 'old-user-agent',
        date: '1969-12-31'
      }
    ];
    before(() => {
      const container = new ComponentContainer('heartbeatTestContainer');
      container.addComponent(
        new Component(
          'app',
          () =>
            ({
              options: { appId: 'an-app-id' },
              name: 'an-app-name'
            } as FirebaseApp),
          ComponentType.VERSION
        )
      );
      container.addComponent(
        new Component(
          'platform-logger',
          () => ({ getPlatformInfoString: () => userAgentString }),
          ComponentType.VERSION
        )
      );
      stub(indexedDb, 'readHeartbeatsFromIndexedDB').resolves({
        heartbeats: [...mockIndexedDBHeartbeats]
      });
      heartbeatService = new HeartbeatServiceImpl(container);
    });
    beforeEach(() => {
      clock = useFakeTimers();
      writeStub = stub(heartbeatService._storage, 'overwrite');
    });
    /**
     * NOTE: The clock is being reset between each test because of the global
     * restore() in test/setup.ts. Don't assume previous clock state.
     */
    it(`new heartbeat service reads from indexedDB cache`, async () => {
      const promiseResult = await heartbeatService._heartbeatsCachePromise;
      if (isIndexedDBAvailable()) {
        expect(promiseResult).to.deep.equal(mockIndexedDBHeartbeats);
        expect(heartbeatService._heartbeatsCache).to.deep.equal(
          mockIndexedDBHeartbeats
        );
      } else {
        // In Node or other no-indexed-db environments it will fail the
        // `canUseIndexedDb` check and return an empty array.
        expect(promiseResult).to.deep.equal([]);
        expect(heartbeatService._heartbeatsCache).to.deep.equal([]);
      }
    });
    it(`triggerHeartbeat() writes new heartbeats and retains old ones newer than 30 days`, async () => {
      userAgentString = USER_AGENT_STRING_2;
      clock.tick(3 * 24 * 60 * 60 * 1000);
      await heartbeatService.triggerHeartbeat();
      if (isIndexedDBAvailable()) {
        expect(writeStub).to.be.calledWith([
          // The first entry exceeds the 30 day retention limit.
          mockIndexedDBHeartbeats[1],
          { userAgent: USER_AGENT_STRING_2, date: '1970-01-04' }
        ]);
      } else {
        expect(writeStub).to.be.calledWith([
          { userAgent: USER_AGENT_STRING_2, date: '1970-01-04' }
        ]);
      }
    });
    it('getHeartbeatHeaders() gets stored heartbeats and clears heartbeats', async () => {
      const deleteStub = stub(heartbeatService._storage, 'deleteAll');
      const heartbeatHeaders = firebaseUtil.base64Decode(
        await heartbeatService.getHeartbeatsHeader()
      );
      if (isIndexedDBAvailable()) {
        expect(heartbeatHeaders).to.include('old-user-agent');
        expect(heartbeatHeaders).to.include('1969-12-31');
      }
      expect(heartbeatHeaders).to.include(USER_AGENT_STRING_2);
      expect(heartbeatHeaders).to.include('1970-01-04');
      expect(heartbeatHeaders).to.include(`"version":2`);
      expect(heartbeatService._heartbeatsCache).to.equal(null);
      const emptyHeaders = await heartbeatService.getHeartbeatsHeader();
      expect(emptyHeaders).to.equal('');
      expect(deleteStub).to.be.called;
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
      // Use independent methods to validate our byte count method matches.
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

  describe('_extractHeartbeatsForHeader()', () => {
    it('returns empty heartbeatsToKeep if it cannot get under maxSize', () => {
      const heartbeats = [
        { userAgent: generateUserAgentString(1), date: '2022-01-01' }
      ];
      const { unsentEntries, heartbeatsToSend } = extractHeartbeatsForHeader(
        heartbeats,
        5
      );
      expect(heartbeatsToSend.length).to.equal(0);
      expect(unsentEntries).to.deep.equal(heartbeats);
    });
    it('splits heartbeats array', () => {
      const heartbeats = [
        { userAgent: generateUserAgentString(20), date: '2022-01-01' },
        { userAgent: generateUserAgentString(4), date: '2022-01-02' }
      ];
      const sizeWithHeartbeat0Only = countBytes([
        { userAgent: heartbeats[0].userAgent, dates: [heartbeats[0].date] }
      ]);
      const { unsentEntries, heartbeatsToSend } = extractHeartbeatsForHeader(
        heartbeats,
        sizeWithHeartbeat0Only + 1
      );
      expect(heartbeatsToSend.length).to.equal(1);
      expect(unsentEntries.length).to.equal(1);
    });
    it('splits the first heartbeat if needed', () => {
      const uaString = generateUserAgentString(20);
      const heartbeats = [
        { userAgent: uaString, date: '2022-01-01' },
        { userAgent: uaString, date: '2022-01-02' },
        { userAgent: uaString, date: '2022-01-03' }
      ];
      const sizeWithHeartbeat0Only = countBytes([
        { userAgent: heartbeats[0].userAgent, dates: [heartbeats[0].date] }
      ]);
      const { unsentEntries, heartbeatsToSend } = extractHeartbeatsForHeader(
        heartbeats,
        sizeWithHeartbeat0Only + 1
      );
      expect(heartbeatsToSend.length).to.equal(1);
      expect(unsentEntries.length).to.equal(2);
      expect(heartbeatsToSend[0].dates.length + unsentEntries.length).to.equal(
        heartbeats.length
      );
    });
  });
});
