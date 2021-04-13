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

import * as yargs from 'yargs';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

interface TocItem {
  title: string;
  path: string;
  section?: TocItem[];
}

const argv = yargs
  .options({
    input: {
      alias: 'i',
      type: 'string',
      default: 'temp'
    }
  })
  .help().argv;

const REF_DOC_DIR = '/docs/reference/js';
const REPORT_DIR = path.resolve(process.cwd(), argv.input);

const js: TocItem = {
  title: 'firebase',
  path: `${REF_DOC_DIR}/index`
};
const toc = [js];

for (const fileName of fs.readdirSync(REPORT_DIR)) {
  const report = require(`${REPORT_DIR}/${fileName}`);

  /**
   * Entry point
   */
  for (const entryPoint of report.members) {
    const entryPointName = entryPoint.canonicalReference
      .replace('!', '')
      .replace('@firebase/', '');
    const entryPointToc: Required<TocItem> = {
      title: entryPointName,
      path: `${REF_DOC_DIR}/${getFileName(
        entryPoint,
        entryPoint,
        report.members.length > 1
      )}`,
      section: []
    };

    for (const member of entryPoint.members) {
      const fileName = getFileName(
        member,
        entryPoint,
        report.members.length > 1
      );

      if (fileName) {
        entryPointToc.section.push({
          title: member.name,
          path: `${REF_DOC_DIR}/${fileName}`
        });
      }
    }
    toc.push(entryPointToc);
  }
}

console.log(
  yaml.dump(
    { toc },
    {
      quotingType: '"'
    }
  )
);

function getFileName(
  apiMember: any,
  entryPoint: any,
  multipleEntryPoints = false
) {
  const entryPointName = entryPoint.canonicalReference.replace('!', '');
  const unscopedName = getUnscopedName(entryPointName);
  let entryPointPrefix = unscopedName;

  if (multipleEntryPoints) {
    const nameParts = unscopedName.split('/');
    if (nameParts.length === 1) {
      entryPointPrefix = `${unscopedName}_`;
    } else {
      // > 1
      entryPointPrefix = nameParts.join('_');
    }
  }

  switch (apiMember.kind) {
    case 'EntryPoint':
      return entryPointPrefix;
    case 'Class':
    case 'Interface':
      return `${entryPointPrefix}.${apiMember.name.toLowerCase()}`;
    default:
      // other kinds don't have their own files
      return null;
  }
}

function getUnscopedName(packageName: string) {
  const parts = packageName.split('/');
  if (parts.length === 1) {
    return packageName;
  }

  parts.shift();
  return parts.join('/');
}
