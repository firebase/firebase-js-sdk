/**
 * @license
 * Copyright 2018 Google LLC
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

import { ReleaseType } from './enums';

export const releaseType = {
  type: 'list',
  name: 'releaseType',
  message: 'Is this a staging, or a production release?',
  choices: [ReleaseType.Staging, ReleaseType.Production],
  default: ReleaseType.Staging
};

export function validateVersions(versionMap: Map<string, [string, string]>) {
  let message =
    '\r\nAre you sure these are the versions you want to publish?\r\n';
  for (const [pkgName, [originalVersion, updatedVersion]] of versionMap) {
    message += `${pkgName} ${originalVersion} -> ${updatedVersion}\n`;
  }

  return {
    type: 'confirm',
    name: 'versionCheck',
    message,
    default: false
  };
}
