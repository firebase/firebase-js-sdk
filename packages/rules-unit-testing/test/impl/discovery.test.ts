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
import * as sinon from 'sinon';
import { mock } from 'sinon';
import {
  discoverEmulators,
  EMULATOR_HOST_ENV_VARS,
  getEmulatorHostAndPort
} from '../../src/impl/discovery';
import { HostAndPort } from '../../src/public_types';

describe('discoverEmulators()', () => {
  it('finds all running emulators', async () => {
    const emulators = await discoverEmulators(getEmulatorHostAndPort('hub')!);

    expect(emulators).to.deep.equal({
      database: {
        host: 'localhost',
        port: 9002
      },
      firestore: {
        host: 'localhost',
        port: 9003
      },
      storage: {
        host: 'localhost',
        port: 9199
      },
      hub: {
        host: 'localhost',
        port: 4400
      }
    });
  });

  it('connect to IPv6 addresses correctly', async () => {
    const fetch = sinon.fake(async () => {
      return {
        ok: true,
        async json() {
          return {};
        }
      };
    });
    const emulators = await discoverEmulators(
      { host: '::1', port: 1111 },
      fetch as any
    );

    expect(fetch).to.be.calledOnceWith(new URL('http://[::1]:1111/emulators')); // bracketed
    expect(emulators).to.deep.equal({});
  });

  it('throws error if host is unreachable', async () => {
    // connect to port:0 should always fail
    await expect(
      discoverEmulators({ host: '127.0.0.1', port: 0 })
    ).to.be.rejectedWith(/EADDRNOTAVAIL/);
  });

  it('throws if response status is not 2xx', async () => {
    const fetch = sinon.fake(async () => {
      return {
        ok: false,
        status: 666,
        async json() {
          return {};
        }
      };
    });

    await expect(
      discoverEmulators({ host: '127.0.0.1', port: 4444 }, fetch as any)
    ).to.be.rejectedWith(/HTTP Error 666/);
  });
});

