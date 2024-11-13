import { Pipeline } from './pipeline';
import { PipelineResult } from './pipeline-result';

/**
 * Modular API for console experimentation.
 * @param pipeline Execute this pipeline.
 * @beta
 */
export function execute<AppModelType>(
  pipeline: Pipeline<AppModelType>
): Promise<Array<PipelineResult<AppModelType>>> {
  return pipeline.execute();
}
