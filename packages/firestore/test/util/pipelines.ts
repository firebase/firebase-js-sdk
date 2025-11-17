import { RealtimePipeline } from '../../src/api/realtime_pipeline';
import { ExpUserDataWriter } from '../../src/api/user_data_writer';
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
import { Stage } from '../../src/lite-api/stage';
import {
  newUserDataReader,
  UserDataSource
} from '../../src/lite-api/user_data_reader';

import { firestore } from './api_helpers';
import { testUserDataReader } from './helpers';

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

export function constantArray(...values: unknown[]): Constant {
  const constant = new Constant(values, 'constantArray');
  constant._readUserData(
    testUserDataReader(false).createContext(
      UserDataSource.ArrayArgument,
      'constantArray'
    )
  );
  return constant;
}

export function constantMap(values: Record<string, unknown>): Constant {
  const constant = new Constant(values, 'constantMap');
  constant._readUserData(
    testUserDataReader(false).createContext(
      UserDataSource.Argument,
      'constantMap'
    )
  );
  return constant;
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