describe('getEmulatorHostAndPort()', () => {
  context('without env vars', () => {
    beforeEach(() => {
      stashEnvVars();
    });
    afterEach(() => {
      restoreEnvVars();
    });

    it('returns undefined if config option is not set', async () => {
      const result = getEmulatorHostAndPort('hub');

      expect(result).to.be.undefined;
    });

    it('returns undefined if config option does not contain host/port', async () => {
      const result = getEmulatorHostAndPort('hub', {
        rules: '/* security rules only, no host/port */'
      });

      expect(result).to.be.undefined;
    });

    it('removes brackets from IPv6 hosts', async () => {
      const result = getEmulatorHostAndPort('hub', {
        host: '[::1]',
        port: 1111
      });

      expect(result?.host).to.equal('::1');
    });

    it('throws if only host is present', async () => {
      expect(() =>
        getEmulatorHostAndPort('hub', {
          host: '[::1]'
        } as HostAndPort)
      ).to.throw(/hub.port=undefined/);
    });

    it('throws if only port is present', async () => {
      expect(() =>
        getEmulatorHostAndPort('database', {
          port: 1234
        } as HostAndPort)
      ).to.throw(/Invalid configuration database.host=undefined/);
    });

    it('connect to 127.0.0.1 if host is wildcard 0.0.0.0', async () => {
      const result = getEmulatorHostAndPort('hub', {
        host: '0.0.0.0',
        port: 1111
      });

      // Do not connect to 0.0.0.0 which is invalid and won't work on some OSes.
      expect(result?.host).to.equal('127.0.0.1');
    });

    it('connect to [::1] if host is wildcard [::]', async () => {
      const result = getEmulatorHostAndPort('hub', { host: '::1', port: 1111 });

      // Do not connect to :: which is invalid and won't work on some OSes.
      expect(result?.host).to.equal('::1');
    });

    it('uses discovered host/port if both config and env var are unset', async () => {
      const result = getEmulatorHostAndPort('hub', undefined, {
        hub: { host: '::1', port: 3333 }
      });

      expect(result?.host).to.equal('::1');
      expect(result?.port).to.equal(3333);
    });

    it('returns undefined if none of config, env var, discovered contains emulator', async () => {
      const result = getEmulatorHostAndPort('database', undefined, {
        hub: { host: '::1', port: 3333 } /* only hub, no database */
      });

      expect(result).to.be.undefined;
    });

    it('uses hub host as fallback if discovered host is wildcard 0.0.0.0/[::]', async () => {
      const result = getEmulatorHostAndPort('database', undefined, {
        database: { host: '0.0.0.0', port: 1111 },
        hub: { host: '10.0.0.1', port: 3333 }
      });

      // If we can reach hub via 10.0.0.1 but database has host 0.0.0.0, it is very likely that
      // database is also running on 10.0.0.1 and listening on all IPv4 addresses.
      expect(result?.host).to.equal('10.0.0.1');
      expect(result?.port).to.equal(1111);

      const result2 = getEmulatorHostAndPort('database', undefined, {
        database: { host: '::', port: 2222 },
        hub: { host: '10.0.0.1', port: 3333 }
      });

      // The situation is less ideal when database listens on all IPv6 addresses, but we'll still
      // try the same host as hub, hoping that the OS running database forwards v6 to v4.
      expect(result2?.host).to.equal('10.0.0.1');
      expect(result2?.port).to.equal(2222);
    });

    it('uses hub host as fallback if config host is wildcard 0.0.0.0/[::]', async () => {
      // We apply the same logic to manually specified {host: '0.0.0.0'}, although it is a bit
      // unclear what the developer actually means in that case. If we get this wrong though, the
      // developer can always manually specify a non-wildcard address instead.
      const discovered = {
        hub: { host: '10.0.0.1', port: 3333 }
      };
      const result = getEmulatorHostAndPort(
        'database',
        {
          host: '0.0.0.0',
          port: 1111
        },
        discovered
      );

      expect(result?.host).to.equal('10.0.0.1');
      expect(result?.port).to.equal(1111);

      const result2 = getEmulatorHostAndPort(
        'database',
        {
          host: '[::]',
          port: 2222
        },
        discovered
      );

      expect(result2?.host).to.equal('10.0.0.1');
      expect(result2?.port).to.equal(2222);
    });
  });

  context('with env vars', () => {
    beforeEach(() => {
      stashEnvVars();
    });
    afterEach(() => {
      restoreEnvVars();
    });

    it('parses IPv4 host + port correctly from env var', async () => {
      process.env[EMULATOR_HOST_ENV_VARS.hub] = '127.0.0.1:3445';
      const result = getEmulatorHostAndPort('hub');

      expect(result?.host).to.equal('127.0.0.1');
      expect(result?.port).to.equal(3445);
    });

    it('throws if port is not a number', async () => {
      process.env[EMULATOR_HOST_ENV_VARS.hub] = '127.0.0.1:hhh';
      expect(() => getEmulatorHostAndPort('hub')).to.throw(
        /Invalid format in environment variable FIREBASE_EMULATOR_HUB/
      );
    });

    it('parses IPv6 host + port correctly from env var and removes brackets', async () => {
      process.env[EMULATOR_HOST_ENV_VARS.hub] = '[::1]:3445';
      const result = getEmulatorHostAndPort('hub');

      expect(result?.host).to.equal('::1');
      expect(result?.port).to.equal(3445);
    });

    it('parses env var with IPv6 host but no port correctly', async () => {
      process.env[EMULATOR_HOST_ENV_VARS.hub] = '[::1]';
      const result = getEmulatorHostAndPort('hub');

      expect(result?.host).to.equal('::1');
      expect(result?.port).to.equal(80); // default port
    });

    it('parses env var with host but no port correctly', async () => {
      process.env[EMULATOR_HOST_ENV_VARS.hub] = 'myhub.example.com';
      const result = getEmulatorHostAndPort('hub');

      expect(result?.host).to.equal('myhub.example.com');
      expect(result?.port).to.equal(80); // default port
    });

    it('connect to 127.0.0.1 if host is wildcard 0.0.0.0', async () => {
      process.env[EMULATOR_HOST_ENV_VARS.hub] = '0.0.0.0:3445';
      const result = getEmulatorHostAndPort('hub');

      // Do not connect to 0.0.0.0 which is invalid and won't work on some OSes.
      expect(result?.host).to.equal('127.0.0.1');
    });

    it('connect to [::1] if host is wildcard [::]', async () => {
      process.env[EMULATOR_HOST_ENV_VARS.hub] = '[::]:3445';
      const result = getEmulatorHostAndPort('hub');

      // Do not connect to :: which is invalid and won't work on some OSes.
      expect(result?.host).to.equal('::1');
    });

    it('prefers config value over env var', async () => {
      process.env[EMULATOR_HOST_ENV_VARS.hub] = '127.0.0.1:3445'; // ignored
      const result = getEmulatorHostAndPort('hub', {
        host: 'localhost',
        port: 1234
      });

      expect(result?.host).to.equal('localhost');
      expect(result?.port).to.equal(1234);
    });

    it('takes host and port from env var if config has no host/port', async () => {
      process.env[EMULATOR_HOST_ENV_VARS.hub] = '127.0.0.1:3445';
      const result = getEmulatorHostAndPort('hub', {
        rules: '/* security rules only, no host/port */'
      });

      expect(result?.host).to.equal('127.0.0.1');
      expect(result?.port).to.equal(3445);
    });

    it('uses hub host as fallback if host from env var is wildcard 0.0.0.0/[::]', async () => {
      process.env[EMULATOR_HOST_ENV_VARS.database] = '0.0.0.0:1111';
      const result = getEmulatorHostAndPort('database', undefined, {
        hub: { host: '10.0.0.1', port: 3333 }
      });

      // If we can reach hub via 10.0.0.1 but database has host 0.0.0.0, it is very likely that
      // database is also running on 10.0.0.1 and listening on all IPv4 addresses.
      expect(result?.host).to.equal('10.0.0.1');
      expect(result?.port).to.equal(1111);

      process.env[EMULATOR_HOST_ENV_VARS.database] = '[::]:2222';
      const result2 = getEmulatorHostAndPort('database', undefined, {
        hub: { host: '10.0.0.1', port: 3333 }
      });

      // The situation is less ideal when database listens on all IPv6 addresses, but we'll still
      // try the same host as hub, hoping that the OS running database forwards v6 to v4.
      expect(result2?.host).to.equal('10.0.0.1');
      expect(result2?.port).to.equal(2222);
    });
  });
});

let envVars: Record<string, string | undefined>;
function stashEnvVars() {
  envVars = {};
  for (const envVar of Object.values(EMULATOR_HOST_ENV_VARS)) {
    envVars[envVar] = process.env[envVar];
    delete process.env[envVar];
  }
}

function restoreEnvVars() {
  envVars = {};
  for (const envVar of Object.values(EMULATOR_HOST_ENV_VARS)) {
    if (envVars[envVar] === undefined) {
      delete process.env[envVar];
    } else {
      process.env[envVar] = envVars[envVar];
    }
  }
}
