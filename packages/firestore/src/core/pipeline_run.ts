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
  CollectionGroupSource,
  CollectionSource,
  DatabaseSource,
  DocumentsSource,
  Limit,
  Offset,
  Pipeline,
  Sort,
  Stage,
  Where
} from '../api';
import { MutableDocument } from '../model/document';
import {
  MIN_VALUE,
  TRUE_VALUE,
  valueCompare,
  valueEquals
} from '../model/values';
import { toEvaluable } from './expressions';
import { UserDataReader } from '../lite-api/user_data_reader';

export type PipelineInputOutput = MutableDocument;

export interface EvaluationContext {
  userDataReader: UserDataReader;
}
export function runPipeline(
  pipeline: Pipeline,
  input: Array<PipelineInputOutput>
): Array<PipelineInputOutput> {
  let current = input;
  for (const stage of pipeline.stages) {
    current = evaluate(
      { userDataReader: pipeline.userDataReader },
      stage,
      current
    );
  }

  return current;
}

function evaluate(
  context: EvaluationContext,
  stage: Stage,
  input: Array<PipelineInputOutput>
): Array<PipelineInputOutput> {
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
  input: Array<PipelineInputOutput>
): Array<PipelineInputOutput> {
  return input.filter(value => {
    const result = toEvaluable(where.condition).evaluate(context, value);
    return result === undefined ? false : valueEquals(result, TRUE_VALUE);
  });
}

function evaluateLimit(
  context: EvaluationContext,
  stage: Limit,
  input: Array<PipelineInputOutput>
): Array<PipelineInputOutput> {
  return input.slice(0, stage.limit);
}

function evaluateOffset(
  context: EvaluationContext,
  stage: Offset,
  input: Array<PipelineInputOutput>
): Array<PipelineInputOutput> {
  return input.slice(stage.offset);
}

function evaluateSort(
  context: EvaluationContext,
  stage: Sort,
  input: Array<PipelineInputOutput>
): Array<PipelineInputOutput> {
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
  inputs: Array<PipelineInputOutput>
): Array<PipelineInputOutput> {
  return inputs.filter(input => {
    return (
      `/${input.key.getCollectionPath().canonicalString()}` ===
      coll.collectionPath
    );
  });
}

function evaluateCollectionGroup(
  context: EvaluationContext,
  stage: CollectionGroupSource,
  input: Array<PipelineInputOutput>
): Array<PipelineInputOutput> {
  // return those records in input whose collection id is stage.collectionId
  return input.filter(input => {
    return input.key.getCollectionPath().lastSegment() === stage.collectionId;
  });
}

function evaluateDatabase(
  context: EvaluationContext,
  stage: DatabaseSource,
  input: Array<PipelineInputOutput>
): Array<PipelineInputOutput> {
  return input;
}

function evaluateDocuments(
  context: EvaluationContext,
  stage: DocumentsSource,
  input: Array<PipelineInputOutput>
): Array<PipelineInputOutput> {
  return input.filter(input => {
    return stage.docPaths.includes(input.key.path.canonicalString());
  });
}
