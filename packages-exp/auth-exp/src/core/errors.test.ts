import { ErrorFactory } from '@firebase/util';
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
import {
  AuthErrorCode,
  verboseErrorMap,
  prodErrorMap,
  ErrorMapRetriever,
  AuthErrorMap,
  AuthErrorParams
} from './errors';
import { _createError } from './util/assert';

function getErrorFactory(
  errorMap: AuthErrorMap
): ErrorFactory<AuthErrorCode, AuthErrorParams> {
  const map = (errorMap as ErrorMapRetriever)();
  const factory = new ErrorFactory<AuthErrorCode, AuthErrorParams>(
    'auth',
    'Firebase',
    map
  );
  return factory;
}

describe('verboseErrorMap', () => {
  it('should create an Auth namespaced FirebaseError with full message', () => {
    const error = getErrorFactory(verboseErrorMap).create(
      AuthErrorCode.INTERNAL_ERROR,
      {}
    );
    expect(error.code).to.eq('auth/internal-error');
    expect(error.message).to.eq(
      'Firebase: An internal AuthError has occurred. (auth/internal-error).'
    );
    expect(error.name).to.eq('FirebaseError');
  });
});

describe('prodErrorMap', () => {
  it('should create an Auth namespaced FirebaseError with full message', () => {
    const error = getErrorFactory(prodErrorMap).create(
      AuthErrorCode.INTERNAL_ERROR,
      {}
    );
    expect(error.code).to.eq('auth/internal-error');
    expect(error.message).to.eq('Firebase: Error (auth/internal-error).');
    expect(error.name).to.eq('FirebaseError');
  });
});
