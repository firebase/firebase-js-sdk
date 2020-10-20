/**
 * @license
 * Copyright 2019 Google LLC
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

import { FirebaseInstallations } from '@firebase/installations-types';
import {
  FetchResponse,
  RemoteConfigFetchClient,
  FirebaseRemoteConfigObject,
  FetchRequest
} from './remote_config_fetch_client';
import { ERROR_FACTORY, ErrorCode } from '../errors';
import { getUserLanguage } from '../language';

/**
 * Defines request body parameters required to call the fetch API:
 * https://firebase.google.com/docs/reference/remote-config/rest
 *
 * <p>Not exported because this file encapsulates REST API specifics.
 *
 * <p>Not passing User Properties because Analytics' source of truth on Web is server-side.
 */
interface FetchRequestBody {
  // Disables camelcase linting for request body params.
  /* eslint-disable camelcase*/
  sdk_version: string;
  app_instance_id: string;
  app_instance_id_token: string;
  app_id: string;
  language_code: string;
  /* eslint-enable camelcase */
}

/**
 * Implements the Client abstraction for the Remote Config REST API.
 */
export class RestClient implements RemoteConfigFetchClient {
  constructor(
    private readonly firebaseInstallations: FirebaseInstallations,
    private readonly sdkVersion: string,
    private readonly namespace: string,
    private readonly projectId: string,
    private readonly apiKey: string,
    private readonly appId: string
  ) {}

  /**
   * Fetches from the Remote Config REST API.
   *
   * @throws a {@link ErrorCode.FETCH_NETWORK} error if {@link GlobalFetch#fetch} can't
   * connect to the network.
   * @throws a {@link ErrorCode.FETCH_PARSE} error if {@link Response#json} can't parse the
   * fetch response.
   * @throws a {@link ErrorCode.FETCH_STATUS} error if the service returns an HTTP error status.
   */
  async fetch(request: FetchRequest): Promise<FetchResponse> {
    const [installationId, installationToken] = await Promise.all([
      this.firebaseInstallations.getId(),
      this.firebaseInstallations.getToken()
    ]);

    const urlBase =
      window.FIREBASE_REMOTE_CONFIG_URL_BASE ||
      'https://firebaseremoteconfig.googleapis.com';

    const url = `${urlBase}/v1/projects/${this.projectId}/namespaces/${this.namespace}:fetch?key=${this.apiKey}`;

    const headers = {
      'Content-Type': 'application/json',
      'Content-Encoding': 'gzip',
      // Deviates from pure decorator by not passing max-age header since we don't currently have
      // service behavior using that header.
      'If-None-Match': request.eTag || '*'
    };

    const requestBody: FetchRequestBody = {
      /* eslint-disable camelcase */
      sdk_version: this.sdkVersion,
      app_instance_id: installationId,
      app_instance_id_token: installationToken,
      app_id: this.appId,
      language_code: getUserLanguage()
      /* eslint-enable camelcase */
    };

    const options = {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    };

    // This logic isn't REST-specific, but shimming abort logic isn't worth another decorator.
    const fetchPromise = fetch(url, options);
    const timeoutPromise = new Promise((_resolve, reject) => {
      // Maps async event listener to Promise API.
      request.signal.addEventListener(() => {
        // Emulates https://heycam.github.io/webidl/#aborterror
        const error = new Error('The operation was aborted.');
        error.name = 'AbortError';
        reject(error);
      });
    });

    let response;
    try {
      await Promise.race([fetchPromise, timeoutPromise]);
      response = await fetchPromise;
    } catch (originalError) {
      let errorCode = ErrorCode.FETCH_NETWORK;
      if (originalError.name === 'AbortError') {
        errorCode = ErrorCode.FETCH_TIMEOUT;
      }
      throw ERROR_FACTORY.create(errorCode, {
        originalErrorMessage: originalError.message
      });
    }

    let status = response.status;

    // Normalizes nullable header to optional.
    const responseEtag = response.headers.get('ETag') || undefined;

    let config: FirebaseRemoteConfigObject | undefined;
    let state: string | undefined;

    // JSON parsing throws SyntaxError if the response body isn't a JSON string.
    // Requesting application/json and checking for a 200 ensures there's JSON data.
    if (response.status === 200) {
      let responseBody;
      try {
        responseBody = await response.json();
      } catch (originalError) {
        throw ERROR_FACTORY.create(ErrorCode.FETCH_PARSE, {
          originalErrorMessage: originalError.message
        });
      }
      config = responseBody['entries'];
      state = responseBody['state'];
    }

    // Normalizes based on legacy state.
    if (state === 'INSTANCE_STATE_UNSPECIFIED') {
      status = 500;
    } else if (state === 'NO_CHANGE') {
      status = 304;
    } else if (state === 'NO_TEMPLATE' || state === 'EMPTY_CONFIG') {
      // These cases can be fixed remotely, so normalize to safe value.
      config = {};
    }

    // Normalize to exception-based control flow for non-success cases.
    // Encapsulates HTTP specifics in this class as much as possible. Status is still the best for
    // differentiating success states (200 from 304; the state body param is undefined in a
    // standard 304).
    if (status !== 304 && status !== 200) {
      throw ERROR_FACTORY.create(ErrorCode.FETCH_STATUS, {
        httpStatus: status
      });
    }

    return { status, eTag: responseEtag, config };
  }
}
