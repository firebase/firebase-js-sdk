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
import {
  getDefaultEmulatorHost,
  getDefaultEmulatorHostnameAndPort
} from '../src/defaults';
import { getGlobal } from '../src/environment';

describe('getDefaultEmulatorHost', () => {
  after(() => {
    delete getGlobal().__FIREBASE_DEFAULTS__;
  });

  context('with no config', () => {
    it('returns undefined', () => {
      expect(getDefaultEmulatorHost('firestore')).to.be.undefined;
    });
  });

  context('with global config not listing the emulator', () => {
    before(() => {
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

  context('with IPv4 hostname in global config', () => {
    before(() => {
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

  context('with quoted IPv6 hostname in global config', () => {
    before(() => {
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
  after(() => {
    delete getGlobal().__FIREBASE_DEFAULTS__;
  });

  context('with no config', () => {
    it('returns undefined', () => {
      expect(getDefaultEmulatorHostnameAndPort('firestore')).to.be.undefined;
    });
  });

  context('with global config not listing the emulator', () => {
    before(() => {
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

  context('with IPv4 hostname in global config', () => {
    before(() => {
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

  context('with quoted IPv6 hostname in global config', () => {
    before(() => {
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
