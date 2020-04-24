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

import { expect } from 'chai';
import { AuthErrorCode, AUTH_ERROR_FACTORY } from './errors';

describe('core/AUTH_ERROR_FACTORY', () => {
  it('should create an Auth namespaced FirebaseError', () => {
    const error = AUTH_ERROR_FACTORY.create(AuthErrorCode.INTERNAL_ERROR, {
      appName: 'my-app'
    });
    expect(error.code).to.eq('auth/internal-error');
    expect(error.message).to.eq(
      'Firebase: An internal AuthError has occurred. (auth/internal-error).'
    );
    expect(error.name).to.eq('FirebaseError');
  });
});
