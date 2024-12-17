/**
 * @license
 * Copyright 2023 Google LLC
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
import '../test/setup';
import { ComponentContainer } from '@firebase/component';
import { FirebaseServerAppImpl } from './firebaseServerApp';
import { FirebaseServerAppSettings } from './public-types';
import { base64Encode } from '@firebase/util';

const BASE64_DUMMY = base64Encode('dummystrings'); // encodes to ZHVtbXlzdHJpbmdz

// Creates a three part dummy token with an expiration claim in the second part. The expration
// time is based on the date offset provided.
function createServerAppTokenWithOffset(daysOffset: number): string {
  const timeInSeconds = Math.trunc(
    new Date().setDate(new Date().getDate() + daysOffset) / 1000
  );
  const secondPart = JSON.stringify({ exp: timeInSeconds });
  const token =
    BASE64_DUMMY + '.' + base64Encode(secondPart) + '.' + BASE64_DUMMY;
  return token;
}

describe('FirebaseServerApp', () => {
  it('has various accessors', () => {
    const options = {
      apiKey: 'APIKEY'
    };

    const serverAppSettings: FirebaseServerAppSettings = {
      automaticDataCollectionEnabled: false,
      releaseOnDeref: options
    };

    const firebaseServerAppImpl = new FirebaseServerAppImpl(
      options,
      serverAppSettings,
      'testName',
      new ComponentContainer('test')
    );

    expect(firebaseServerAppImpl.automaticDataCollectionEnabled).to.be.false;
    expect(firebaseServerAppImpl.options).to.deep.equal(options);
  });

  it('deep-copies options', () => {
    const options = {
      apiKey: 'APIKEY'
    };

    const serverAppSettings: FirebaseServerAppSettings = {
      automaticDataCollectionEnabled: false,
      releaseOnDeref: options
    };

    const firebaseServerAppImpl = new FirebaseServerAppImpl(
      options,
      serverAppSettings,
      'testName',
      new ComponentContainer('test')
    );

    expect(firebaseServerAppImpl.options).to.not.equal(options);
    expect(firebaseServerAppImpl.options).to.deep.equal(options);
  });

  it('sets automaticDataCollectionEnabled', () => {
    const options = {
      apiKey: 'APIKEY'
    };

    const serverAppSettings: FirebaseServerAppSettings = {
      automaticDataCollectionEnabled: false,
      releaseOnDeref: options
    };

    const firebaseServerAppImpl = new FirebaseServerAppImpl(
      options,
      serverAppSettings,
      'testName',
      new ComponentContainer('test')
    );

    expect(firebaseServerAppImpl.automaticDataCollectionEnabled).to.be.false;
    firebaseServerAppImpl.automaticDataCollectionEnabled = true;
    expect(firebaseServerAppImpl.automaticDataCollectionEnabled).to.be.true;
  });

  it('throws accessing any property after being deleted', () => {
    const options = {
      apiKey: 'APIKEY'
    };

    const serverAppSettings: FirebaseServerAppSettings = {
      automaticDataCollectionEnabled: false,
      releaseOnDeref: options
    };

    const app = new FirebaseServerAppImpl(
      options,
      serverAppSettings,
      'testName',
      new ComponentContainer('test')
    );

    expect(() => app.options).to.not.throw();
    (app as unknown as FirebaseServerAppImpl).isDeleted = true;

    expect(() => app.options).throws('Firebase Server App has been deleted');

    expect(() => app.automaticDataCollectionEnabled).throws(
      'Firebase Server App has been deleted'
    );
  });

  it('throws accessing any method after being deleted', () => {
    const options = {
      apiKey: 'APIKEY'
    };

    const serverAppSettings: FirebaseServerAppSettings = {
      automaticDataCollectionEnabled: false,
      releaseOnDeref: options
    };

    const app = new FirebaseServerAppImpl(
      options,
      serverAppSettings,
      'testName',
      new ComponentContainer('test')
    );

    expect(() => app.settings).to.not.throw();
    (app as unknown as FirebaseServerAppImpl).isDeleted = true;

    expect(() => app.settings).throws('Firebase Server App has been deleted');
  });

  it('should not be JSON serializable', () => {
    const options = {
      apiKey: 'APIKEY'
    };

    const serverAppSettings: FirebaseServerAppSettings = {
      automaticDataCollectionEnabled: false,
      releaseOnDeref: options
    };

    const app = new FirebaseServerAppImpl(
      options,
      serverAppSettings,
      'testName',
      new ComponentContainer('test')
    );

    expect(JSON.stringify(app)).to.eql(undefined);
  });

  it('accepts a valid authIdToken expiration', () => {
    const options = { apiKey: 'APIKEY' };
    const authIdToken = createServerAppTokenWithOffset(/*daysOffset=*/ 1);
    const serverAppSettings: FirebaseServerAppSettings = {
      automaticDataCollectionEnabled: false,
      releaseOnDeref: options,
      authIdToken
    };
    let encounteredError = false;
    try {
      new FirebaseServerAppImpl(
        options,
        serverAppSettings,
        'testName',
        new ComponentContainer('test')
      );
    } catch (e) {
      encounteredError = true;
    }
    expect(encounteredError).to.be.false;
  });

  it('throws when authIdToken has expired', () => {
    const options = { apiKey: 'APIKEY' };
    const authIdToken = createServerAppTokenWithOffset(/*daysOffset=*/ -1);
    const serverAppSettings: FirebaseServerAppSettings = {
      automaticDataCollectionEnabled: false,
      releaseOnDeref: options,
      authIdToken
    };
    let encounteredError = false;
    try {
      new FirebaseServerAppImpl(
        options,
        serverAppSettings,
        'testName',
        new ComponentContainer('test')
      );
    } catch (e) {
      encounteredError = true;
      expect((e as Error).toString()).to.contain(
        'app/server-app-token-expired'
      );
    }
    expect(encounteredError).to.be.true;
  });

  it('throws when authIdToken has too few parts', () => {
    const options = { apiKey: 'APIKEY' };
    const authIdToken = 'blah';
    const serverAppSettings: FirebaseServerAppSettings = {
      automaticDataCollectionEnabled: false,
      releaseOnDeref: options,
      authIdToken: base64Encode(authIdToken)
    };
    let encounteredError = false;
    try {
      new FirebaseServerAppImpl(
        options,
        serverAppSettings,
        'testName',
        new ComponentContainer('test')
      );
    } catch (e) {
      encounteredError = true;
    }
    expect(encounteredError).to.be.true;
  });

  it('accepts a valid appCheckToken expiration', () => {
    const options = { apiKey: 'APIKEY' };
    const appCheckToken = createServerAppTokenWithOffset(/*daysOffset=*/ 1);
    const serverAppSettings: FirebaseServerAppSettings = {
      automaticDataCollectionEnabled: false,
      releaseOnDeref: options,
      appCheckToken
    };
    let encounteredError = false;
    try {
      new FirebaseServerAppImpl(
        options,
        serverAppSettings,
        'testName',
        new ComponentContainer('test')
      );
    } catch (e) {
      encounteredError = true;
    }
    expect(encounteredError).to.be.false;
  });

  it('throws when appCheckToken has expired', () => {
    const options = { apiKey: 'APIKEY' };
    const appCheckToken = createServerAppTokenWithOffset(/*daysOffset=*/ -1);
    const serverAppSettings: FirebaseServerAppSettings = {
      automaticDataCollectionEnabled: false,
      releaseOnDeref: options,
      appCheckToken
    };
    let encounteredError = false;
    try {
      new FirebaseServerAppImpl(
        options,
        serverAppSettings,
        'testName',
        new ComponentContainer('test')
      );
    } catch (e) {
      encounteredError = true;
      expect((e as Error).toString()).to.contain(
        'app/server-app-token-expired'
      );
    }
    expect(encounteredError).to.be.true;
  });

  it('throws when appCheckToken has too few parts', () => {
    const options = { apiKey: 'APIKEY' };
    const appCheckToken = 'blah';
    const serverAppSettings: FirebaseServerAppSettings = {
      automaticDataCollectionEnabled: false,
      releaseOnDeref: options,
      appCheckToken: base64Encode(appCheckToken)
    };
    let encounteredError = false;
    try {
      new FirebaseServerAppImpl(
        options,
        serverAppSettings,
        'testName',
        new ComponentContainer('test')
      );
    } catch (e) {
      encounteredError = true;
    }
    expect(encounteredError).to.be.true;
  });
});
