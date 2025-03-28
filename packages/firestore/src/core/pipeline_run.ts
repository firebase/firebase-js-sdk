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

import { FirestoreError } from '../api';
import { Field, Ordering } from '../lite-api/expressions';
import {
  CollectionGroupSource,
  CollectionSource,
  DatabaseSource,
  DocumentsSource,
  Limit,
  Offset,
  Sort,
  Stage,
  Where
} from '../lite-api/stage';
import { Document, MutableDocument } from '../model/document';
import { DOCUMENT_KEY_NAME } from '../model/path';
import {
  MIN_VALUE,
  TRUE_VALUE,
  valueCompare,
  valueEquals
} from '../model/values';
import { JsonProtoSerializer } from '../remote/serializer';
import { Code } from '../util/error';

import { toEvaluable } from './expressions';
import { isPipeline, QueryOrPipeline } from './pipeline-util';
import { queryMatches } from './query';

export class CorePipeline {
  constructor(
    readonly serializer: JsonProtoSerializer,
    readonly stages: Stage[]
  ) {}
}

export type PipelineInputOutput = MutableDocument;

export interface EvaluationContext {
  serializer: JsonProtoSerializer;
}

export function runPipeline(
  pipeline: CorePipeline,
  input: PipelineInputOutput[]
): PipelineInputOutput[] {
  let current = input;
  for (const stage of pipeline.stages) {
    current = evaluate({ serializer: pipeline.serializer }, stage, current);
  }

  return current;
}

export function pipelineMatches(
  pipeline: CorePipeline,
  data: PipelineInputOutput
): boolean {
  // TODO(pipeline): this is not true for aggregations, and we need to examine if there are other
  // stages that will not work this way.
  return runPipeline(pipeline, [data]).length > 0;
}

export function queryOrPipelineMatches(
  query: QueryOrPipeline,
  data: PipelineInputOutput
): boolean {
  return isPipeline(query)
    ? pipelineMatches(query, data)
    : queryMatches(query, data);
}

export function pipelineMatchesAllDocuments(pipeline: CorePipeline): boolean {
  for (const stage of pipeline.stages) {
    if (stage instanceof Limit || stage instanceof Offset) {
      return false;
    }
    if (stage instanceof Where) {
      if (
        stage.condition.name === 'exists' &&
        stage.condition.params[0] instanceof Field &&
        stage.condition.params[0].fieldName() === DOCUMENT_KEY_NAME
      ) {
        continue;
      }
      return false;
    }
  }

  return true;
}

function evaluate(
  context: EvaluationContext,
  stage: Stage,
  input: PipelineInputOutput[]
): PipelineInputOutput[] {
  if (stage instanceof CollectionSource) {
    return evaluateCollection(context, stage, input);
  } else if (stage instanceof Where) {
    return evaluateWhere(context, stage, input);
  } /*else if (stage instanceof AddFields) {
    return evaluateAddFields(context, stage, input);
  } else if (stage instanceof Aggregate) {
    return evaluateAggregate(context, stage, input);
  } else if (stage instanceof Distinct) {
    return evaluateDistinct(context, stage, input);
  } */ else if (stage instanceof CollectionGroupSource) {
    return evaluateCollectionGroup(context, stage, input);
  } else if (stage instanceof DatabaseSource) {
    return evaluateDatabase(context, stage, input);
  } else if (stage instanceof DocumentsSource) {
    return evaluateDocuments(context, stage, input);
  } /* else if (stage instanceof FindNearest) {
    return evaluateFindNearest(context, stage, input);
  } */ else if (stage instanceof Limit) {
    return evaluateLimit(context, stage, input);
  } else if (stage instanceof Offset) {
    return evaluateOffset(context, stage, input);
  } /* else if (stage instanceof Select) {
    return evaluateSelect(context, stage, input);
  }*/ else if (stage instanceof Sort) {
    return evaluateSort(context, stage, input);
  }

  throw new Error(`Unknown stage: ${stage.name}`);
}

function evaluateWhere(
  context: EvaluationContext,
  where: Where,
  input: PipelineInputOutput[]
): PipelineInputOutput[] {
  return input.filter(value => {
    const result = toEvaluable(where.condition).evaluate(context, value);
    return result === undefined ? false : valueEquals(result, TRUE_VALUE);
  });
}

function evaluateLimit(
  context: EvaluationContext,
  stage: Limit,
  input: PipelineInputOutput[]
): PipelineInputOutput[] {
  return input.slice(0, stage.limit);
}

