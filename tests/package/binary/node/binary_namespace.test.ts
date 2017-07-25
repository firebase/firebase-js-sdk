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

const firebase = require('../../../../dist/package/firebase-node');
import { appInstanceSpec } from '../../utils/definitions/app';
import { assert } from 'chai';
import { checkProps } from '../../utils/validator';
import { FirebaseNamespace } from '../../../../src/app/firebase_app';
import { firebaseSpec } from '../../utils/definitions/firebase';
import { storageInstanceSpec } from '../../utils/definitions/storage';
import { authInstanceSpec } from '../../utils/definitions/auth';
import { compiledMessagingInstanceSpec } from '../../utils/definitions/messaging';
import { databaseInstanceSpec } from '../../utils/definitions/database';

const appConfig = {
  apiKey: 'test-api-key',
  authDomain: 'test-project-name.firebaseapp.com',
  databaseURL: 'https://test-project-name.firebaseio.com',
  projectId: 'test-project-name',
  storageBucket: 'test-project-name.appspot.com',
  messagingSenderId: '012345678910'
};

describe('Binary Namespace Test', () => {
  before(() => {
    firebase.initializeApp(appConfig);
  });
  describe('firebase Verification', () => {
    it('firebase should expose proper namespace', () => {
      checkProps('firebase', firebase, firebaseSpec);
    });
  });
  describe('Firebase App Verification', () => {
    it('firebase.app() should expose proper namespace', () => {
      checkProps('firebase.app()', firebase.app(), appInstanceSpec);
    });
  });
  describe('firebase.auth() Verification', () => {
    it('firebase.auth() should expose proper namespace', () => {
      checkProps('firebase.auth()', (firebase as any).auth(), authInstanceSpec);
    });
  });
  describe('firebase.database() Verification', () => {
    it('firebase.database() should expose proper namespace', () => {
      checkProps(
        'firebase.database()',
        (firebase as any).database(),
        databaseInstanceSpec
      );
    });
  });
});
