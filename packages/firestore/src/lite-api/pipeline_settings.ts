import type { Pipeline } from './pipeline';

/**
 * Options defining how a Pipeline is evaluated.
 */
export interface PipelineOptions {
  /**
   * Pipeline to be evaluated.
   */
  pipeline: Pipeline;

  /**
   * Specify the index mode.
   */
  indexMode?: 'recommended';

  /**
   * An escape hatch to set options not known at SDK build time. These values
   * will be passed directly to the Firestore backend and not used by the SDK.
   *
   * The generic option name will be used as provided. And must match the name
   * format used by the backend (hint: use a snake_case_name).
   *
   * Generic option values can be any type supported
   * by Firestore (for example: string, boolean, number, map, …). Value types
   * not known to the SDK will be rejected.
   *
   * Values specified in genericOptions will take precedence over any options
   * with the same name set by the SDK.
   *
   * Override the `example_option`:
   * ```
   *   execute({
   *     pipeline: myPipeline,
   *     genericOptions: {
   *       // Override `example_option`. This will not
   *       // merge with the existing `example_option` object.
   *       "example_option": {
   *         foo: "bar"
   *       }
   *     }
   *   }
   * ```
   *
   * `genericOptions` supports dot notation, if you want to override
   * a nested option.
   * ```
   *   execute({
   *     pipeline: myPipeline,
   *     genericOptions: {
   *       // Override `example_option.foo` and do not override
   *       // any other properties of `example_option`.
   *       "example_option.foo": "bar"
   *     }
   *   }
   * ```
   */
  genericOptions?: {
    [name: string]: unknown;
  };
}
