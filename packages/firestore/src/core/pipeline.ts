// Copyright 2024 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {
  AddFields,
  Aggregate,
  CollectionGroupSource,
  CollectionSource,
  DatabaseSource,
  Distinct,
  DocumentsSource,
  Select,
  Stage
} from '../lite-api/stage';
import { ResourcePath } from '../model/path';
import { JsonProtoSerializer } from '../remote/serializer';
import { debugAssert } from '../util/assert';

import { PipelineFlavor, PipelineSourceType } from './pipeline-util';

export class CorePipeline {
  isCorePipeline = true;
  constructor(
    readonly serializer: JsonProtoSerializer,
    readonly stages: Stage[]
  ) {}
  getPipelineCollection(): string | undefined {
    return getPipelineCollection(this);
  }
  getPipelineCollectionGroup(): string | undefined {
    return getPipelineCollectionGroup(this);
  }
  getPipelineCollectionId(): string | undefined {
    return getPipelineCollectionId(this);
  }
  getPipelineDocuments(): string[] | undefined {
    return getPipelineDocuments(this);
  }
  getPipelineFlavor(): PipelineFlavor {
    return getPipelineFlavor(this);
  }
  getPipelineSourceType(): PipelineSourceType | 'unknown' {
    return getPipelineSourceType(this);
  }
}

export function getPipelineSourceType(
  p: CorePipeline
): PipelineSourceType | 'unknown' {
  debugAssert(p.stages.length > 0, 'Pipeline must have at least one stage');
  const source = p.stages[0];

  if (
    source instanceof CollectionSource ||
    source instanceof CollectionGroupSource ||
    source instanceof DatabaseSource ||
    source instanceof DocumentsSource
  ) {
    return source.name as PipelineSourceType;
  }

  return 'unknown';
}

export function getPipelineCollection(p: CorePipeline): string | undefined {
  if (getPipelineSourceType(p) === 'collection') {
    return (p.stages[0] as CollectionSource).collectionPath;
  }
  return undefined;
}

export function getPipelineCollectionGroup(
  p: CorePipeline
): string | undefined {
  if (getPipelineSourceType(p) === 'collection_group') {
    return (p.stages[0] as CollectionGroupSource).collectionId;
  }
  return undefined;
}

export function getPipelineCollectionId(p: CorePipeline): string | undefined {
  switch (getPipelineSourceType(p)) {
    case 'collection':
      return ResourcePath.fromString(getPipelineCollection(p)!).lastSegment();
    case 'collection_group':
      return getPipelineCollectionGroup(p);
    default:
      return undefined;
  }
}

export function getPipelineDocuments(p: CorePipeline): string[] | undefined {
  if (getPipelineSourceType(p) === 'documents') {
    return (p.stages[0] as DocumentsSource).docPaths;
  }
  return undefined;
}

export function getPipelineFlavor(p: CorePipeline): PipelineFlavor {
  let flavor: PipelineFlavor = 'exact';
  p.stages.forEach((stage, index) => {
    if (stage.name === Distinct.name || stage.name === Aggregate.name) {
      flavor = 'keyless';
    }
    if (stage.name === Select.name && flavor === 'exact') {
      flavor = 'augmented';
    }
    // TODO(pipeline): verify the last stage is addFields, and it is added by the SDK.
    if (
      stage.name === AddFields.name &&
      index < p.stages.length - 1 &&
      flavor === 'exact'
    ) {
      flavor = 'augmented';
    }
  });

  return flavor;
}
