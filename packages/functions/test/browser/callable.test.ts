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
import { expect } from 'chai';
import * as sinon from 'sinon';
import { FirebaseApp } from '@firebase/app-types';
import { makeFakeApp, createTestService } from '../utils';
import {
  FirebaseMessaging,
  FirebaseMessagingName
} from '@firebase/messaging-types';
import {
  Provider,
  ComponentContainer,
  ComponentType,
  Component
} from '@firebase/component';

// eslint-disable-next-line @typescript-eslint/no-require-imports
export const TEST_PROJECT = require('../../../../config/project.json');

describe('Firebase Functions > Call', () => {
  const app: FirebaseApp = makeFakeApp({
    projectId: TEST_PROJECT.projectId,
    messagingSenderId: 'messaging-sender-id'
  });
  const region = 'us-central1';

  // TODO(klimt): Move this to the cross-platform tests and delete this file,
  // once instance id works there.
  it('instance id', async () => {
    if (!('Notification' in self)) {
      console.log('No Notification API: skipping instance id test.');
      return;
    }
    // mock firebase messaging
    const messagingMock: FirebaseMessaging = ({
      getToken: async () => 'iid'
    } as unknown) as FirebaseMessaging;
    const messagingProvider = new Provider<FirebaseMessagingName>(
      'messaging',
      new ComponentContainer('test')
    );
    messagingProvider.setComponent(
      new Component('messaging', () => messagingMock, ComponentType.PRIVATE)
    );

    const functions = createTestService(
      app,
      region,
      undefined,
      messagingProvider
    );

    // Stub out the messaging method get an instance id token.
    const stub = sinon.stub(messagingMock, 'getToken').callThrough();
    sinon.stub(Notification, 'permission').value('granted');

    const func = functions.httpsCallable('instanceIdTest');
    const result = await func({});
    expect(result.data).to.deep.equal({});

    expect(stub.callCount).to.equal(1);
    stub.restore();
  });
});
