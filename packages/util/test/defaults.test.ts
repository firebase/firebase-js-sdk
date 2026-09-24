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
import { expect, beforeAll, afterAll, vi, MockInstance } from 'vitest';
import {
  getDefaultEmulatorHost,
  getDefaultEmulatorHostnameAndPort
} from '../src/defaults';
import { getGlobal } from '../src/global';

describe('getDefaultEmulatorHost', () => {
  afterAll(() => {
    delete getGlobal().__FIREBASE_DEFAULTS__;
  });

  describe('with no config', () => {
    it('returns undefined', () => {
      expect(getDefaultEmulatorHost('firestore')).to.be.undefined;
    });
  });

  describe('with no config and process.env undefined', () => {
    it('returns undefined and does not throw', () => {
      if (typeof process !== 'undefined') {
        const envStub = vi
          .spyOn(process, 'env', 'get')
          .mockReturnValue(undefined as any);
        try {
          expect(getDefaultEmulatorHost('firestore')).to.be.undefined;
          expect(getDefaultEmulatorHost('firestore')).to.not.throw;
        } finally {
          envStub.mockRestore();
        }
      } else {
        expect(getDefaultEmulatorHost('firestore')).to.be.undefined;
        expect(getDefaultEmulatorHost('firestore')).to.not.throw;
      }
    });
  });

  describe('with no config and no document or document.cookie throws', () => {
    beforeAll(() => {
      if (typeof document !== 'undefined') {
        vi.spyOn(document, 'cookie', 'get').mockReturnValue(
          new Error('aaaah') as any
        );
      }
    });
    afterAll(() => {
      vi.restoreAllMocks();
    });
    it('returns undefined and does not throw', () => {
      expect(getDefaultEmulatorHost('firestore')).to.be.undefined;
      expect(getDefaultEmulatorHost('firestore')).to.not.throw;
    });
  });

  describe('with no config and something unexpected throws', () => {
    let consoleInfoStub: MockInstance;
    beforeAll(() => {
      Object.defineProperty(getGlobal(), '__FIREBASE_DEFAULTS__', {
        get() {
          throw new Error('getGlobal threw!');
        },
        configurable: true
      });
      consoleInfoStub = vi.spyOn(console, 'info').mockImplementation(() => {});
    });
    afterAll(() => {
      delete getGlobal().__FIREBASE_DEFAULTS__;
      vi.restoreAllMocks();
    });
    it('returns undefined and calls console.info with the error', () => {
      expect(getDefaultEmulatorHost('firestore')).to.be.undefined;
      expect(consoleInfoStub).toHaveBeenCalledWith(
        expect.stringContaining('getGlobal threw!')
      );
    });
  });

  describe('with global config not listing the emulator', () => {
    beforeAll(() => {
      getGlobal().__FIREBASE_DEFAULTS__ = {
        emulatorHosts: {
          /* no firestore */
          database: '127.0.0.1:8080'
        }
      };
    });

    it('returns undefined', () => {
      expect(getDefaultEmulatorHost('firestore')).to.be.undefined;
    });
  });

  describe('with IPv4 hostname in global config', () => {
    beforeAll(() => {
      getGlobal().__FIREBASE_DEFAULTS__ = {
        emulatorHosts: {
          firestore: '127.0.0.1:8080'
        }
      };
    });

    it('returns host', () => {
      expect(getDefaultEmulatorHost('firestore')).to.equal('127.0.0.1:8080');
    });
  });

  describe('with quoted IPv6 hostname in global config', () => {
    beforeAll(() => {
      getGlobal().__FIREBASE_DEFAULTS__ = {
        emulatorHosts: {
          firestore: '[::1]:8080'
        }
      };
    });

    it('returns host', () => {
      expect(getDefaultEmulatorHost('firestore')).to.equal('[::1]:8080');
    });
  });
});

describe('getDefaultEmulatorHostnameAndPort', () => {
  afterAll(() => {
    delete getGlobal().__FIREBASE_DEFAULTS__;
  });

  describe('with no config', () => {
    it('returns undefined', () => {
      expect(getDefaultEmulatorHostnameAndPort('firestore')).to.be.undefined;
    });
  });

  describe('with global config not listing the emulator', () => {
    beforeAll(() => {
      getGlobal().__FIREBASE_DEFAULTS__ = {
        emulatorHosts: {
          /* no firestore */
          database: '127.0.0.1:8080'
        }
      };
    });

    it('returns undefined', () => {
      expect(getDefaultEmulatorHostnameAndPort('firestore')).to.be.undefined;
    });
  });

  describe('with IPv4 hostname in global config', () => {
    beforeAll(() => {
      getGlobal().__FIREBASE_DEFAULTS__ = {
        emulatorHosts: {
          firestore: '127.0.0.1:8080'
        }
      };
    });

    it('returns hostname and port splitted', () => {
      expect(getDefaultEmulatorHostnameAndPort('firestore')).to.eql([
        '127.0.0.1',
        8080
      ]);
    });
  });

  describe('with quoted IPv6 hostname in global config', () => {
    beforeAll(() => {
      getGlobal().__FIREBASE_DEFAULTS__ = {
        emulatorHosts: {
          firestore: '[::1]:8080'
        }
      };
    });

    it('returns unquoted hostname and port splitted', () => {
      expect(getDefaultEmulatorHostnameAndPort('firestore')).to.eql([
        '::1',
        8080
      ]);
    });
  });
});
