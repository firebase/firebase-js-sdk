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

// For some reason, the linter doesn't recognize that these are used elsewhere
// in the SDK
/* eslint-disable @typescript-eslint/no-unused-vars */

declare namespace cordova.plugins.browsertab {
  function isAvailable(cb: (available: boolean) => void): void;
  function openUrl(url: string): void;
}

declare namespace cordova.InAppBrowser {
  function open(url: string, target: string, options: string): InAppBrowserRef;
}

declare namespace universalLinks {
  function subscribe(
    n: null,
    cb: (event: Record<string, string> | null) => void
  ): void;
}

declare namespace BuildInfo {
  const packageName: string;
  const displayName: string;
}

declare function handleOpenUrl(url: string): void;

declare interface InAppBrowserRef {
  close?: () => void;
}
