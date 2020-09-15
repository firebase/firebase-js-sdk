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
import firebase from '@firebase/app';
import { _FirebaseNamespace } from '@firebase/app-types/private';
import { registerFunctions } from './src/config';
import 'whatwg-fetch';
import nodeFetch from 'node-fetch';

import { name, version } from './package.json';

/**
 * Patch global object with node-fetch. whatwg-fetch polyfill patches other global
 * fetch objects such as Headers. Then we override the implemenation of `fetch()`
 * itself with node-fetch.
 * https://github.com/node-fetch/node-fetch#loading-and-configuring-the-module
 * node-fetch type deviates somewhat from fetch spec:
 * https://github.com/apollographql/apollo-link/issues/513#issuecomment-548219023
 */
globalThis.fetch = (nodeFetch as unknown) as typeof fetch;

registerFunctions(firebase as _FirebaseNamespace);
firebase.registerVersion(name, version, 'node');
