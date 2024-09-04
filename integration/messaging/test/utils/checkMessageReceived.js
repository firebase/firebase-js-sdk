/**
 * @license
 * Copyright 2020 Google LLC
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
const expect = require('chai').expect;

const TEST_PROJECT_SENDER_ID = '750970317741';
const DEFAULT_COLLAPSE_KEY_VALUE = 'do_not_collapse';
const FIELD_FROM = 'from';
const FIELD_COLLAPSE_KEY_LEGACY = 'collapse_key';
const FIELD_COLLAPSE_KEY = 'collapseKey';

const FIELD_DATA = 'data';
const FIELD_NOTIFICATION = 'notification';

module.exports = (
  receivedMessages,
  expectedNotificationPayload,
  expectedDataPayload
) => {
  expect(receivedMessages).to.exist;

  const message = receivedMessages[0];

  expect(message[FIELD_FROM]).to.equal(TEST_PROJECT_SENDER_ID);
  const collapseKey = !!message[FIELD_COLLAPSE_KEY_LEGACY]
    ? message[FIELD_COLLAPSE_KEY_LEGACY]
    : message[FIELD_COLLAPSE_KEY];
  expect(collapseKey).to.equal(DEFAULT_COLLAPSE_KEY_VALUE);

  if (expectedNotificationPayload) {
    expect(message[FIELD_NOTIFICATION]).to.deep.equal(
      getTestNotificationPayload()
    );
  }

  if (expectedDataPayload) {
    expect(message[FIELD_DATA]).to.deep.equal(getTestDataPayload());
  }
};

function getTestNotificationPayload() {
  return {
    title: 'test title',
    body: 'test body',
    icon: '/test/icon.png',
    click_action: '/',
    tag: 'test-tag'
  };
}

function getTestDataPayload() {
  return { hello: 'world' };
}
