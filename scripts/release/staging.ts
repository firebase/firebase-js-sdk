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

import { spawn } from 'child-process-promise';
import { projectRoot as root } from '../utils';
import { getAllPackages, mapPkgNameToPkgJson } from './utils/workspace';

export async function bumpVersionForStaging(): Promise<
  Map<string, [string, string]>
> {
  const packages = await getAllPackages();
  const originalVersions = new Map<string, string>();

  const pkgJsons = await Promise.all(
    packages.map(pkg => mapPkgNameToPkgJson(pkg))
  );
  for (const { name, version } of pkgJsons) {
    originalVersions.set(name, version);
  }

  await spawn('yarn', ['changeset', 'version', '--snapshot'], {
    cwd: root,
    stdio: 'inherit'
  });

  const updatedPkgJsons: {
    name: string;
    updatedVersion: string;
  }[] = await Promise.all(packages.map(pkg => mapPkgNameToPkgJson(pkg)));
  const updatedVersions = new Map<string, [string, string]>();

  for (const { name, updatedVersion } of updatedPkgJsons) {
    const originalVersion = originalVersions.get(name)!;
    if (originalVersion !== updatedVersion) {
      updatedVersions.set(name, [originalVersion, updatedVersion]);
    }
  }

  return updatedVersions;
}
