/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { SingleRequestOptions, AIErrorCode, ErrorDetails } from '../types';
import { AIError } from '../errors';
import { ApiSettings } from '../types/internal';
import {
  DEFAULT_DOMAIN,
  DEFAULT_FETCH_TIMEOUT_MS,
  HYBRID_TAG,
  LANGUAGE_TAG,
  PACKAGE_VERSION
} from '../constants';
import { logger } from '../logger';
import { BackendType, InferenceMode } from '../public-types';

export const TIMEOUT_EXPIRED_MESSAGE = 'Timeout has expired.';
export const ABORT_ERROR_NAME = 'AbortError';

export const enum Task {
  GENERATE_CONTENT = 'generateContent',
  STREAM_GENERATE_CONTENT = 'streamGenerateContent',
  COUNT_TOKENS = 'countTokens',
  PREDICT = 'predict'
}

export const enum ServerPromptTemplateTask {
  TEMPLATE_GENERATE_CONTENT = 'templateGenerateContent',
  TEMPLATE_STREAM_GENERATE_CONTENT = 'templateStreamGenerateContent',
  TEMPLATE_PREDICT = 'templatePredict'
}

interface BaseRequestURLParams {
  apiSettings: ApiSettings;
  stream: boolean;
  singleRequestOptions?: SingleRequestOptions;
}

/**
 * Parameters used to construct the URL of a request to use a model.
 */
interface ModelRequestURLParams extends BaseRequestURLParams {
  task: Task;
  model: string;
  templateId?: never;
}

/**
 * Parameters used to construct the URL of a request to use server side prompt templates.
 */
interface TemplateRequestURLParams extends BaseRequestURLParams {
  task: ServerPromptTemplateTask;
  templateId: string;
  model?: never;
}

export class RequestURL {
  constructor(
    public readonly params: ModelRequestURLParams | TemplateRequestURLParams
  ) {}

  toString(): string {
    const url = new URL(this.baseUrl); // Throws if the URL is invalid
    url.pathname = this.pathname;
    url.search = this.queryParams.toString();
    return url.toString();
  }

  private get pathname(): string {
    // We need to construct a different URL if the request is for server side prompt templates,
    // since the URL patterns are different. Server side prompt templates expect a templateId
    // instead of a model name.
    if (this.params.templateId) {
      return `${this.params.apiSettings.backend._getTemplatePath(
        this.params.apiSettings.project,
        this.params.templateId
      )}:${this.params.task}`;
    } else {
      return `${this.params.apiSettings.backend._getModelPath(
        this.params.apiSettings.project,
        (this.params as ModelRequestURLParams).model
      )}:${this.params.task}`;
    }
  }

  private get baseUrl(): string {
    return (
      this.params.singleRequestOptions?.baseUrl ?? `https://${DEFAULT_DOMAIN}`
    );
  }

  private get queryParams(): URLSearchParams {
    const params = new URLSearchParams();
    if (this.params.stream) {
      params.set('alt', 'sse');
    }

    return params;
  }
}

export class WebSocketUrl {
  constructor(public apiSettings: ApiSettings) {}
  toString(): string {
    const url = new URL(`wss://${DEFAULT_DOMAIN}`);
    url.pathname = this.pathname;

    const queryParams = new URLSearchParams();
    queryParams.set('key', this.apiSettings.apiKey);
    url.search = queryParams.toString();

    return url.toString();
  }

  private get pathname(): string {
    if (this.apiSettings.backend.backendType === BackendType.GOOGLE_AI) {
      return 'ws/google.firebase.vertexai.v1beta.GenerativeService/BidiGenerateContent';
    } else {
      return `ws/google.firebase.vertexai.v1beta.LlmBidiService/BidiGenerateContent/locations/${this.apiSettings.location}`;
    }
  }
}

/**
 * Log language and "fire/version" to x-goog-api-client
 */
function getClientHeaders(url: RequestURL): string {
  const loggingTags = [];
  loggingTags.push(`${LANGUAGE_TAG}/${PACKAGE_VERSION}`);
  loggingTags.push(`fire/${PACKAGE_VERSION}`);
  /**
   * No call would be made if ONLY_ON_DEVICE.
   * ONLY_IN_CLOUD does not indicate an intention to use hybrid.
   */
  if (
    url.params.apiSettings.inferenceMode === InferenceMode.PREFER_ON_DEVICE ||
    url.params.apiSettings.inferenceMode === InferenceMode.PREFER_IN_CLOUD
  ) {
    // No version
    loggingTags.push(HYBRID_TAG);
  }
  return loggingTags.join(' ');
}

