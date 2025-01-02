import { Pipeline as ApiPipeline } from '../../lite/index';
import {
  canonifyPipeline as canonifyCorePipeline,
  pipelineEq as corePipelineEq,
  toCorePipeline
} from '../../src/core/pipeline-util';
import {
  PipelineInputOutput,
  runPipeline as runCorePipeline
} from '../../src/core/pipeline_run';

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
