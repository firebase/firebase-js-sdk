/**
 * @license
 * Copyright 2019 Google LLC
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
import { GTAG_URL } from '../src/constants';

export function removeGtagScript(): void {
  const scriptTags = window.document.getElementsByTagName('script');
  for (const tag of Object.values(scriptTags)) {
    if (tag.src) {
      if (tag.src.includes(GTAG_URL) && tag.parentElement) {
        tag.parentElement!.removeChild(tag);
      }
    }
  }
}
