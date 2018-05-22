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
import { isSupported, errorFactory, ERROR_CODES, SwController, WindowController } from '@firebase/messaging';

const firebase = _firebase as any as _FirebaseNamespace;

const SERVICE_NAME = 'messaging';

const messagingFactory = app => {
  if (!isSupported()) {
    throw errorFactory.create(ERROR_CODES.UNSUPPORTED_BROWSER);
  }

  if (self && 'ServiceWorkerGlobalScope' in self) {
    // Running in ServiceWorker context
    return new SwController(app);
  } else {
    // Assume we are in the window context.
    return new WindowController(app);
  }
};

firebase.INTERNAL.registerService(
  SERVICE_NAME,
  messagingFactory,
  { isSupported }
);
