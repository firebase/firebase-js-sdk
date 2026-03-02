/**
 * @license
 * Copyright 2019 Google LLC
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
import { FirebaseAppImpl } from './firebaseApp';
import { ComponentContainer } from '@firebase/component';
import { deleteApp, initializeApp, offAppInit, onAppInit } from './api';
import { FirebaseApp } from './public-types';

describe('FirebaseAppNext', () => {
  it('has various accessors', () => {
    const options = {
      apiKey: 'APIKEY'
    };
    const app = new FirebaseAppImpl(
      options,
      { name: 'test', automaticDataCollectionEnabled: true },
      new ComponentContainer('test')
    );

    expect(app.automaticDataCollectionEnabled).to.be.true;
    expect(app.name).to.equal('test');
    expect(app.options).to.deep.equal(options);
  });

  it('deep-copies options', () => {
    const options = {
      apiKey: 'APIKEY'
    };
    const app = new FirebaseAppImpl(
      options,
      { name: 'test', automaticDataCollectionEnabled: false },
      new ComponentContainer('test')
    );

    expect(app.options).to.not.equal(options);
    expect(app.options).to.deep.equal(options);
  });

  it('sets automaticDataCollectionEnabled', () => {
    const app = new FirebaseAppImpl(
      {},
      { name: 'test', automaticDataCollectionEnabled: false },
      new ComponentContainer('test')
    );

    expect(app.automaticDataCollectionEnabled).to.be.false;
    app.automaticDataCollectionEnabled = true;
    expect(app.automaticDataCollectionEnabled).to.be.true;
  });

  it('throws accessing any property after being deleted', () => {
    const app = new FirebaseAppImpl(
      {},
      { name: 'test', automaticDataCollectionEnabled: false },
      new ComponentContainer('test')
    );

    expect(() => app.name).to.not.throw();
    (app as unknown as FirebaseAppImpl).isDeleted = true;

    expect(() => {
      app.name;
    }).throws("Firebase App named 'test' already deleted");
    expect(() => app.options).throws(
      "Firebase App named 'test' already deleted"
    );
    expect(() => app.automaticDataCollectionEnabled).throws(
      "Firebase App named 'test' already deleted"
    );
  });
  it('calls onAppInit callbacks', () => {
    let called = false;
    onAppInit(_ => {
      called = true;
    });
    expect(called).to.be.false;
    const app = initializeApp({
      apiKey: 'APIKEY'
    });
    expect(called).to.be.true;
    deleteApp(app);
  });
  it(`successfully de-registers callback from onAppInit`, () => {
    let called = false;
    const callback = (_: FirebaseApp) => {
      called = true;
    };
    onAppInit(callback);
    expect(called).to.be.false;
    offAppInit(callback);
    initializeApp({
      apiKey: 'APIKEY'
    });
    expect(called).to.be.false;
  });
});
