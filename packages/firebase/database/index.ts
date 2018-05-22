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

import _firebase from '../app';
import { _FirebaseNamespace } from '@firebase/app-types/private';
import { RepoManager, Reference, Query, Database, enableLogging, INTERNAL, TEST_ACCESS } from '@firebase/database';

const firebase = _firebase as any as _FirebaseNamespace;

const SERVICE_NAME = 'database';

firebase.INTERNAL.registerService(
  SERVICE_NAME,
  (app, unused, url) => RepoManager.getInstance().databaseFromApp(app, url),
  {
    Reference,
    Query,
    Database,
    enableLogging,
    INTERNAL,
    ServerValue: Database.ServerValue,
    TEST_ACCESS
  },
  null,
  true
);
