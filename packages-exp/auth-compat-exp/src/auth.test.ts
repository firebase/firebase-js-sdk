/**
 * @license
 * Copyright 2020 Google LLC
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

import { FirebaseApp } from '@firebase/app-compat';
import * as exp from '@firebase/auth-exp/internal';
import { expect, use } from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { Auth } from './auth';
import { CompatPopupRedirectResolver } from './popup_redirect';

use(sinonChai);

// For the most part, the auth methods just call straight through. Some parts
// of the auth compat layer are more complicated: these tests cover those
describe('auth compat', () => {
  context('redirect persistence key storage', () => {
    let underlyingAuth: exp.AuthImpl;
    let app: FirebaseApp;
    beforeEach(() => {
      app = { options: { apiKey: 'api-key' } } as FirebaseApp;
      underlyingAuth = new exp.AuthImpl(app, {
        apiKey: 'api-key'
      } as exp.Config);
      sinon.stub(underlyingAuth, '_initializeWithPersistence');
    });

    afterEach(() => {
      sinon.restore;
    });

    it('saves the persistence into session storage if available', async () => {
      if (typeof self !== 'undefined') {
        underlyingAuth._initializationPromise = Promise.resolve();
        sinon.stub(underlyingAuth, '_getPersistence').returns('TEST');
        sinon
          .stub(underlyingAuth, '_initializationPromise')
          .value(Promise.resolve());
        sinon.stub(
          exp._getInstance<exp.PopupRedirectResolverInternal>(
            CompatPopupRedirectResolver
          ),
          '_openRedirect'
        );
        const authCompat = new Auth(app, underlyingAuth);
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        await authCompat.signInWithRedirect(new exp.GoogleAuthProvider());
        expect(
          sessionStorage.getItem('firebase:persistence:api-key:undefined')
        ).to.eq('TEST');
      }
    });

    it('pulls the persistence and sets as the main persitsence if set', () => {
      if (typeof self !== 'undefined') {
        sessionStorage.setItem(
          'firebase:persistence:api-key:undefined',
          'none'
        );
        new Auth(app, underlyingAuth);
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        expect(
          underlyingAuth._initializeWithPersistence
        ).to.have.been.calledWith(
          [
            exp._getInstance(exp.inMemoryPersistence),
            exp._getInstance(exp.indexedDBLocalPersistence),
            exp._getInstance(exp.browserLocalPersistence)
          ],
          CompatPopupRedirectResolver
        );
      }
    });
  });
});
