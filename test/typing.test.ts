/**
 * @license
 * Copyright 2021 Google LLC
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
  logEvent,
  setCurrentScreen,
  setUserId,
  setUserProperties
} from '../packages-exp/firebase-exp/analytics';
import { updateCurrentUser } from '../packages-exp/firebase-exp/auth';
import firebase from '../packages-exp/firebase-exp/compat';

// Test that index.d.ts typings work in exp function signatures.
firebase.initializeApp({});
const oldAnalytics = firebase.analytics();
const oldAuth = firebase.auth();
logEvent(oldAnalytics, 'login', {});
setCurrentScreen(oldAnalytics, 'home');
setUserId(oldAnalytics, 'user123');
setUserProperties(oldAnalytics, { customProp: 'abc' });
updateCurrentUser(oldAuth, null);
