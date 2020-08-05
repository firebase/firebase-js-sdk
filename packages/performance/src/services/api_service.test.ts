/**
 * @license
 * Copyright 2019 Google LLC
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

import { stub } from 'sinon';
import { expect } from 'chai';
import { Api, setupApi } from './api_service';
import '../../test/setup';
import * as FirebaseUtil from '@firebase/util';
import { consoleLogger } from '../utils/console_logger';

describe('Firebase Performance > api_service', () => {
  const PAGE_URL = 'http://www.test.com/abcd?a=2';
  const PERFORMANCE_ENTRY: PerformanceEntry = {
    duration: 0,
    entryType: 'paint',
    name: 'first-contentful-paint',
    startTime: 149.01000005193055,
    toJSON: () => {}
  };

  const mockWindow = { ...self };
  // hack for IE11. self.hasOwnProperty('performance') returns false in IE11
  mockWindow.performance = self.performance;

  let api: Api;

  beforeEach(() => {
    stub(mockWindow.performance, 'mark');
    stub(mockWindow.performance, 'measure');
    stub(mockWindow.performance, 'getEntriesByType').returns([
      PERFORMANCE_ENTRY
    ]);
    stub(mockWindow.performance, 'getEntriesByName').returns([
      PERFORMANCE_ENTRY
    ]);
    // This is to make sure the test page is not changed by changing the href of location object.
    mockWindow.location = { ...self.location, href: PAGE_URL };

    setupApi(mockWindow);
    api = Api.getInstance();
  });
  describe('requiredApisAvailable', () => {
    it('call logger when fetch is not available', () => {
      expect(window.Promise).to.exist;
      stub(consoleLogger, 'info');
      stub(window, 'fetch').value(null);
      return api.requiredApisAvailable().then(isAvailable => {
        expect(consoleLogger.info).to.be.called;
        expect(isAvailable).to.be.false;
      });
    });
    it('call logger when navigator is not available', () => {
      expect(window.Promise).to.exist;
      stub(consoleLogger, 'info');
      stub(window, 'fetch').returns(Promise.resolve(new Response('{}')));
      stub(api, 'navigator').value(null);
      return api.requiredApisAvailable().then(isAvailable => {
        expect(consoleLogger.info).to.be.called;
        expect(isAvailable).to.be.false;
      });
    });
    it('call logger when cookie is not enabled', () => {
      expect(window.Promise).to.exist;
      stub(consoleLogger, 'info');
      stub(window, 'fetch').returns(Promise.resolve(new Response('{}')));
      stub(api.navigator, 'cookieEnabled').value(false);
      return api.requiredApisAvailable().then(isAvailable => {
        expect(consoleLogger.info).to.be.called;
        expect(isAvailable).to.be.false;
      });
    });

    it('call logger when isIndexedDBAvailable returns false', () => {
      expect(window.Promise).to.exist;
      stub(consoleLogger, 'info');
      stub(window, 'fetch').returns(Promise.resolve(new Response('{}')));
      stub(FirebaseUtil, 'isIndexedDBAvailable').returns(false);
      return api.requiredApisAvailable().then(isAvailable => {
        expect(consoleLogger.info).to.be.called;
        expect(isAvailable).to.be.false;
      });
    });

    it('call logger when validateIndexedDBOpenable throws an exception', () => {
      expect(window.Promise).to.exist;
      stub(consoleLogger, 'info');
      stub(window, 'fetch').returns(Promise.resolve(new Response('{}')));
      stub(FirebaseUtil, 'isIndexedDBAvailable').returns(true);
      stub(FirebaseUtil, 'validateIndexedDBOpenable').throws();
      return api.requiredApisAvailable().then(isAvailable => {
        expect(consoleLogger.info).to.be.called;
        expect(isAvailable).to.be.false;
      });
    });
    it('logger not called when function returns true', () => {
      expect(window.Promise).to.exist;
      stub(consoleLogger, 'info');
      stub(window, 'fetch').returns(Promise.resolve(new Response('{}')));
      stub(FirebaseUtil, 'isIndexedDBAvailable').returns(true);
      stub(FirebaseUtil, 'validateIndexedDBOpenable').returns(
        Promise.resolve(true)
      );

      return api.requiredApisAvailable().then(isAvailable => {
        expect(consoleLogger.info).to.not.be.called;
        expect(isAvailable).to.be.true;
      });
    });
  });

  describe('getUrl', () => {
    it('removes the query params', () => {
      expect(api.getUrl()).to.equal('http://www.test.com/abcd');
    });
  });

  describe('mark', () => {
    it('creates performance mark', () => {
      const MARK_NAME = 'mark1';
      api.mark(MARK_NAME);

      expect(mockWindow.performance.mark).to.be.calledOnceWith(MARK_NAME);
    });
  });

  describe('measure', () => {
    it('creates a performance measure', () => {
      const MEASURE_NAME = 'measure1';
      const MARK_1_NAME = 'mark1';
      const MARK_2_NAME = 'mark2';
      api.measure(MEASURE_NAME, MARK_1_NAME, MARK_2_NAME);

      expect(mockWindow.performance.measure).to.be.calledOnceWith(
        MEASURE_NAME,
        MARK_1_NAME,
        MARK_2_NAME
      );
    });
  });

  describe('getEntriesByType', () => {
    it('calls the underlying performance api', () => {
      expect(api.getEntriesByType('paint')).to.deep.equal([PERFORMANCE_ENTRY]);
    });

    it('does not throw if the browser does not include underlying api', () => {
      api = new Api(({ performance: undefined } as unknown) as Window);

      expect(() => {
        api.getEntriesByType('paint');
      }).to.not.throw();
      expect(api.getEntriesByType('paint')).to.deep.equal([]);
    });
  });

  describe('getEntriesByName', () => {
    it('calls the underlying performance api', () => {
      expect(api.getEntriesByName('paint')).to.deep.equal([PERFORMANCE_ENTRY]);
    });

    it('does not throw if the browser does not include underlying api', () => {
      api = new Api(({ performance: undefined } as any) as Window);

      expect(() => {
        api.getEntriesByName('paint');
      }).to.not.throw();
      expect(api.getEntriesByName('paint')).to.deep.equal([]);
    });
  });
});
