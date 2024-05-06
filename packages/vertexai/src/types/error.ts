import { FirebaseError } from "@firebase/util";

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


/**
 * Error class for the Firebase VertexAI SDK.
 *
 * @public
 */
export class VertexAIError extends FirebaseError {
  /**
   * Stack trace of the error.
   */
  readonly stack?: string;

  /**
   * Creates a new VertexAIError instance.
   *
   * @param code - The error code from {@link VertexAIErrorCode}.
   * @param message - A human-readable message describing the error.
   * @param status - Optional HTTP status code of the error response.
   * @param statusText - Optional HTTP status text of the error response.
   * @param errorDetails - Optional additional details about the error.
   */
  constructor(
    readonly code: VertexAIErrorCode,
    readonly message: string,
    readonly status?: number,
    readonly statusText?: string,
    readonly errorDetails?: ErrorDetails[]
  ) {
    // Match error format used by FirebaseError from ErrorFactory
    const service = 'vertex-ai';
    const serviceName = 'VertexAI';
    const fullCode = `${service}/${code}`;
    const fullMessage = `${serviceName}: ${message} (${fullCode})`;
    super(fullCode, fullMessage);
    
    // FirebaseError initializes a stack trace, but it assumes the error is created from the error
    // factory. Since we break this assumption, we set the stack trace to be originating from this
    // constructor.
    // This is only supported in V8.
    if (Error.captureStackTrace) {
        // Allows us to initialize the stack trace without including the constructor itself at the
        // top level of the stack trace.
        Error.captureStackTrace(this, VertexAIError);
    }
    
    // Allows instanceof VertexAIError in ES5/ES6
    // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
    Object.setPrototypeOf(this, VertexAIError.prototype);

    // Since Error is an interface, we don't inherit toString and so we define it ourselves.
    this.toString = () => fullMessage;
  }
}