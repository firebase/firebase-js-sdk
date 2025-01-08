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
import { FirebaseApp, FirebaseServerAppSettings } from './public-types';

const VALID_INSTATLLATIONS_AUTH_TOKEN_SECONDPART: string =
  'foo.eyJhcHBJZCI6IjE6MDAwMDAwMDAwMDAwOndlYjowMDAwMDAwMDAwMDAwMDAwMDAwMDAwIiwiZXhwIjoiMDAwMDAwMD' +
  'AwMCIsImZpZCI6IjAwMDAwMDAwMDAwMDAwMDAwMDAwMDAiLCJwcm9qZWN0TnVtYmVyIjoiMDAwMDAwMDAwMDAwIn0.foo';

const INVALID_INSTATLLATIONS_AUTH_TOKEN: string =
  'foo.eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9eyJhcHBJZCI6IjE6MDAwMDAwMDAwMDAwOndlYjowMDAwMDAwMDAwMD' +
  'AwMDAwMDAwMDAwIiwiZXhwIjowMDAwMDAwMDAwLCJwcm9qZWN0TnVtYmVyIjowMDAwMDAwMDAwMDB9.foo';

const INVALID_INSTATLLATIONS_AUTH_TOKEN_ONE_PART: string =
  'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9eyJhcHBJZCI6IjE6MDAwMDAwMDAwMDAwOndlYjowMDAwMDAwMDAwMD' +
  'AwMDAwMDAwMDAwIiwiZXhwIjowMDAwMDAwMDAwLCJwcm9qZWN0TnVtYmVyIjowMDAwMDAwMDAwMDB9';

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

  it('parses valid installationsAuthToken', () => {
    const options = {
      apiKey: 'APIKEY'
    };

    const serverAppSettings: FirebaseServerAppSettings = {
      automaticDataCollectionEnabled: false,
      installationsAuthToken: VALID_INSTATLLATIONS_AUTH_TOKEN_SECONDPART
    };

    let app: FirebaseApp | null = null;
    try {
      app = new FirebaseServerAppImpl(
        options,
        serverAppSettings,
        'testName',
        new ComponentContainer('test')
      );
    } catch (e) {}
    expect(app).to.not.be.null;
  });

  it('invalid installationsAuthToken throws', () => {
    const options = {
      apiKey: 'APIKEY'
    };

    const serverAppSettings: FirebaseServerAppSettings = {
      automaticDataCollectionEnabled: false,
      installationsAuthToken: INVALID_INSTATLLATIONS_AUTH_TOKEN
    };

    let failed = false;
    try {
      new FirebaseServerAppImpl(
        options,
        serverAppSettings,
        'testName',
        new ComponentContainer('test')
      );
    } catch (e) {
      failed = true;
    }
    expect(failed).to.be.true;
  });

  it('invalid single part installationsAuthToken throws', () => {
    const options = {
      apiKey: 'APIKEY'
    };

    const serverAppSettings: FirebaseServerAppSettings = {
      automaticDataCollectionEnabled: false,
      installationsAuthToken: INVALID_INSTATLLATIONS_AUTH_TOKEN_ONE_PART
    };

    let failed = false;
    try {
      new FirebaseServerAppImpl(
        options,
        serverAppSettings,
        'testName',
        new ComponentContainer('test')
      );
    } catch (e) {
      failed = true;
    }
    expect(failed).to.be.true;
  });
});
