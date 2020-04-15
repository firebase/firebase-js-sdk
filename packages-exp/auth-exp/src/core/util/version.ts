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

import { SDK_VERSION } from '@firebase/app-exp';
import { getBrowserName } from './browser';
import { getUA } from '@firebase/util';

const CLIENT_IMPLEMENTATION = 'JsCore';

export enum ClientPlatform {
  BROWSER = 'Browser',
  NODE = 'Node',
  REACT_NATIVE = 'ReactNative',
  WORKER = 'Worker'
}

enum ClientFramework {
  // No other framework used.
  DEFAULT = 'FirebaseCore-web',
  // Firebase Auth used with FirebaseUI-web.
  // TODO: Pass this in when used in conjunction with FirebaseUI
  FIREBASEUI = 'FirebaseUI-web'
}

/*
 * Determine the SDK version string
 *
 * TODO: This should be set on the Auth object during initialization
 */
export function getClientVersion(clientPlatform: ClientPlatform): string {
  let reportedPlatform: string;
  switch (clientPlatform) {
    case ClientPlatform.BROWSER:
      // In a browser environment, report the browser name.
      reportedPlatform = getBrowserName(getUA());
      break;
    case ClientPlatform.WORKER:
      // Technically a worker runs from a browser but we need to differentiate a
      // worker from a browser.
      // For example: Chrome-Worker/JsCore/4.9.1/FirebaseCore-web.
      reportedPlatform = `${getBrowserName(getUA())}-${clientPlatform}`;
      break;
    default:
      reportedPlatform = clientPlatform;
  }
  return `${reportedPlatform}/${CLIENT_IMPLEMENTATION}/${SDK_VERSION}/${ClientFramework.DEFAULT}`;
}
