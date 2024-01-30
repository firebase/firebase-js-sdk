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

    expect(() => app.authIdTokenVerified).to.not.throw();
    (app as unknown as FirebaseServerAppImpl).isDeleted = true;

    expect(() => app.authIdTokenVerified()).throws(
      'Firebase Server App has been deleted'
    );
  });
});
