#!/usr/bin/env node

/**
 * @license
 * Copyright 2026 Google LLC
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

const mode = process.argv[2];

if (mode !== 'good' && mode !== 'bad') {
  throw new Error(`Invalid argument: "${mode}". Expected "good" or "bad".`);
}

const url =
  'https://firebasedataconnect.googleapis.com/v1/projects/jscore-sandbox-141b5/locations/us-west2/services/fdc-service/connectors/tests:executeMutation';

const headers = {
  'Content-Type': 'application/json',
  'X-Goog-Api-Client': 'gl-js/ fire/0.15.1'
};

if (mode === 'bad') {
  headers['X-Client-Platform'] = 'web';
  headers['X-Client-Version'] = '0.15.1';
}

const { randomUUID } = require('crypto');

const body = JSON.stringify({
  name: 'projects/jscore-sandbox-141b5/locations/us-west2/services/fdc-service/connectors/tests',
  operationName: 'AddPost',
  variables: {
    id: randomUUID(),
    description: 'task 1',
    testId: randomUUID()
  }
});

console.log(`Executing fetch in "${mode}" mode with headers:`, headers);

async function run() {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body
    });
    console.log(`Status: ${res.status} ${res.statusText}`);
    const text = await res.text();
    console.log('Response body:', text);
  } catch (err) {
    console.error('Fetch failed with error:', err);
    process.exit(1);
  }
}

run();
