import {
  canonifyPipeline as canonifyCorePipeline,
  pipelineEq as corePipelineEq,
  toCorePipeline
} from '../../src/core/pipeline-util';
import {
  PipelineInputOutput,
  runPipeline as runCorePipeline
} from '../../src/core/pipeline_run';
import { Constant } from '../../src/lite-api/expressions';
import { Pipeline as LitePipeline } from '../../src/lite-api/pipeline';
import { newUserDataReader } from '../../src/lite-api/user_data_reader';

import { firestore, newTestFirestore } from './api_helpers';
import { RealtimePipeline } from '../../src/api/realtime_pipeline';
import { Stage } from '../../src/lite-api/stage';
import { PipelineSource } from '../../src/lite-api/pipeline-source';
import { ExpUserDataWriter } from '../../src/api/user_data_writer';

export function canonifyPipeline(p: LitePipeline): string {
  return canonifyCorePipeline(toCorePipeline(p));
}

export function pipelineEq(p1: LitePipeline, p2: LitePipeline): boolean {
  return corePipelineEq(toCorePipeline(p1), toCorePipeline(p2));
}

export function runPipeline(
  p: LitePipeline,
  inputs: PipelineInputOutput[]
): PipelineInputOutput[] {
  return runCorePipeline(toCorePipeline(p), inputs);
}

const db = newTestFirestore();

export function constantArray(values: unknown[]): Constant {
  const result = new Constant(values);
  result._readUserData(newUserDataReader(db));
  return result;
}

export function constantMap(values: Record<string, unknown>): Constant {
  const result = new Constant(values);
  result._readUserData(newUserDataReader(db));
  return result;
}

export function pipelineFromStages(stages: Stage[]): RealtimePipeline {
  const db = firestore();
  return new RealtimePipeline(
    db,
    newUserDataReader(db),
    new ExpUserDataWriter(db),
    stages
  );
}
