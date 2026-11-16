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
import {
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  vi,
  MockInstance
} from 'vitest';
import { base64urlEncodeWithoutPadding } from '../src/crypt';
import {
  getDefaults,
  getDefaultAppConfig,
  getDefaultEmulatorHost,
  getDefaultEmulatorHostnameAndPort,
  getExperimentalSetting
} from '../src/defaults';
import { isNode } from '../src/environment';
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

describe('__FIREBASE_DEFAULTS__ cookie sanitization', () => {
  const encodeCookie = (value: unknown): string =>
    `__FIREBASE_DEFAULTS__=${base64urlEncodeWithoutPadding(
      JSON.stringify(value)
    )}`;

  beforeEach(() => {
    delete getGlobal().__FIREBASE_DEFAULTS__;
    if (typeof process !== 'undefined' && process.env) {
      delete process.env.__FIREBASE_DEFAULTS__;
    }
  });

  if (typeof window !== 'undefined') {
    afterEach(() => {
      document.cookie = '__FIREBASE_DEFAULTS__=; Max-Age=0; path=/';
    });

    it('accepts loopback emulatorHosts on a loopback page', () => {
      document.cookie = `${encodeCookie({
        emulatorHosts: {
          auth: 'localhost:9099',
          database: 'sub.localhost:9000',
          firestore: '127.0.0.1:8080',
          storage: '[::1]:9199'
        }
      })}; path=/`;

      expect(getDefaultEmulatorHost('auth')).to.equal('localhost:9099');
      expect(getDefaultEmulatorHost('database')).to.equal('sub.localhost:9000');
      expect(getDefaultEmulatorHost('firestore')).to.equal('127.0.0.1:8080');
      expect(getDefaultEmulatorHostnameAndPort('storage')).to.eql([
        '::1',
        9199
      ]);
    });

    it('drops non-loopback and malformed emulatorHosts entries with a warning', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      document.cookie = `${encodeCookie({
        emulatorHosts: {
          auth: 'attacker.example.com:9099',
          database: '8080-idx-ws.cluster.cloudworkstations.dev:443',
          functions: '192.168.1.50:5001',
          storage: 'localhost@attacker.example.com:9199',
          noports: 'localhost',
          zeroPort: '127.0.0.1:0',
          highPort: '127.0.0.1:70000',
          firestore: '127.0.0.1:8080'
        }
      })}; path=/`;

      expect(getDefaultEmulatorHost('auth')).to.be.undefined;
      expect(getDefaultEmulatorHost('database')).to.be.undefined;
      expect(getDefaultEmulatorHost('functions')).to.be.undefined;
      expect(getDefaultEmulatorHost('storage')).to.be.undefined;
      expect(getDefaultEmulatorHost('noports')).to.be.undefined;
      expect(getDefaultEmulatorHost('zeroPort')).to.be.undefined;
      expect(getDefaultEmulatorHost('highPort')).to.be.undefined;
      expect(getDefaultEmulatorHost('firestore')).to.equal('127.0.0.1:8080');
      expect(warnSpy).toHaveBeenCalledTimes(7);

      // Repeated reads of the same cookie do not re-log duplicate warnings.
      expect(getDefaultEmulatorHost('auth')).to.be.undefined;
      expect(warnSpy).toHaveBeenCalledTimes(7);
    });

    it('preserves config and _authTokenSyncURL while stripping forceEnvironment once', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      document.cookie = `${encodeCookie({
        config: { apiKey: 'test-key', projectId: 'demo-proj' },
        _authTokenSyncURL: '/__session',
        forceEnvironment: 'node'
      })}; path=/`;

      expect(getDefaultAppConfig()).to.eql({
        apiKey: 'test-key',
        projectId: 'demo-proj'
      });
      expect(getExperimentalSetting('authTokenSyncURL')).to.equal('/__session');
      expect(getDefaults()?.forceEnvironment).to.be.undefined;
      expect(isNode()).to.be.false;
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('returns undefined when cookie only contained rejected fields', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      document.cookie = `${encodeCookie({
        emulatorHosts: { auth: 'attacker.example.com:9099' },
        forceEnvironment: 'node'
      })}; path=/`;

      expect(getDefaults()).to.be.undefined;
    });

    it('ignores non-object JSON payloads and non-object emulatorHosts values', () => {
      for (const nonObject of [null, 42, 'str', ['array']]) {
        document.cookie = `${encodeCookie(nonObject)}; path=/`;
        expect(getDefaults()).to.be.undefined;
      }

      for (const badHosts of [null, '127.0.0.1:8080', ['127.0.0.1:8080']]) {
        document.cookie = `${encodeCookie({
          config: { apiKey: 'test-key' },
          emulatorHosts: badHosts
        })}; path=/`;
        expect(getDefaultEmulatorHost('firestore')).to.be.undefined;
        expect(getDefaultAppConfig()).to.eql({ apiKey: 'test-key' });
      }
    });
  } else {
    const g = globalThis as Record<string, unknown>;

    afterEach(() => {
      delete g.document;
      delete g.location;
    });

    for (const hostname of [
      'app.example.com',
      '5000-idx-ws.cluster.cloudworkstations.dev',
      '192.168.1.50',
      'evil-localhost',
      ''
    ]) {
      it(`ignores even loopback emulatorHosts on non-loopback page hostname '${hostname}'`, () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        g.location = { hostname };
        g.document = {
          cookie: encodeCookie({
            config: { apiKey: 'prod-key', projectId: 'prod-proj' },
            _authTokenSyncURL: '/__session',
            emulatorHosts: {
              auth: '127.0.0.1:9099',
              database: 'localhost:9000'
            }
          })
        };

        expect(getDefaultEmulatorHost('auth')).to.be.undefined;
        expect(getDefaultEmulatorHost('database')).to.be.undefined;
        expect(getDefaultAppConfig()).to.eql({
          apiKey: 'prod-key',
          projectId: 'prod-proj'
        });
        expect(getExperimentalSetting('authTokenSyncURL')).to.equal(
          '/__session'
        );
        // Four getDefaults() calls above should only log the warning once.
        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(warnSpy.mock.calls[0][0]).to.contain(
          'connect to production services'
        );
      });
    }

    it('ignores emulatorHosts when neither global location nor document.location is defined', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      g.document = {
        cookie: encodeCookie({
          emulatorHosts: { firestore: '127.0.0.1:8080' }
        })
      };

      expect(getDefaults()).to.be.undefined;
      expect(getDefaultEmulatorHost('firestore')).to.be.undefined;
    });

    for (const hostname of [
      'localhost',
      'app.localhost',
      '127.0.0.1',
      '[::1]',
      '::1'
    ]) {
      it(`accepts loopback emulatorHosts and rejects remote ones on loopback page hostname '${hostname}'`, () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        g.location = { hostname };
        g.document = {
          cookie: encodeCookie({
            emulatorHosts: {
              firestore: '127.0.0.1:8080',
              database: 'attacker.example.com:9000'
            }
          })
        };

        expect(getDefaultEmulatorHost('firestore')).to.equal('127.0.0.1:8080');
        expect(getDefaultEmulatorHost('database')).to.be.undefined;
      });
    }

    it('falls back to document.location.hostname when global location is undefined or null', () => {
      g.document = {
        location: { hostname: 'localhost' },
        cookie: encodeCookie({
          emulatorHosts: { auth: 'localhost:9099' }
        })
      };
      expect(getDefaultEmulatorHost('auth')).to.equal('localhost:9099');

      g.location = null;
      expect(getDefaultEmulatorHost('auth')).to.equal('localhost:9099');
    });

    it('ignores non-object JSON payloads and non-object emulatorHosts values', () => {
      g.location = { hostname: 'localhost' };
      for (const nonObject of [null, 42, 'str', ['array']]) {
        g.document = { cookie: encodeCookie(nonObject) };
        expect(getDefaults()).to.be.undefined;
      }

      for (const badHosts of [null, '127.0.0.1:8080', ['127.0.0.1:8080']]) {
        g.document = {
          cookie: encodeCookie({
            config: { apiKey: 'test-key' },
            emulatorHosts: badHosts
          })
        };
        expect(getDefaultEmulatorHost('firestore')).to.be.undefined;
        expect(getDefaultAppConfig()).to.eql({ apiKey: 'test-key' });
      }
    });
  }
});
