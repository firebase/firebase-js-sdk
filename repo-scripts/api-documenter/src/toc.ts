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

import yaml from 'js-yaml';
import { ApiItem, ApiItemKind, ApiModel } from 'api-extractor-model-me';
import { getFilenameForApiItem } from './documenters/MarkdownDocumenterHelpers';
import { ModuleSource } from '@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

export interface ITocGenerationOptions {
  apiModel: ApiModel;
  g3Path: string;
  outputFolder: string;
  addFileNameSuffix: boolean;
  jsSdk: boolean;
}

interface ITocItem {
  title: string;
  path: string;
  section?: ITocItem[];
}

export function generateToc({
  apiModel,
  g3Path,
  outputFolder,
  addFileNameSuffix,
  jsSdk
}: ITocGenerationOptions) {
  const toc = [];

  if (jsSdk) {
    const firebaseToc: ITocItem = {
      title: 'firebase',
      path: `${g3Path}/index`,
      section: []
    };
    toc.push(firebaseToc);
  }

  generateTocRecursively(apiModel, g3Path, addFileNameSuffix, toc);

  writeFileSync(
    resolve(outputFolder, 'toc.yaml'),
    yaml.dump(
      { toc },
      {
        quotingType: '"'
      }
    )
  );
}

function generateTocRecursively(
  apiItem: ApiItem,
  g3Path: string,
  addFileNameSuffix: boolean,
  toc: ITocItem[]
) {
  if (apiItem.kind === ApiItemKind.EntryPoint) {
    // Entry point
    const entryPointName = (apiItem.canonicalReference
      .source! as ModuleSource).escapedPath.replace('@firebase/', '');
    const entryPointToc: ITocItem = {
      title: entryPointName,
      path: `${g3Path}/${getFilenameForApiItem(apiItem, addFileNameSuffix)}`,
      section: []
    };

    for (const member of apiItem.members) {
      // only classes and interfaces have dedicated pages
      if (
        member.kind === ApiItemKind.Class ||
        member.kind === ApiItemKind.Interface
      ) {
        const fileName = getFilenameForApiItem(member, addFileNameSuffix);
        entryPointToc.section!.push({
          title: member.displayName,
          path: `${g3Path}/${fileName}`
        });
      }
    }

    toc.push(entryPointToc);
  } else {
    // travel the api tree to find the next entry point
    for (const member of apiItem.members) {
      generateTocRecursively(member, g3Path, addFileNameSuffix, toc);
    }
  }
}