export async function getHeaders(url: RequestURL): Promise<Headers> {
  const headers = new Headers();
  headers.append('Content-Type', 'application/json');
  headers.append('x-goog-api-client', getClientHeaders(url));
  headers.append('x-goog-api-key', url.params.apiSettings.apiKey);
  if (url.params.apiSettings.automaticDataCollectionEnabled) {
    headers.append('X-Firebase-Appid', url.params.apiSettings.appId);
  }
  if (url.params.apiSettings.getAppCheckToken) {
    const appCheckToken = await url.params.apiSettings.getAppCheckToken();
    if (appCheckToken) {
      headers.append('X-Firebase-AppCheck', appCheckToken.token);
      if (appCheckToken.error) {
        logger.warn(
          `Unable to obtain a valid App Check token: ${appCheckToken.error.message}`
        );
      }
    }
  }

  if (url.params.apiSettings.getAuthToken) {
    const authToken = await url.params.apiSettings.getAuthToken();
    if (authToken) {
      headers.append('Authorization', `Firebase ${authToken.accessToken}`);
    }
  }

  return headers;
}

export async function makeRequest(
  requestUrlParams: TemplateRequestURLParams | ModelRequestURLParams,
  body: string
): Promise<Response> {
  const url = new RequestURL(requestUrlParams);
  let response;

  const externalSignal = requestUrlParams.singleRequestOptions?.signal;
  const timeoutMillis =
    requestUrlParams.singleRequestOptions?.timeout != null &&
    requestUrlParams.singleRequestOptions.timeout >= 0
      ? requestUrlParams.singleRequestOptions.timeout
      : DEFAULT_FETCH_TIMEOUT_MS;

  const internalAbortController = new AbortController();
  const fetchTimeoutId = setTimeout(() => {
    internalAbortController.abort(
      new DOMException(TIMEOUT_EXPIRED_MESSAGE, ABORT_ERROR_NAME)
    );
    logger.debug(
      `Aborting request to ${url} due to timeout (${timeoutMillis}ms)`
    );
  }, timeoutMillis);

  // Used to abort the fetch if either the user-defined `externalSignal` is aborted, or if the
  // internal signal (triggered by timeouts) is aborted.
  const combinedSignal = AbortSignal.any(
    externalSignal
      ? [externalSignal, internalAbortController.signal]
      : [internalAbortController.signal]
  );

  if (externalSignal && externalSignal.aborted) {
    clearTimeout(fetchTimeoutId);
    throw new DOMException(
      externalSignal.reason ?? 'Aborted externally before fetch',
      ABORT_ERROR_NAME
    );
  }

  try {
    const fetchOptions: RequestInit = {
      method: 'POST',
      headers: await getHeaders(url),
      signal: combinedSignal,
      body
    };

    response = await fetch(url.toString(), fetchOptions);
    if (!response.ok) {
      let message = '';
      let errorDetails;
      try {
        const json = await response.json();
        message = json.error.message;
        if (json.error.details) {
          message += ` ${JSON.stringify(json.error.details)}`;
          errorDetails = json.error.details;
        }
      } catch (e) {
        // ignored
      }
      if (
        response.status === 403 &&
        errorDetails &&
        errorDetails.some(
          (detail: ErrorDetails) => detail.reason === 'SERVICE_DISABLED'
        ) &&
        errorDetails.some((detail: ErrorDetails) =>
          (
            detail.links as Array<Record<string, string>>
          )?.[0]?.description.includes(
            'Google developers console API activation'
          )
        )
      ) {
        throw new AIError(
          AIErrorCode.API_NOT_ENABLED,
          `The Firebase AI SDK requires the Firebase AI ` +
            `API ('firebasevertexai.googleapis.com') to be enabled in your ` +
            `Firebase project. Enable this API by visiting the Firebase Console ` +
            `at https://console.firebase.google.com/project/${url.params.apiSettings.project}/ailogic/ ` +
            `and clicking "Get started". If you enabled this API recently, ` +
            `wait a few minutes for the action to propagate to our systems and ` +
            `then retry.`,
          {
            status: response.status,
            statusText: response.statusText,
            errorDetails
          }
        );
      }
      throw new AIError(
        AIErrorCode.FETCH_ERROR,
        `Error fetching from ${url}: [${response.status} ${response.statusText}] ${message}`,
        {
          status: response.status,
          statusText: response.statusText,
          errorDetails
        }
      );
    }
  } catch (e) {
    let err = e as Error;
    if (
      (e as AIError).code !== AIErrorCode.FETCH_ERROR &&
      (e as AIError).code !== AIErrorCode.API_NOT_ENABLED &&
      e instanceof Error &&
      (e as DOMException).name !== ABORT_ERROR_NAME
    ) {
      err = new AIError(
        AIErrorCode.ERROR,
        `Error fetching from ${url.toString()}: ${e.message}`
      );
      err.stack = e.stack;
    }

    throw err;
  } finally {
    // When doing streaming requests, this will clear the timeout once the stream begins.
    // If a timeout it 3000ms, and the stream starts after 300ms and ends after 5000ms, the
    // timeout will be cleared after 300ms, so it won't abort the request.
    clearTimeout(fetchTimeoutId);
  }
  return response;
}
