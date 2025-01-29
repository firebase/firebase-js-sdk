import { Pipeline as LitePipeline } from '../../src/lite-api/pipeline';
import {
  canonifyPipeline as canonifyCorePipeline,
  pipelineEq as corePipelineEq
} from '../../src/core/pipeline-util';
import {
  CorePipeline,
  PipelineInputOutput,
  runPipeline as runCorePipeline
} from '../../src/core/pipeline_run';

export function toCorePipeline(p: LitePipeline): CorePipeline {
  return new CorePipeline(p.userDataReader.serializer, p.stages);
}

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