function evaluateOffset(
  context: EvaluationContext,
  stage: Offset,
  input: PipelineInputOutput[]
): PipelineInputOutput[] {
  return input.slice(stage.offset);
}

function evaluateSort(
  context: EvaluationContext,
  stage: Sort,
  input: PipelineInputOutput[]
): PipelineInputOutput[] {
  return input.sort((left, right): number => {
    // Evaluate expressions in stage.orderings against left and right, and use them to compare
    // the documents
    for (const ordering of stage.orders) {
      const leftValue = toEvaluable(ordering.expr).evaluate(context, left);
      const rightValue = toEvaluable(ordering.expr).evaluate(context, right);

      const comparison = valueCompare(
        leftValue ?? MIN_VALUE,
        rightValue ?? MIN_VALUE
      );
      if (comparison !== 0) {
        // Return the comparison result if documents are not equal
        return ordering.direction === 'ascending' ? comparison : -comparison;
      }
    }

    return 0;
  });
}

function evaluateCollection(
  _: EvaluationContext,
  coll: CollectionSource,
  inputs: PipelineInputOutput[]
): PipelineInputOutput[] {
  return inputs.filter(input => {
    return (
      input.isFoundDocument() &&
      `/${input.key.getCollectionPath().canonicalString()}` ===
        coll.collectionPath
    );
  });
}

function evaluateCollectionGroup(
  context: EvaluationContext,
  stage: CollectionGroupSource,
  input: PipelineInputOutput[]
): PipelineInputOutput[] {
  // return those records in input whose collection id is stage.collectionId
  return input.filter(input => {
    return (
      input.isFoundDocument() &&
      input.key.getCollectionPath().lastSegment() === stage.collectionId
    );
  });
}

function evaluateDatabase(
  context: EvaluationContext,
  stage: DatabaseSource,
  input: PipelineInputOutput[]
): PipelineInputOutput[] {
  return input.filter(input => input.isFoundDocument());
}

function evaluateDocuments(
  context: EvaluationContext,
  stage: DocumentsSource,
  input: PipelineInputOutput[]
): PipelineInputOutput[] {
  if (stage.docPaths.length === 0) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      'Empty document paths are not allowed in DocumentsSource'
    );
  }
  if (stage.docPaths) {
    const uniqueDocPaths = new Set(stage.docPaths);
    if (uniqueDocPaths.size !== stage.docPaths.length) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'Duplicate document paths are not allowed in DocumentsSource'
      );
    }
  }

  return input.filter(input => {
    return (
      input.isFoundDocument() &&
      stage.docPaths.includes(input.key.path.toStringWithLeadingSlash())
    );
  });
}

export function newPipelineComparator(
  pipeline: CorePipeline
): (d1: Document, d2: Document) => number {
  const orderings = lastEffectiveSort(pipeline);
  return (d1: Document, d2: Document): number => {
    for (const ordering of orderings) {
      const leftValue = toEvaluable(ordering.expr).evaluate(
        { serializer: pipeline.serializer },
        d1 as MutableDocument
      );
      const rightValue = toEvaluable(ordering.expr).evaluate(
        { serializer: pipeline.serializer },
        d2 as MutableDocument
      );
      const comparison = valueCompare(
        leftValue || MIN_VALUE,
        rightValue || MIN_VALUE
      );
      if (comparison !== 0) {
        return ordering.direction === 'ascending' ? comparison : -comparison;
      }
    }
    return 0;
  };
}

function lastEffectiveSort(pipeline: CorePipeline): Ordering[] {
  // return the last sort stage, throws exception if it doesn't exist
  // TODO(pipeline): this implementation is wrong, there are stages that can invalidate
  // the orderings later. The proper way to manipulate the pipeline so that last Sort
  // always has effects.
  for (let i = pipeline.stages.length - 1; i >= 0; i--) {
    const stage = pipeline.stages[i];
    if (stage instanceof Sort) {
      return stage.orders;
    }
  }
  throw new Error('Pipeline must contain at least one Sort stage');
}

export function getLastEffectiveLimit(
  pipeline: CorePipeline
): { limit: number; convertedFromLimitToLast: boolean } | undefined {
  // TODO(pipeline): this implementation is wrong, there are stages that can change
  // the limit later (findNearest).
  for (let i = pipeline.stages.length - 1; i >= 0; i--) {
    const stage = pipeline.stages[i];
    if (stage instanceof Limit) {
      return {
        limit: stage.limit,
        convertedFromLimitToLast: stage.convertedFromLimitTolast
      };
    }
  }
  return undefined;
}
