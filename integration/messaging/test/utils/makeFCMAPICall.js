/**
 * @license
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

module.exports = async (endpoint, apiKey, apiBody) => {
  if (!apiKey) {
    throw new Error('No API Key provided to makeFCMAPICall(): ', apiBody);
  }

  console.log('Making API call to FCM...');
  const response = await fetch(`${endpoint}/fcm/send`, {
    method: 'POST',
    body: JSON.stringify(apiBody),
    headers: {
      Authorization: `key=${apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  console.log('Checking FCM Response...');
  // FCM will return HTML if there is an error so we can't parse
  // the response as JSON, instead have to read as text, then parse
  // then handle the possible error.
  let responseText;
  try {
    responseText = await response.text();
    return JSON.parse(responseText);
  } catch (err) {
    console.error(`Failed to read response: `, responseText);
    console.error(err);
    throw new Error(`Unexpected response: '${responseText}'`);
  }
};
