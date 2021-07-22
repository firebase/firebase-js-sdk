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

import { expect, use } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';

import { FirebaseError } from '@firebase/util';

import { endpointUrl, mockEndpoint } from '../../../test/helpers/api/helper';
import { testAuth, TestAuth, testUser } from '../../../test/helpers/mock_auth';
import * as fetch from '../../../test/helpers/mock_fetch';
import { Endpoint } from '../../api';
import { UserInternal } from '../../model/user';
import { _castAuth } from './auth_impl';
import { connectAuthEmulator } from './emulator';

use(sinonChai);
use(chaiAsPromised);

describe('core/auth/emulator', () => {
  let auth: TestAuth;
  let user: UserInternal;
  let normalEndpoint: fetch.Route;
  let emulatorEndpoint: fetch.Route;

  beforeEach(async () => {
    auth = await testAuth();
    user = testUser(_castAuth(auth), 'uid', 'email', true);
    fetch.setUp();
    normalEndpoint = mockEndpoint(Endpoint.DELETE_ACCOUNT, {});
    emulatorEndpoint = fetch.mock(
      `http://localhost:2020/${endpointUrl(Endpoint.DELETE_ACCOUNT).replace(
        /^.*:\/\//,
        ''
      )}`,
      {}
    );
  });

  afterEach(() => {
    fetch.tearDown();
    sinon.restore();

    // The DOM persists through tests; remove the banner if it is attached
    const banner =
      typeof document !== 'undefined'
        ? document.querySelector('.firebase-emulator-warning')
        : null;
    if (banner) {
      banner.parentElement?.removeChild(banner);
    }
  });

  context('connectAuthEmulator', () => {
    it('fails if a network request has already been made', async () => {
      await user.delete();
      expect(() => connectAuthEmulator(auth, 'http://localhost:2020')).to.throw(
        FirebaseError,
        'auth/emulator-config-failed'
      );
    });

    it('updates the endpoint appropriately', async () => {
      connectAuthEmulator(auth, 'http://localhost:2020');
      await user.delete();
      expect(normalEndpoint.calls.length).to.eq(0);
      expect(emulatorEndpoint.calls.length).to.eq(1);
    });

    it('updates the endpoint appropriately with trailing slash', async () => {
      connectAuthEmulator(auth, 'http://localhost:2020/');
      await user.delete();
      expect(normalEndpoint.calls.length).to.eq(0);
      expect(emulatorEndpoint.calls.length).to.eq(1);
    });

    it('checks the scheme properly', () => {
      expect(() => connectAuthEmulator(auth, 'http://localhost:2020')).not.to
        .throw;
      delete auth.config.emulator;
      expect(() => connectAuthEmulator(auth, 'https://localhost:2020')).not.to
        .throw;
      delete auth.config.emulator;
      expect(() => connectAuthEmulator(auth, 'ssh://localhost:2020')).to.throw(
        FirebaseError,
        'auth/invalid-emulator-scheme'
      );
      delete auth.config.emulator;
      expect(() => connectAuthEmulator(auth, 'localhost:2020')).to.throw(
        FirebaseError,
        'auth/invalid-emulator-scheme'
      );
    });

    it('attaches a banner to the DOM', () => {
      connectAuthEmulator(auth, 'http://localhost:2020');
      if (typeof document !== 'undefined') {
        const el = document.querySelector('.firebase-emulator-warning')!;
        expect(el).not.to.be.null;
        expect(el.textContent).to.eq(
          'Running in emulator mode. ' +
            'Do not use with production credentials.'
        );
      }
    });

    it('logs out a warning to the console', () => {
      sinon.stub(console, 'info');
      connectAuthEmulator(auth, 'http://localhost:2020');
      expect(console.info).to.have.been.calledWith(
        'WARNING: You are using the Auth Emulator,' +
          ' which is intended for local testing only.  Do not use with' +
          ' production credentials.'
      );
    });

    it('logs out the warning but has no banner if disableBanner true', () => {
      sinon.stub(console, 'info');
      connectAuthEmulator(auth, 'http://localhost:2020', {
        disableWarnings: true
      });
      expect(console.info).to.have.been.calledWith(
        'WARNING: You are using the Auth Emulator,' +
          ' which is intended for local testing only.  Do not use with' +
          ' production credentials.'
      );
      if (typeof document !== 'undefined') {
        expect(document.querySelector('.firebase-emulator-warning')).to.be.null;
      }
    });

    it('sets emulatorConfig on the Auth object', async () => {
      connectAuthEmulator(auth, 'http://localhost:2020');
      expect(auth.emulatorConfig).to.eql({
        protocol: 'http',
        host: 'localhost',
        port: 2020,
        options: { disableWarnings: false }
      });
    });

    it('sets disableWarnings in emulatorConfig accordingly', async () => {
      connectAuthEmulator(auth, 'https://127.0.0.1', { disableWarnings: true });
      expect(auth.emulatorConfig).to.eql({
        protocol: 'https',
        host: '127.0.0.1',
        port: null,
        options: { disableWarnings: true }
      });
    });

    it('quotes IPv6 address in emulatorConfig', async () => {
      connectAuthEmulator(auth, 'http://[::1]:2020/');
      expect(auth.emulatorConfig).to.eql({
        protocol: 'http',
        host: '[::1]',
        port: 2020,
        options: { disableWarnings: false }
      });
    });
  });

  context('toJSON', () => {
    it('works when theres no current user', () => {
      expect(JSON.stringify(auth)).to.eq(
        '{"apiKey":"test-api-key","authDomain":"localhost","appName":"test-app"}'
      );
    });

    it('also stringifies the current user', () => {
      auth.currentUser = {
        toJSON: (): object => ({ foo: 'bar' })
      } as unknown as UserInternal;
      expect(JSON.stringify(auth)).to.eq(
        '{"apiKey":"test-api-key","authDomain":"localhost",' +
          '"appName":"test-app","currentUser":{"foo":"bar"}}'
      );
    });
  });
});
