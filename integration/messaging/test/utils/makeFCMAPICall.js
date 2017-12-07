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

const fetch = require('node-fetch');

module.exports = async (endpoint, apiBody) => {
  const response = await fetch(`${endpoint}/fcm/send`, {
    method: 'POST',
    body: JSON.stringify(apiBody),
    headers: {
      Authorization: 'key=AIzaSyCqJkOa5awRsZ-1EyuAwU4loC3YXDBouIo',
      'Content-Type': 'application/json'
    }
  });

  // FCM will return HTML if there is an error so we can't parse
  // the response as JSON, instead have to read as text, then parse
  // then handle the possible error.
  const responseText = await response.text();

  try {
    return JSON.parse(responseText);
  } catch (err) {
    throw new Error(`Unexpected response: '${responseText}'`);
  }
};
