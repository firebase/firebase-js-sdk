import { Pipeline as ApiPipeline } from '../../src';
import {
  canonifyPipeline as canonifyCorePipeline,
  pipelineEq as corePipelineEq
} from '../../src/core/pipeline-util';
import {
  CorePipeline,
  PipelineInputOutput,
  runPipeline as runCorePipeline
} from '../../src/core/pipeline_run';

export function toCorePipeline(p: ApiPipeline): CorePipeline {
  return new CorePipeline(p.userDataReader.serializer, p.stages);
}

export function canonifyPipeline(p: ApiPipeline): string {
  return canonifyCorePipeline(toCorePipeline(p));
}

export function pipelineEq(p1: ApiPipeline, p2: ApiPipeline): boolean {
  return corePipelineEq(toCorePipeline(p1), toCorePipeline(p2));
}

export function runPipeline(
  p: ApiPipeline,
  inputs: PipelineInputOutput[]
): PipelineInputOutput[] {
  return runCorePipeline(toCorePipeline(p), inputs);
}
