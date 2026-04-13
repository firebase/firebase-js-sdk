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
import { assert } from 'chai';
import {
  ErrorFactory,
  ErrorMap,
  FirebaseError,
  parseIdTokenToAuthInfo,
  FirebaseErrorWithAuthInfo,
  isContextualErrorsEnabled,
  enableContextualErrors
} from '../src/errors';
import { base64urlEncodeWithoutPadding } from '../src/crypt';

type ErrorCode =
  | 'generic-error'
  | 'file-not-found'
  | 'anon-replace'
  | 'overwrite-field';

const ERROR_MAP: ErrorMap<ErrorCode> = {
  'generic-error': 'Unknown error',
  'file-not-found': "Could not find file: '{$file}'",
  'anon-replace': 'Hello, {$repl_}!',
  'overwrite-field':
    'I decided to use {$code} to represent the error code from my server.'
};

interface ErrorParams {
  'file-not-found': { file: string };
  'anon-replace': { repl_: string };
  'overwrite-field': { code: string };
}

const ERROR_FACTORY = new ErrorFactory<ErrorCode, ErrorParams>(
  'fake',
  'Fake',
  ERROR_MAP
);

describe('FirebaseError', () => {
  it('creates an Error', () => {
    const e = ERROR_FACTORY.create('generic-error');
    assert.instanceOf(e, Error);
    assert.instanceOf(e, FirebaseError);
    assert.equal((e as FirebaseError)?.code, 'fake/generic-error');
    assert.equal(e.message, 'Fake: Unknown error (fake/generic-error).');
  });

  it('replaces template values with data', () => {
    const e = ERROR_FACTORY.create('file-not-found', { file: 'foo.txt' });
    assert.equal((e as FirebaseError)?.code, 'fake/file-not-found');
    assert.equal(
      e.message,
      "Fake: Could not find file: 'foo.txt' (fake/file-not-found)."
    );
    assert.equal(e.customData!.file, 'foo.txt');
  });

  it('uses "Error" as template when template is missing', () => {
    // Cast to avoid compile-time error.
    const e = ERROR_FACTORY.create('no-such-code' as any as ErrorCode);
    assert.equal((e as FirebaseError)?.code, 'fake/no-such-code');
    assert.equal(e.message, 'Fake: Error (fake/no-such-code).');
  });

  it('uses the key in the template if the replacement is missing', () => {
    const e = ERROR_FACTORY.create('file-not-found', {
      fileX: 'foo.txt'
    } as any);
    assert.equal((e as FirebaseError)?.code, 'fake/file-not-found');
    assert.equal(
      e.message,
      "Fake: Could not find file: '<file?>' (fake/file-not-found)."
    );
  });

  it('has stack', () => {
    const e = ERROR_FACTORY.create('generic-error');

    // In case of IE11, stack will be set only after error is raised, so we throw the error then test.
    // https://docs.microsoft.com/en-us/scripting/javascript/reference/stack-property-error-javascript
    try {
      throw e;
    } catch (error) {
      assert.isDefined((error as Error).stack);
      // Firefox no longer puts the error class name in the stack
      // as of 139.0 so we don't have a string to match on.
    }
  });

  it('has function names in stack trace in correct order', () => {
    try {
      dummy1();
      assert.ok(false);
    } catch (e) {
      assert.instanceOf(e, FirebaseError);
      assert.isDefined((e as FirebaseError).stack);
      assert.match((e as FirebaseError).stack!, /dummy2[\s\S]*?dummy1/);
    }
  });
});

describe('parseIdTokenToAuthInfo', () => {
  it('should parse a valid token and return AuthInfo', () => {
    /* eslint-disable camelcase */
    const claimsObj = {
      user_id: 'test-uid',
      email: 'test@example.com',
      email_verified: true,
      provider_id: 'password'
    };
    /* eslint-enable camelcase */
    const claims = base64urlEncodeWithoutPadding(JSON.stringify(claimsObj));
    const header = 'e30'; // base64url for "{}"
    const token = `${header}.${claims}.signature`;
    const authInfo = parseIdTokenToAuthInfo(token);
    assert.deepEqual(authInfo, {
      userId: 'test-uid',
      email: 'test@example.com',
      emailVerified: true,
      isAnonymous: false
    });
  });
});

describe('DetailedErrors', () => {
  it('should be disabled by default', () => {
    assert.isFalse(isContextualErrorsEnabled());
  });

  it('should enable detailed errors globally', () => {
    enableContextualErrors(true);
    assert.isTrue(isContextualErrorsEnabled());
    enableContextualErrors(false); // reset
  });
});

function dummy1(): void {
  dummy2();
}

function dummy2(): void {
  throw ERROR_FACTORY.create('generic-error');
}
