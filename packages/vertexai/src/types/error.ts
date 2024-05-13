/**
 * Details object that may be included in an error response.
 *
 * @public
 */
export interface ErrorDetails {
  '@type'?: string;

  /** The reason for the error. */
  reason?: string;

  /** The domain where the error occured. */
  domain?: string;

  /** Additonal metadata about the error. */
  metadata?: Record<string, unknown>;

  /** Any other relevant information about the error. */
  [key: string]: unknown;
}

/**
 * Standardized error codes that {@link VertexAIError} can have.
 *
 * @public
 */
export const enum VertexAIErrorCode {
  /** A generic error occured. */
  ERROR = 'error',

  /** An error occurred in a request. */
  REQUEST_ERROR = 'request-error',

  /** An error occured in a response. */
  RESPONSE_ERROR = 'response-error',

  /** An error occurred while performing a fetch. */
  FETCH_ERROR = 'fetch-error',

  /** An error associated with a Content object.  */
  INVALID_CONTENT = 'invalid-content',

  /** An error occured due to a missing api key. */
  NO_API_KEY = 'no-api-key',

  /** An error occurred due to a missing model. */
  NO_MODEL = 'no-model',

  /** An error occured due to a missing project id. */
  NO_PROJECT_ID = 'no-project-id',

  /** An error occured while parsing. */
  PARSE_FAILED = 'parse-failed'
}

export { VertexAIError } from '../errors';