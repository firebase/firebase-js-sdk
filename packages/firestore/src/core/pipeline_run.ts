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

import { CollectionSource, Pipeline, Stage, Where } from '../api';
import { MutableDocument } from '../model/document';
import { TRUE_VALUE, valueEquals } from '../model/values';
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

function evaluateCollection(
  context: EvaluationContext,
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
