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
import { ApiItem, ApiItemKind, ApiModel } from '@microsoft/api-extractor-model';
import {
  getFilenameForApiItem,
  TOC_TITLE_MAPPINGS
} from './documenters/MarkdownDocumenterHelpers';
import { ModuleSource } from '@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

export interface ITocGenerationOptions {
  apiModel: ApiModel;
  g3Path: string;
  outputFolder: string;
  addFileNameSuffix: boolean;
  jsSdk: boolean;
  filenameMappings?: Record<string, string>;
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
  jsSdk,
  filenameMappings = {}
}: ITocGenerationOptions) {
  const toc = [];

  if (jsSdk) {
    const firebaseToc: ITocItem = {
      title: 'firebase',
      path: `${g3Path}/index`
    };
    toc.push(firebaseToc);
  }

  generateTocRecursively(
    apiModel,
    g3Path,
    addFileNameSuffix,
    toc,
    filenameMappings
  );

  writeFileSync(
    resolve(outputFolder, 'toc.yaml'),
    yaml.dump(
      { toc },
      {
        quotingType: '"',
        noArrayIndent: true
      }
    )
  );
}

function generateTocRecursively(
  apiItem: ApiItem,
  g3Path: string,
  addFileNameSuffix: boolean,
  toc: ITocItem[],
  filenameMappings: Record<string, string> = {}
) {
  // generate toc item only for entry points
  if (apiItem.kind === ApiItemKind.EntryPoint) {
    // Entry point
    const entryPointName = (
      apiItem.canonicalReference.source! as ModuleSource
    ).escapedPath.replace('@firebase/', '');
    const entryPointToc: ITocItem = {
      title: TOC_TITLE_MAPPINGS[entryPointName] || entryPointName,
      path: `${g3Path}/${getFilenameForApiItem(
        apiItem,
        addFileNameSuffix,
        filenameMappings
      )}`,
      section: []
    };

    for (const member of apiItem.members) {
      // only classes and interfaces have dedicated pages
      if (
        member.kind === ApiItemKind.Class ||
        member.kind === ApiItemKind.Interface
      ) {
        const fileName = getFilenameForApiItem(
          member,
          addFileNameSuffix,
          filenameMappings
        );
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
      generateTocRecursively(
        member,
        g3Path,
        addFileNameSuffix,
        toc,
        filenameMappings
      );
    }
  }
}
