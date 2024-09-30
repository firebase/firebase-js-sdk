/**
 * @license
 * Copyright 2024 Google LLC
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

import {
  getDataConnect,
  queryRef,
  mutationRef,
  executeQuery,
  executeMutation
} from 'firebase/data-connect';

export const connectorConfig = {
  connector: 'test',
  service: 'dataconnect',
  location: 'us-central1'
};

function validateArgs(dcOrVars, vars, validateVars) {
  let dcInstance;
  let realVars;
  // TODO(mtewani); Check what happens if this is undefined.
  if (dcOrVars && 'dataConnectOptions' in dcOrVars) {
    dcInstance = dcOrVars;
    realVars = vars;
  } else {
    dcInstance = getDataConnect(connectorConfig);
    realVars = dcOrVars;
  }
  if (!dcInstance || (!realVars && validateVars)) {
    throw new Error('You didn\t pass in the vars!');
  }
  return { dc: dcInstance, vars: realVars };
}
