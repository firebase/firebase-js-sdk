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

import { ProviderId, SignInMethod } from '@firebase/auth-types-exp';
import { expect, use } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { AnonymousProvider } from './anonymous';

use(chaiAsPromised);

describe('core/providers/anonymous', () => {
  describe('.credential', () => {
    it('should return an anonymous credential', () => {
      const credential = AnonymousProvider.credential();
      expect(credential.providerId).to.eq(ProviderId.ANONYMOUS);
      expect(credential.signInMethod).to.eq(SignInMethod.ANONYMOUS);
    });
  });
});
