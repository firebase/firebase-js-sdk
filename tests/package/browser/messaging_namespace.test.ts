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

import { createFirebaseNamespace } from '../../../src/app/firebase_app';
import { messagingInstanceSpec } from '../utils/definitions/messaging';
import { FirebaseNamespace } from '../../../src/app/firebase_app';
import { registerMessaging } from '../../../src/messaging';
import { checkProps } from '../utils/validator';

const appConfig = {
  apiKey: 'test-api-key',
  authDomain: 'test-project-name.firebaseapp.com',
  databaseURL: 'https://test-project-name.firebaseio.com',
  projectId: 'test-project-name',
  storageBucket: 'test-project-name.appspot.com',
  messagingSenderId: '012345678910'
};

describe('Namespace Test', () => {
  let firebase: FirebaseNamespace;
  beforeEach(() => {
    firebase = createFirebaseNamespace();
    registerMessaging(firebase);
    firebase.initializeApp(appConfig);
  });
  describe('firebase.messaging() Verification', () => {
    it('firebase.messaging() should expose proper namespace', () => {
      checkProps(
        'firebase.messaging()',
        (firebase as any).messaging(),
        messagingInstanceSpec
      );
    });
  });
});
