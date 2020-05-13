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

const fetch = require('node-fetch');
const FCM_SEND_ENDPOINT = 'https://fcm.googleapis.com/fcm/send';
require('dotenv').config({ path: __dirname + '/.env' });

module.exports = async payload => {
  let serverKey = process.env.FCM_TEST_PROJECT_SERVER_KEY;

  if (!serverKey) {
    throw 'Fail to send a message: process.env has no server key';
  }

  console.log(
    'Requesting to send an FCM message with payload: ' + JSON.stringify(payload)
  );

  const response = await fetch(FCM_SEND_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      Authorization: 'key=' + serverKey,
      'Content-Type': 'application/json'
    }
  });

  // Note that FCM Send API responses are in HTML format
  return JSON.parse(await response.text());
};
