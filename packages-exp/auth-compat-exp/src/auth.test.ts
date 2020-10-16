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

import { FirebaseApp } from '@firebase/app-types';
import * as impl from '@firebase/auth-exp/internal';
import { Config } from '@firebase/auth-types-exp';
import { expect, use } from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { Auth } from './auth';

use(sinonChai);

// For the most part, the auth methods just call straight through. Some parts
// of the auth compat layer are more complicated: these tests cover those
describe('auth compat', () => {
  context('redirect persistence key storage', () => {
    let underlyingAuth: impl.AuthImpl;
    let app: FirebaseApp;
    beforeEach(() => {
      app = { options: { apiKey: 'api-key' } } as FirebaseApp;
      underlyingAuth = new impl.AuthImpl(app, {
        apiKey: 'api-key'
      } as Config);
      sinon.stub(underlyingAuth, '_initializeWithPersistence');
    });

    afterEach(() => {
      sinon.restore;
    });

    it('saves the persistence into session storage if available', () => {
      const authCompat = new Auth(app, underlyingAuth);
      if (typeof self !== 'undefined') {
        sinon.stub(underlyingAuth, '_getPersistence').returns('TEST');
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        authCompat.signInWithRedirect(new impl.GoogleAuthProvider());
        expect(
          sessionStorage.getItem('firebase:persistence:api-key:undefined')
        ).to.eq('TEST');
      }
    });

    it('pulls the persistence and sets as the main persitsence if set', () => {
      if (typeof self !== 'undefined') {
        sessionStorage.setItem(
          'firebase:persistence:api-key:undefined',
          'NONE'
        );
        new Auth(app, underlyingAuth);
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        expect(
          underlyingAuth._initializeWithPersistence
        ).to.have.been.calledWith(
          [
            impl._getInstance(impl.inMemoryPersistence),
            impl._getInstance(impl.indexedDBLocalPersistence)
          ],
          impl.browserPopupRedirectResolver
        );
      }
    });
  });
});
