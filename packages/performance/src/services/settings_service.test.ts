/**
 * @license
 * Copyright 2019 Google Inc.
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

import { SettingsService } from './settings_service';
import { expect } from 'chai';

describe('Performance Monitoring > settings_service', () => {
  describe('getHashPercent', () => {
    it('Distributed to 100 buckets with 10000 samples', () => {
      const buckets: number[] = [];
      for (let i = 0; i < 100; i++) {
        buckets.push(0);
      }
      for (let i = 0; i < 10000; i++) {
        const randomString = Math.random()
          .toString(36)
          .substring(7, 29);
        buckets[SettingsService.getHashPercent(randomString)] += 1;
      }
      for (let i = 0; i < 100; i++) {
        expect(buckets[i]).to.be.greaterThan(0);
      }
      expect(buckets.length).to.be.equal(100);
    });

    it('Same seed will generate same hash value', () => {
      const randomString1 = Math.random()
        .toString(36)
        .substring(7, 29);
      const hashValue1 = SettingsService.getHashPercent(randomString1);
      const randomString2 = Math.random()
        .toString(36)
        .substring(7, 29);
      const hashValue2 = SettingsService.getHashPercent(randomString2);
      const randomString3 = Math.random()
        .toString(36)
        .substring(7, 29);
      const hashValue3 = SettingsService.getHashPercent(randomString3);

      expect(SettingsService.getHashPercent(randomString1)).to.be.equal(
        hashValue1
      );
      expect(SettingsService.getHashPercent(randomString2)).to.be.equal(
        hashValue2
      );
      expect(SettingsService.getHashPercent(randomString3)).to.be.equal(
        hashValue3
      );
    });
  });

  describe('isDestTransport', () => {
    it('All traffic goes to cc when rollout percentage is 0', () => {
      let toCc = 0;
      let toTransport = 0;
      const sampleAmount = 10000;

      for (let i = 0; i < sampleAmount; i++) {
        const randomString = Math.random()
          .toString(36)
          .substring(7, 29);
        if (SettingsService.isDestTransport(randomString, 0)) {
          toTransport += 1;
        } else {
          toCc += 1;
        }
      }
      expect(toCc).to.be.equal(sampleAmount);
      expect(toTransport).to.be.equal(0);
    });

    it('All traffic goes to transport when rollout percentage is 100', () => {
      let toCc = 0;
      let toTransport = 0;
      const sampleAmount = 10000;

      for (let i = 0; i < sampleAmount; i++) {
        const randomString = Math.random()
          .toString(36)
          .substring(7, 29);
        if (SettingsService.isDestTransport(randomString, 100)) {
          toTransport += 1;
        } else {
          toCc += 1;
        }
      }
      expect(toCc).to.be.equal(0);
      expect(toTransport).to.be.equal(sampleAmount);
    });

    it('Roughly half of traffic goes to transport when rollout percentage is 50', () => {
      let toCc = 0;
      let toTransport = 0;
      const sampleAmount = 10000;

      for (let i = 0; i < sampleAmount; i++) {
        const randomString = Math.random()
          .toString(36)
          .substring(7, 29);
        if (SettingsService.isDestTransport(randomString, 50)) {
          toTransport += 1;
        } else {
          toCc += 1;
        }
      }
      const diff = Math.abs(toCc - toTransport);
      console.log(
        'Transport traffic is ' +
          (toTransport * 100) / sampleAmount +
          '% when rollout 50%.'
      );
      expect(diff).to.be.lessThan(2000);
    });
  });
});
