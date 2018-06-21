/**
 * Copyright 2017 Google Inc.
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

import firebase from '../src/namespace';
import { expect } from 'chai';

describe('`firebase` Namespace', () => {
  /**
   * Namespace is a container of state, so reset it after each test
   */
  afterEach(() => {
    firebase.__reset();
  });

  it('Should properly handle initializeApp name config options', () => {
    const app1 = firebase.initializeApp({});
    expect(app1.name).to.equal('[DEFAULT]', 'Default name was not assigned');

    const app2 = firebase.initializeApp({}, 'app-1');
    expect(app2.name).to.equal(
      'app-1',
      'String value to initializeApp was not properly handled'
    );

    const app3 = firebase.initializeApp({}, { name: 'app-2' });
    expect(app3.name).to.equal(
      'app-2',
      'Object with `.name` prop not properly handled'
    );
  });

  it('Should properly handle initializeApp GDPR settings', () => {
    const app = firebase.initializeApp({});
    expect(app.automaticDataCollectionEnabled).to.be.false;

    const app2 = firebase.initializeApp({}, { name: 'app-2', automaticDataCollectionEnabled: true });
    expect(app2.automaticDataCollectionEnabled).to.be.true;
  });

  it('Should not be able to create an app that already exists', () => {
    /**
     * Seeding the namespace
     */
    firebase.initializeApp({});
    firebase.initializeApp({}, 'named');

    expect(() => {
      firebase.initializeApp({});
    }, 'Default app was succesfully created twice').to.throw();

    expect(() => {
      firebase.initializeApp({}, 'named');
    }, 'Named app was succesfully created twice').to.throw();
  });

  it('Should properly expose all created apps through `apps` array', async () => {
    expect(firebase.apps.length).to.equal(
      0,
      'namespace had an app before one was initialized'
    );
    const defaultApp = firebase.initializeApp({});
    expect(firebase.apps.length).to.equal(
      1,
      'namespace did not properly increment counter on default app'
    );
    const namedApp = firebase.initializeApp({}, 'Todoroki');
    expect(firebase.apps.length).to.equal(
      2,
      'namespace did not properly increment counter on named app'
    );

    await Promise.all([defaultApp.delete(), namedApp.delete()]);

    expect(firebase.apps.length).to.equal(
      0,
      'namespace did not properly clear apps as they were deleted'
    );
  });
  it('Should allow you to access apps through `app` function', () => {
    const defaultApp = firebase.initializeApp({});
    const namedApp =  firebase.initializeApp({}, 'app-1');

    expect(firebase.app()).to.equal(defaultApp);
    expect(firebase.app('app-1')).to.equal(namedApp);
  });
  it('Should expose a string value for the SDK_VERSION', () => {
    expect(firebase.SDK_VERSION).to.be.a('string');
  });
  it('Should allow you to create an app with an identical name if the first is deleted', async () => {
    const app = firebase.initializeApp({});

    await app.delete();

    expect(() => {
      firebase.initializeApp({});
    }).to.not.throw();
  });
});
