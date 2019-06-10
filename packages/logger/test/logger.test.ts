/**
 * @license
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
import { spy as Spy, SinonSpy } from 'sinon';
import { Logger, LogLevel } from '../src/logger';
import { setLogLevel } from '../index';

describe('@firebase/logger', () => {
  const message = 'Hello there!';
  let client: Logger;
  let spies: { [key: string]: SinonSpy };
  /**
   * Before each test, instantiate a new instance of Logger and establish spies
   * on all of the console methods so we can assert against them as needed
   */
  beforeEach(() => {
    client = new Logger('@firebase/test-logger');

    spies = {
      logSpy: Spy(console, 'log'),
      infoSpy: Spy(console, 'info'),
      warnSpy: Spy(console, 'warn'),
      errorSpy: Spy(console, 'error')
    };
  });

  afterEach(() => {
    spies.logSpy.restore();
    spies.infoSpy.restore();
    spies.warnSpy.restore();
    spies.errorSpy.restore();
  });

  function testLog(message: string, channel: string, shouldLog: boolean): void {
    /**
     * Ensure that `debug` logs assert against the `console.log` function. The
     * rationale here is explained in `logger.ts`.
     */
    channel = channel === 'debug' ? 'log' : channel;

    it(`Should ${
      shouldLog ? '' : 'not'
    } call \`console.${channel}\` if \`.${channel}\` is called`, () => {
      // @ts-ignore It's not worth making a dedicated enum for a test.
      client[channel](message);
      expect(
        spies[`${channel}Spy`]!.called,
        `Expected ${channel} to ${shouldLog ? '' : 'not'} log`
      ).to.be[shouldLog ? 'true' : 'false'];
    });
  }

  describe('Class instance methods', () => {
    beforeEach(() => {
      setLogLevel(LogLevel.DEBUG);
    });
    testLog(message, 'debug', true);
    testLog(message, 'log', true);
    testLog(message, 'info', true);
    testLog(message, 'warn', true);
    testLog(message, 'error', true);
  });

  describe('Defaults to LogLevel.NOTICE', () => {
    testLog(message, 'debug', false);
    testLog(message, 'log', false);
    testLog(message, 'info', true);
    testLog(message, 'warn', true);
    testLog(message, 'error', true);
  });

  describe(`Doesn't log if LogLevel.SILENT is set`, () => {
    beforeEach(() => {
      setLogLevel(LogLevel.SILENT);
    });
    testLog(message, 'debug', false);
    testLog(message, 'log', false);
    testLog(message, 'info', false);
    testLog(message, 'warn', false);
    testLog(message, 'error', false);
  });
});
