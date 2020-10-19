/**
 * @license
 * Copyright 2020 Google LLC.
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

import { SDK_VERSION } from '@firebase/app-exp';
import { FirebaseError } from '@firebase/util';

import {
  TEST_AUTH_DOMAIN,
  TEST_KEY,
  testAuth,
  TestAuth
} from '../../../test/helpers/mock_auth';
import { stubSingleTimeout } from '../../../test/helpers/timeout_stub';
import { _window } from '../auth_window';
import * as gapiLoader from './gapi';
import { _openIframe } from './iframe';

use(sinonChai);
use(chaiAsPromised);

type IframesCallback = (iframesLib: unknown) => Promise<unknown>;

describe('src/platform_browser/iframe/iframe', () => {
  let auth: TestAuth;
  let iframeSettings: Record<string, unknown>;
  let libraryLoadedCallback: IframesCallback;

  beforeEach(async () => {
    _window().gapi = ({
      iframes: {
        CROSS_ORIGIN_IFRAMES_FILTER: 'cross-origin-filter'
      }
    } as unknown) as typeof gapi;
    auth = await testAuth();

    sinon.stub(gapiLoader, '_loadGapi').returns(
      (Promise.resolve({
        open: sinon
          .stub()
          .callsFake(
            (settings: Record<string, unknown>, cb: IframesCallback) => {
              iframeSettings = settings;
              libraryLoadedCallback = cb;
            }
          )
      }) as unknown) as Promise<gapi.iframes.Context>
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  it('sets all the correct settings', async () => {
    await _openIframe(auth);

    expect(iframeSettings.where).to.eql(document.body);
    expect(iframeSettings.url).to.eq(
      `https://${TEST_AUTH_DOMAIN}/__/auth/iframe?apiKey=${TEST_KEY}&appName=test-app&v=${SDK_VERSION}`
    );
    expect(iframeSettings.messageHandlersFilter).to.eq('cross-origin-filter');
    expect(iframeSettings.attributes).to.eql({
      style: {
        position: 'absolute',
        top: '-100px',
        width: '1px',
        height: '1px'
      }
    });
    expect(iframeSettings.dontclear).to.be.true;
  });

  context('on load callback', () => {
    let iframe: sinon.SinonStubbedInstance<gapi.iframes.Iframe>;
    let clearTimeoutStub: sinon.SinonStub;

    beforeEach(() => {
      iframe = sinon.stub(({
        restyle: () => {},
        ping: () => {}
      } as unknown) as gapi.iframes.Iframe);
      clearTimeoutStub = sinon.stub(_window(), 'clearTimeout');
    });

    it('restyles the iframe to prevent hideOnLeave', async () => {
      stubSingleTimeout();
      iframe.ping.returns(Promise.resolve([iframe]));
      await libraryLoadedCallback(iframe);
      expect(iframe.restyle).to.have.been.calledWith({
        setHideOnLeave: false
      });
    });

    it('rejects if the iframe ping promise rejects', async () => {
      stubSingleTimeout();
      iframe.ping.returns(Promise.reject('no'));
      await expect(libraryLoadedCallback(iframe)).to.be.rejectedWith(
        FirebaseError,
        'auth/network-request-failed'
      );
    });

    it('clears the rejection timeout on success', async () => {
      stubSingleTimeout(123);
      iframe.ping.returns(Promise.resolve([iframe]));
      await libraryLoadedCallback(iframe);
      expect(clearTimeoutStub).to.have.been.calledWith(123);
    });
  });
});
