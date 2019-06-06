/**
 * @license
 * Copyright 2019 Google Inc.
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

import { Api } from '../services/api_service';

// The values and orders of the following enums should not be changed.
const enum ServiceWorkerStatus {
  UNKNOWN = 0,
  UNSUPPORTED = 1,
  CONTROLLED = 2,
  UNCONTROLLED = 3
}

export enum VisibilityState {
  UNKNOWN = 0,
  VISIBLE = 1,
  HIDDEN = 2,
  PRERENDER = 3,
  UNLOADED = 4
}

const enum EffectiveConnectionType {
  UNKNOWN = 0,
  CONNECTION_SLOW_2G = 1,
  CONNECTION_2G = 2,
  CONNECTION_3G = 3,
  CONNECTION_4G = 4
}

export function getServiceWorkerStatus(): ServiceWorkerStatus {
  const navigator = Api.getInstance().navigator;
  if ('serviceWorker' in navigator) {
    if (navigator.serviceWorker.controller) {
      return ServiceWorkerStatus.CONTROLLED;
    } else {
      return ServiceWorkerStatus.UNCONTROLLED;
    }
  } else {
    return ServiceWorkerStatus.UNSUPPORTED;
  }
}

export function getVisibilityState(): VisibilityState {
  const document = Api.getInstance().document;
  const visibilityState = document.visibilityState;
  switch (visibilityState) {
    case 'visible':
      return VisibilityState.VISIBLE;
    case 'hidden':
      return VisibilityState.HIDDEN;
    case 'prerender':
      return VisibilityState.PRERENDER;
    default:
      return VisibilityState.UNKNOWN;
  }
}

export function getEffectiveConnectionType(): EffectiveConnectionType {
  const navigator = Api.getInstance().navigator;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigatorConnection = (navigator as any).connection;
  const effectiveType =
    navigatorConnection && navigatorConnection.effectiveType;
  switch (effectiveType) {
    case 'slow-2g':
      return EffectiveConnectionType.CONNECTION_SLOW_2G;
    case '2g':
      return EffectiveConnectionType.CONNECTION_2G;
    case '3g':
      return EffectiveConnectionType.CONNECTION_3G;
    case '4g':
      return EffectiveConnectionType.CONNECTION_4G;
    default:
      return EffectiveConnectionType.UNKNOWN;
  }
}
