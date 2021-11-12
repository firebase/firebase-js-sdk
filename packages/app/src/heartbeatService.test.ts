/**
 * @license
 * Copyright 2017 Google LLC
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
import { HeartbeatServiceImpl } from './heartbeatService';
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
import { isIndexedDBAvailable } from '@firebase/util';

declare module '@firebase/component' {
  interface NameServiceMapping {
    'platform-logger': PlatformLoggerService;
  }
}
describe('HeartbeatServiceImpl', () => {
  describe('If IndexedDB has no entries', () => {
    let heartbeatService: HeartbeatServiceImpl;
    let clock = useFakeTimers();
    let userAgentString = 'vs1/1.2.3 vs2/2.3.4';
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
      expect(heartbeat1?.userAgent).to.equal('vs1/1.2.3 vs2/2.3.4');
      expect(heartbeat1?.dates[0]).to.equal('1970-01-01');
      expect(writeStub).to.be.calledWith([heartbeat1]);
    });
    it(`triggerHeartbeat() doesn't store another heartbeat on the same day`, async () => {
      await heartbeatService.triggerHeartbeat();
      const heartbeat1 = heartbeatService._heartbeatsCache?.[0];
      expect(heartbeat1?.dates.length).to.equal(1);
    });
    it(`triggerHeartbeat() does store another heartbeat on a different day`, async () => {
      clock.tick(24 * 60 * 60 * 1000);
      await heartbeatService.triggerHeartbeat();
      const heartbeat1 = heartbeatService._heartbeatsCache?.[0];
      expect(heartbeat1?.dates.length).to.equal(2);
      expect(heartbeat1?.dates[1]).to.equal('1970-01-02');
    });
    it(`triggerHeartbeat() stores another entry for a different user agent`, async () => {
      userAgentString = 'different/1.2.3';
      clock.tick(2 * 24 * 60 * 60 * 1000);
      await heartbeatService.triggerHeartbeat();
      expect(heartbeatService._heartbeatsCache?.length).to.equal(2);
      const heartbeat2 = heartbeatService._heartbeatsCache?.[1];
      expect(heartbeat2?.dates.length).to.equal(1);
      expect(heartbeat2?.dates[0]).to.equal('1970-01-03');
    });
    it('getHeartbeatHeaders() gets stored heartbeats and clears heartbeats', async () => {
      const deleteStub = stub(heartbeatService._storage, 'deleteAll');
      const heartbeatHeaders = firebaseUtil.base64Decode(
        await heartbeatService.getHeartbeatsHeader()
      );
      expect(heartbeatHeaders).to.include('vs1/1.2.3 vs2/2.3.4');
      expect(heartbeatHeaders).to.include('different/1.2.3');
      expect(heartbeatHeaders).to.include('1970-01-01');
      expect(heartbeatHeaders).to.include('1970-01-02');
      expect(heartbeatHeaders).to.include('1970-01-03');
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
    let userAgentString = 'vs1/1.2.3 vs2/2.3.4';
    const mockIndexedDBHeartbeats = [
      {
        userAgent: 'old-user-agent',
        dates: ['1969-01-01', '1969-01-02']
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
    it(`triggerHeartbeat() writes new heartbeats without removing old ones`, async () => {
      userAgentString = 'different/1.2.3';
      clock.tick(3 * 24 * 60 * 60 * 1000);
      await heartbeatService.triggerHeartbeat();
      if (isIndexedDBAvailable()) {
        expect(writeStub).to.be.calledWith([
          ...mockIndexedDBHeartbeats,
          { userAgent: 'different/1.2.3', dates: ['1970-01-04'] }
        ]);
      } else {
        expect(writeStub).to.be.calledWith([
          { userAgent: 'different/1.2.3', dates: ['1970-01-04'] }
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
        expect(heartbeatHeaders).to.include('1969-01-01');
        expect(heartbeatHeaders).to.include('1969-01-02');
      }
      expect(heartbeatHeaders).to.include('different/1.2.3');
      expect(heartbeatHeaders).to.include('1970-01-04');
      expect(heartbeatService._heartbeatsCache).to.equal(null);
      const emptyHeaders = await heartbeatService.getHeartbeatsHeader();
      expect(emptyHeaders).to.equal('');
      expect(deleteStub).to.be.called;
    });
  });
});
