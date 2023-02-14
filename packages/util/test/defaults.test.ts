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
import { expect, use } from 'chai';
import { match, restore, SinonStub, stub } from 'sinon';
import sinonChai from 'sinon-chai';
import {
  getDefaultEmulatorHost,
  getDefaultEmulatorHostnameAndPort
} from '../src/defaults';
import * as global from '../src/global';

use(sinonChai);

describe('getDefaultEmulatorHost', () => {
  after(() => {
    delete global.getGlobal().__FIREBASE_DEFAULTS__;
  });

  context('with no config', () => {
    it('returns undefined', () => {
      expect(getDefaultEmulatorHost('firestore')).to.be.undefined;
    });
  });

  context('with no config and process.env undefined', () => {
    before(() => {
      stub(process, 'env').value(undefined);
    });
    after(() => {
      restore();
    });
    it('returns undefined and does not throw', () => {
      expect(getDefaultEmulatorHost('firestore')).to.be.undefined;
      expect(getDefaultEmulatorHost('firestore')).to.not.throw;
    });
  });

  context('with no config and no document or document.cookie throws', () => {
    before(() => {
      // In Node tests document will not exist
      if (typeof document !== 'undefined') {
        stub(document, 'cookie').get(() => new Error('aaaah'));
      }
    });
    after(() => {
      restore();
    });
    it('returns undefined and does not throw', () => {
      expect(getDefaultEmulatorHost('firestore')).to.be.undefined;
      expect(getDefaultEmulatorHost('firestore')).to.not.throw;
    });
  });

  context('with no config and something unexpected throws', () => {
    let consoleInfoStub: SinonStub;
    before(() => {
      stub(global, 'getGlobal').throws(new Error('getGlobal threw!'));
      consoleInfoStub = stub(console, 'info');
    });
    after(() => {
      delete process.env.__FIREBASE_DEFAULTS__;
      restore();
    });
    it('returns undefined and calls console.info with the error', () => {
      expect(getDefaultEmulatorHost('firestore')).to.be.undefined;
      expect(consoleInfoStub).to.be.calledWith(match('getGlobal threw!'));
    });
  });

  context('with global config not listing the emulator', () => {
    before(() => {
      global.getGlobal().__FIREBASE_DEFAULTS__ = {
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

  context('with IPv4 hostname in global config', () => {
    before(() => {
      global.getGlobal().__FIREBASE_DEFAULTS__ = {
        emulatorHosts: {
          firestore: '127.0.0.1:8080'
        }
      };
    });

    it('returns host', () => {
      expect(getDefaultEmulatorHost('firestore')).to.equal('127.0.0.1:8080');
    });
  });

  context('with quoted IPv6 hostname in global config', () => {
    before(() => {
      global.getGlobal().__FIREBASE_DEFAULTS__ = {
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
  after(() => {
    delete global.getGlobal().__FIREBASE_DEFAULTS__;
  });

  context('with no config', () => {
    it('returns undefined', () => {
      expect(getDefaultEmulatorHostnameAndPort('firestore')).to.be.undefined;
    });
  });

  context('with global config not listing the emulator', () => {
    before(() => {
      global.getGlobal().__FIREBASE_DEFAULTS__ = {
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

  context('with IPv4 hostname in global config', () => {
    before(() => {
      global.getGlobal().__FIREBASE_DEFAULTS__ = {
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

  context('with quoted IPv6 hostname in global config', () => {
    before(() => {
      global.getGlobal().__FIREBASE_DEFAULTS__ = {
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
