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

import { SDK_VERSION } from '@firebase/app';
import { _getBrowserName } from './browser';
import { getUA } from '@firebase/util';

export const enum ClientImplementation {
  CORE = 'JsCore'
}

/**
 * @internal
 */
export const enum ClientPlatform {
  BROWSER = 'Browser',
  NODE = 'Node',
  REACT_NATIVE = 'ReactNative',
  CORDOVA = 'Cordova',
  WORKER = 'Worker',
  WEB_EXTENSION = 'WebExtension'
}

/*
 * Determine the SDK version string
 */
export function _getClientVersion(
  clientPlatform: ClientPlatform,
  frameworks: readonly string[] = []
): string {
  let reportedPlatform: string;
  switch (clientPlatform) {
    case ClientPlatform.BROWSER:
      // In a browser environment, report the browser name.
      reportedPlatform = _getBrowserName(getUA());
      break;
    case ClientPlatform.WORKER:
      // Technically a worker runs from a browser but we need to differentiate a
      // worker from a browser.
      // For example: Chrome-Worker/JsCore/4.9.1/FirebaseCore-web.
      reportedPlatform = `${_getBrowserName(getUA())}-${clientPlatform}`;
      break;
    default:
      reportedPlatform = clientPlatform;
  }
  const reportedFrameworks = frameworks.length
    ? frameworks.join(',')
    : 'FirebaseCore-web'; /* default value if no other framework is used */
  return `${reportedPlatform}/${ClientImplementation.CORE}/${SDK_VERSION}/${reportedFrameworks}`;
}
