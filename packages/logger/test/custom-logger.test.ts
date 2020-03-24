/**
 * @license
 * Copyright 2018 Google LLC
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
import { spy } from 'sinon';
import { Logger, setLogLevel } from '../src/logger';
import { setUserLogHandler } from '../index';

describe(`Custom log handler`, () => {
  const client1 = new Logger('@firebase/test-logger');
  const client2 = new Logger('@firebase/other-logger');
  let result: any;
  let spies: any = {};

  describe('Callback log level set to INFO (default)', () => {
    before(() => {
      setUserLogHandler(callbackParams => {
        result = callbackParams;
      });
    });

    beforeEach(() => {
      result = null;
      spies = {
        logSpy: spy(console, 'log'),
        infoSpy: spy(console, 'info'),
        warnSpy: spy(console, 'warn'),
        errorSpy: spy(console, 'error')
      };
    });

    afterEach(() => {
      spies.logSpy.restore();
      spies.infoSpy.restore();
      spies.warnSpy.restore();
      spies.errorSpy.restore();
    });

    it('calls custom callback with correct data for calling instance', () => {
      // Default log level is INFO.
      client1.info('info message!');
      expect(result.message).to.equal('info message!');
      expect(result.args[0]).to.equal('info message!');
      expect(result.level).to.equal('info');
      expect(result.type).to.equal('@firebase/test-logger');
      expect(spies.infoSpy.called).to.be.true;
      spies.infoSpy.resetHistory();
      client2.info('another info message!');
      expect(result.message).to.equal('another info message!');
      expect(result.args[0]).to.equal('another info message!');
      expect(result.level).to.equal('info');
      expect(result.type).to.equal('@firebase/other-logger');
      expect(spies.infoSpy.called).to.be.true;
    });

    it('parses multiple arguments correctly', () => {
      // Default log level is INFO.
      client1.info('info message!', ['hello'], 1, { a: 3 });
      expect(result.message).to.equal('info message! ["hello"] 1 {"a":3}');
      expect(result.args).to.deep.equal([
        'info message!',
        ['hello'],
        1,
        { a: 3 }
      ]);
      expect(result.level).to.equal('info');
      expect(result.type).to.equal('@firebase/test-logger');
    });

    it('calls custom callback when log call is above set log level', () => {
      // Default log level is INFO.
      // INFO was already tested above.
      client1.warn('warning message!');
      expect(result.message).to.equal('warning message!');
      expect(result.level).to.equal('warn');
      expect(spies.warnSpy.called).to.be.true;
      client1.error('error message!');
      expect(result.message).to.equal('error message!');
      expect(result.level).to.equal('error');
      expect(spies.errorSpy.called).to.be.true;
    });

    it('does not call custom callback when log call is not above set log level', () => {
      // Default log level is INFO.
      client1.log('message you should not see');
      expect(result).to.be.null;
      expect(spies.logSpy.called).to.be.false;
      client1.debug('message you should not see');
      expect(result).to.be.null;
      expect(spies.logSpy.called).to.be.false;
    });
  });

  describe('Callback log level set to WARN with options', () => {
    before(() => {
      setUserLogHandler(
        callbackParams => {
          result = callbackParams;
        },
        { level: 'warn' }
      );
    });

    beforeEach(() => {
      result = null;
      spies = {
        logSpy: spy(console, 'log'),
        infoSpy: spy(console, 'info'),
        warnSpy: spy(console, 'warn'),
        errorSpy: spy(console, 'error')
      };
    });

    afterEach(() => {
      spies.logSpy.restore();
      spies.infoSpy.restore();
      spies.warnSpy.restore();
      spies.errorSpy.restore();
    });

    it('calls custom callback when log call is above set log level', () => {
      client1.warn('warning message!');
      expect(result.message).to.equal('warning message!');
      expect(result.args[0]).to.equal('warning message!');
      expect(result.level).to.equal('warn');
      expect(result.type).to.equal('@firebase/test-logger');
      expect(spies.warnSpy.called).to.be.true;
      client1.error('error message!');
      expect(result.message).to.equal('error message!');
      expect(result.level).to.equal('error');
      expect(spies.errorSpy.called).to.be.true;
    });

    it('does not call custom callback when log call is not above set log level', () => {
      client1.debug('message you should not see');
      expect(result).to.be.null;
      expect(spies.logSpy.called).to.be.false;
      client1.log('message you should not see');
      expect(result).to.be.null;
      expect(spies.logSpy.called).to.be.false;
      client1.info('message you should not see');
      expect(result).to.be.null;
    });

    it('logLevel set in setUserLogHandler should not affect internal logging level', () => {
      client1.info('message you should not see');
      expect(result).to.be.null;
      expect(spies.infoSpy.called).to.be.true;
    });
  });

  describe('Global log level set to VERBOSE with setLogLevel()', () => {
    before(() => {
      setLogLevel('verbose');
      setUserLogHandler(callbackParams => {
        result = callbackParams;
      });
    });

    beforeEach(() => {
      result = null;
      spies = {
        logSpy: spy(console, 'log'),
        infoSpy: spy(console, 'info'),
        warnSpy: spy(console, 'warn'),
        errorSpy: spy(console, 'error')
      };
    });

    afterEach(() => {
      spies.logSpy.restore();
      spies.infoSpy.restore();
      spies.warnSpy.restore();
      spies.errorSpy.restore();
    });

    it('calls custom callback when log call is above set log level', () => {
      client1.log('log message!');
      expect(result.message).to.equal('log message!');
      expect(result.level).to.equal('verbose');
      expect(spies.logSpy.called).to.be.true;
      client1.info('info message!');
      expect(result.message).to.equal('info message!');
      expect(result.level).to.equal('info');
      expect(spies.infoSpy.called).to.be.true;
      client1.warn('warning message!');
      expect(result.message).to.equal('warning message!');
      expect(result.level).to.equal('warn');
      expect(spies.warnSpy.called).to.be.true;
      client1.error('error message!');
      expect(result.message).to.equal('error message!');
      expect(result.level).to.equal('error');
      expect(spies.errorSpy.called).to.be.true;
    });

    it('does not call custom callback when log call is not above set log level', () => {
      client1.debug('message you should not see');
      expect(result).to.be.null;
      expect(spies.logSpy.called).to.be.false;
    });
  });
});
