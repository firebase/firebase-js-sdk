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

function getScriptParentElement(): HTMLDocument | HTMLHeadElement {
  return document.getElementsByTagName('head')?.[0] ?? document;
}

export function _loadJS(url: string): Promise<Event> {
  // TODO: consider adding timeout support & cancellation
  return new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.setAttribute('src', url);
    el.onload = resolve;
    el.onerror = reject;
    el.type = 'text/javascript';
    el.charset = 'UTF-8';
    getScriptParentElement().appendChild(el);
  });
}

export function _generateCallbackName(prefix: string): string {
  return `__${prefix}${Math.floor(Math.random() * 1000000)}`;
}
