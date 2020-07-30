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

import { FirebaseError } from '@firebase/util';

import { testAuth, TestAuth } from '../../../test/helpers/mock_auth';
import { AUTH_WINDOW } from '../auth_window';
import * as js from '../load_js';
import { _loadGapi, _resetLoader } from './gapi';

use(sinonChai);
use(chaiAsPromised);

describe('src/platform_browser/iframe/gapi', () => {
  let library: typeof gapi;
  let auth: TestAuth;
  function onJsLoad(globalLoadFnName: string): void {
    AUTH_WINDOW.gapi = library as typeof gapi;
    AUTH_WINDOW[globalLoadFnName]();
  }

  beforeEach(async () => {
    sinon.stub(js, '_loadJS').callsFake(url => {
      onJsLoad(url.split('onload=')[1]);
      return Promise.resolve(new Event('load'));
    });

    auth = await testAuth();
  });

  function makeGapi(result: unknown, timesout = false): typeof gapi {
    const callbackFn = timesout === false ? 'callback' : 'ontimeout';
    return ({
      load: sinon
        .stub()
        .callsFake((_name: string, params: Record<string, Function>) =>
          params[callbackFn]()
        ),
      iframes: {
        getContext: () => result as gapi.iframes.Context
      }
    } as unknown) as typeof gapi;
  }

  afterEach(() => {
    sinon.restore();
    delete AUTH_WINDOW.gapi;
    _resetLoader();
  });

  it('calls gapi.load once it is ready', async () => {
    const gapi = makeGapi('context!');

    library = gapi;
    expect(await _loadGapi(auth)).to.eq('context!');
    expect(gapi.load).to.have.been.called;
  });

  it('resets the gapi.load state', async () => {
    AUTH_WINDOW.___jsl = {
      H: {
        something: {
          r: ['requested'],
          L: ['loaded', 'test']
        }
      },
      CP: [1, 2, 3, 4]
    };

    library = makeGapi('iframes');

    await _loadGapi(auth);

    // Expect deep equality, but *not* pointer equality
    expect(AUTH_WINDOW.___jsl.H.something.r).to.eql(
      AUTH_WINDOW.___jsl.H.something.L
    );
    expect(AUTH_WINDOW.___jsl.H.something.r).not.to.eq(
      AUTH_WINDOW.___jsl.H.something.L
    );
    expect(AUTH_WINDOW.___jsl.CP).to.eql([null, null, null, null]);
  });

  it('returns the cached object without reloading', async () => {
    library = makeGapi('test');

    expect(await _loadGapi(auth)).to.eq('test');
    expect(await _loadGapi(auth)).to.eq('test');

    expect(js._loadJS).to.have.been.calledOnce;
  });

  it('rejects with a network error if load fails', async () => {
    library = {} as typeof gapi;
    await expect(_loadGapi(auth)).to.be.rejectedWith(
      FirebaseError,
      'auth/network-request-failed'
    );
  });

  it('rejects with a network error if ontimeout called', async () => {
    library = makeGapi(undefined, /* timesout */ true);
    await expect(_loadGapi(auth)).to.be.rejectedWith(
      FirebaseError,
      'auth/network-request-failed'
    );
  });

  it('resets the load promise if the load errors', async () => {
    library = {} as typeof gapi;
    const firstAttempt = _loadGapi(auth);
    await expect(firstAttempt).to.be.rejectedWith(
      FirebaseError,
      'auth/network-request-failed'
    );
    expect(_loadGapi(auth)).not.to.eq(firstAttempt);
  });
});
