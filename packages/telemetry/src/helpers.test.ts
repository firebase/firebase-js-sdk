/**
 * @license
 * Copyright 2025 Google LLC
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
import { LoggerProvider } from '@opentelemetry/sdk-logs';
import { Logger, LogRecord } from '@opentelemetry/api-logs';
import { startNewSession } from './helpers';
import {
  LOG_ENTRY_ATTRIBUTE_KEYS,
  TELEMETRY_SESSION_ID_KEY
} from './constants';
import { AUTO_CONSTANTS } from './auto-constants';
import { TelemetryService } from './service';
import { TelemetryInternal } from './types';

const MOCK_SESSION_ID = '00000000-0000-0000-0000-000000000000';

describe('helpers', () => {
  let originalSessionStorage: Storage | undefined;
  let originalCrypto: Crypto | undefined;
  let storage: Record<string, string> = {};
  let emittedLogs: LogRecord[] = [];

  const fakeLoggerProvider = {
    getLogger: (): Logger => {
      return {
        emit: (logRecord: LogRecord) => {
          emittedLogs.push(logRecord);
        }
      };
    },
    forceFlush: () => Promise.resolve(),
    shutdown: () => Promise.resolve()
  } as unknown as LoggerProvider;

  const fakeTelemetry: TelemetryInternal = {
    app: {
      name: 'DEFAULT',
      automaticDataCollectionEnabled: true,
      options: {
        projectId: 'my-project',
        appId: 'my-appid'
      }
    },
    loggerProvider: fakeLoggerProvider
  };

  beforeEach(() => {
    emittedLogs = [];
    storage = {};
    // @ts-ignore
    originalSessionStorage = global.sessionStorage;
    // @ts-ignore
    originalCrypto = global.crypto;

    const sessionStorageMock: Partial<Storage> = {
      getItem: (key: string) => storage[key] || null,
      setItem: (key: string, value: string) => {
        storage[key] = value;
      }
    };
    const cryptoMock: Partial<Crypto> = {
      randomUUID: () => MOCK_SESSION_ID
    };

    Object.defineProperty(global, 'sessionStorage', {
      value: sessionStorageMock,
      writable: true
    });
    Object.defineProperty(global, 'crypto', {
      value: cryptoMock,
      writable: true
    });
  });

  afterEach(() => {
    Object.defineProperty(global, 'sessionStorage', {
      value: originalSessionStorage,
      writable: true
    });
    Object.defineProperty(global, 'crypto', {
      value: originalCrypto,
      writable: true
    });
    delete AUTO_CONSTANTS.appVersion;
  });

  describe('startNewSession', () => {
    it('should create a new session and log it with app version (unset)', () => {
      startNewSession(fakeTelemetry);

      expect(storage[TELEMETRY_SESSION_ID_KEY]).to.equal(MOCK_SESSION_ID);
      expect(emittedLogs.length).to.equal(1);
      expect(emittedLogs[0].attributes).to.deep.equal({
        [LOG_ENTRY_ATTRIBUTE_KEYS.SESSION_ID]: MOCK_SESSION_ID,
        [LOG_ENTRY_ATTRIBUTE_KEYS.APP_VERSION]: 'unset'
      });
    });

    it('should log app version from AUTO_CONSTANTS', () => {
      AUTO_CONSTANTS.appVersion = '1.2.3';
      startNewSession(fakeTelemetry);

      expect(emittedLogs[0].attributes).to.deep.equal({
        [LOG_ENTRY_ATTRIBUTE_KEYS.SESSION_ID]: MOCK_SESSION_ID,
        [LOG_ENTRY_ATTRIBUTE_KEYS.APP_VERSION]: '1.2.3'
      });
    });

    it('should log app version from telemetry options', () => {
      const telemetryWithVersion = new TelemetryService(
        fakeTelemetry.app,
        fakeLoggerProvider
      );
      telemetryWithVersion.options = { appVersion: '9.9.9' };

      startNewSession(telemetryWithVersion);

      expect(emittedLogs[0].attributes).to.deep.equal({
        [LOG_ENTRY_ATTRIBUTE_KEYS.SESSION_ID]: MOCK_SESSION_ID,
        [LOG_ENTRY_ATTRIBUTE_KEYS.APP_VERSION]: '9.9.9'
      });
    });
  });
});
