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

import firebase from '@firebase/app';

/**
 * Assert `firebase.apps` is an array of Firebase apps
 *
 * i.e. We should be able to access the public members
 * of the App from inside of an individual app.
 */
firebase.apps.forEach(app => {
  const _name: string = app.name;
  const _options: Object = app.options;
  const _delete: Promise<any> = app.delete();
});

/**
 * Assert the SDK_VERSION is a string by passing it to
 * regex.test
 */
const regex = /\d\.\d\.\d/;
regex.test(firebase.SDK_VERSION);

/**
 * Assert we can init w/ a partially empty config
 * object
 */
firebase.initializeApp({
  apiKey: '1234567890'
});

/**
 * Assert we can init w/ full config object
 */
firebase.initializeApp({
  apiKey: '1234567890',
  authDomain: '1234567890',
  databaseURL: '1234567890',
  projectId: '1234567890',
  storageBucket: '1234567890',
  messagingSenderId: '1234567890'
});

/**
 * Assert we can pass an optional name
 */
firebase.initializeApp(
  {
    apiKey: '1234567890',
    authDomain: '1234567890',
    databaseURL: '1234567890',
    projectId: '1234567890',
    storageBucket: '1234567890',
    messagingSenderId: '1234567890'
  },
  'Dummy Name'
);

/**
 * Assert we get an instance of a FirebaseApp from `firebase.app()`
 */
const app = firebase.app();

/**
 * Assert the `name` and `options` properties exist
 */
const _name: string = app.name;
const _options: Object = app.options;

/**
 * Assert the `delete` method exists and returns a `Promise`
 */
const _delete: Promise<void> = app.delete();

/**
 * Assert the `Promise` ctor mounted at `firebase.Promise` can
 * be used to create new Promises.
 */

const promise: Promise<any> = new firebase.Promise((resolve, reject) => {
  resolve({});
  reject({});
})
  .then()
  .catch();
