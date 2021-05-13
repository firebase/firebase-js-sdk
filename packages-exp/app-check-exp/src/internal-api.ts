/**
 * @license
 * Copyright 2020 Google LLC
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

import { FirebaseApp } from '@firebase/app-exp';
import { AppCheckTokenResult, AppCheckTokenListener } from './types';
import {
  AppCheckTokenInternal,
  getDebugState,
  getState,
  setState
} from './state';
import { TOKEN_REFRESH_TIME } from './constants';
import { Refresher } from './proactive-refresh';
import { ensureActivated } from './util';
import { exchangeToken, getExchangeDebugTokenRequest } from './client';
import { writeTokenToStorage, readTokenFromStorage } from './storage';
import { getDebugToken, isDebugMode } from './debug';
import { base64, issuedAtTime } from '@firebase/util';
import { logger } from './logger';
import { Provider } from '@firebase/component';
import { ReCaptchaV3ProviderImpl } from './providers';

// Initial hardcoded value agreed upon across platforms for initial launch.
// Format left open for possible dynamic error values and other fields in the future.
export const defaultTokenErrorData = { error: 'UNKNOWN_ERROR' };

/**
 * Stringify and base64 encode token error data.
 *
 * @param tokenError Error data, currently hardcoded.
 */
export function formatDummyToken(
  tokenErrorData: Record<string, string>
): string {
  return base64.encodeString(
    JSON.stringify(tokenErrorData),
    /* webSafe= */ false
  );
}

/**
 * This function will always resolve.
 * The result will contain an error field if there is any error.
 * In case there is an error, the token field in the result will be populated with a dummy value
 */
export async function getToken(
  app: FirebaseApp,
  platformLoggerProvider: Provider<'platform-logger'>,
  forceRefresh = false
): Promise<AppCheckTokenResult> {
  ensureActivated(app);
  /**
   * DEBUG MODE
   * return the debug token directly
   */
  if (isDebugMode()) {
    const tokenFromDebugExchange: AppCheckTokenInternal = await exchangeToken(
      getExchangeDebugTokenRequest(app, await getDebugToken()),
      platformLoggerProvider
    );
    return { token: tokenFromDebugExchange.token };
  }

  const state = getState(app);

  let token: AppCheckTokenInternal | undefined = state.token;
  let error: Error | undefined = undefined;

  /**
   * try to load token from indexedDB if it's the first time this function is called
   */
  if (!token) {
    // readTokenFromStorage() always resolves. In case of an error, it resolves with `undefined`.
    const cachedToken = await readTokenFromStorage(app);
    if (cachedToken && isValid(cachedToken)) {
      token = cachedToken;

      setState(app, { ...state, token });
      // notify all listeners with the cached token
      notifyTokenListeners(app, { token: token.token });
    }
  }

  // return the cached token if it's valid
  if (!forceRefresh && token && isValid(token)) {
    return {
      token: token.token
    };
  }

  /**
   * request a new token
   */
  try {
    if (state.provider instanceof ReCaptchaV3ProviderImpl) {
      token = await state.provider.getToken();
    } else if (state.provider) {
      // custom provider
      const customToken = await state.provider.getToken();
      // Try to extract IAT from custom token, in case this token is not
      // being newly issued. JWT timestamps are in seconds since epoch.
      const issuedAtTimeSeconds = issuedAtTime(customToken.token);
      // Very basic validation, use current timestamp as IAT if JWT
      // has no `iat` field or value is out of bounds.
      const issuedAtTimeMillis =
        issuedAtTimeSeconds !== null &&
        issuedAtTimeSeconds < Date.now() &&
        issuedAtTimeSeconds > 0
          ? issuedAtTimeSeconds * 1000
          : Date.now();

      token = { ...customToken, issuedAtTimeMillis };
    }
  } catch (e) {
    // `getToken()` should never throw, but logging error text to console will aid debugging.
    logger.error(e);
    error = e;
  }

  let interopTokenResult: AppCheckTokenResult | undefined;
  if (!token) {
    // if token is undefined, there must be an error.
    // we return a dummy token along with the error
    interopTokenResult = makeDummyTokenResult(error!);
  } else {
    interopTokenResult = {
      token: token.token
    };
    // write the new token to the memory state as well ashe persistent storage.
    // Only do it if we got a valid new token
    setState(app, { ...state, token });
    await writeTokenToStorage(app, token);
  }

  notifyTokenListeners(app, interopTokenResult);
  return interopTokenResult;
}

export function addTokenListener(
  app: FirebaseApp,
  platformLoggerProvider: Provider<'platform-logger'>,
  listener: AppCheckTokenListener
): void {
  const state = getState(app);
  const newState = {
    ...state,
    tokenListeners: [...state.tokenListeners, listener]
  };

  /**
   * DEBUG MODE
   *
   * invoke the listener once with the debug token.
   */
  if (isDebugMode()) {
    const debugState = getDebugState();
    if (debugState.enabled && debugState.token) {
      debugState.token.promise
        .then(token => listener({ token }))
        .catch(() => {
          /* we don't care about exceptions thrown in listeners */
        });
    }
  } else {
    /**
     * PROD MODE
     *
     * invoke the listener with the valid token, then start the token refresher
     */
    if (!newState.tokenRefresher) {
      const tokenRefresher = createTokenRefresher(app, platformLoggerProvider);
      newState.tokenRefresher = tokenRefresher;
    }

    // Create the refresher but don't start it if `isTokenAutoRefreshEnabled`
    // is not true.
    if (
      !newState.tokenRefresher.isRunning() &&
      state.isTokenAutoRefreshEnabled === true
    ) {
      newState.tokenRefresher.start();
    }

    // invoke the listener async immediately if there is a valid token
    if (state.token && isValid(state.token)) {
      const validToken = state.token;
      Promise.resolve()
        .then(() => listener({ token: validToken.token }))
        .catch(() => {
          /* we don't care about exceptions thrown in listeners */
        });
    }
  }

  setState(app, newState);
}

export function removeTokenListener(
  app: FirebaseApp,
  listener: AppCheckTokenListener
): void {
  const state = getState(app);

  const newListeners = state.tokenListeners.filter(l => l !== listener);
  if (
    newListeners.length === 0 &&
    state.tokenRefresher &&
    state.tokenRefresher.isRunning()
  ) {
    state.tokenRefresher.stop();
  }

  setState(app, {
    ...state,
    tokenListeners: newListeners
  });
}

function createTokenRefresher(
  app: FirebaseApp,
  platformLoggerProvider: Provider<'platform-logger'>
): Refresher {
  return new Refresher(
    // Keep in mind when this fails for any reason other than the ones
    // for which we should retry, it will effectively stop the proactive refresh.
    async () => {
      const state = getState(app);
      // If there is no token, we will try to load it from storage and use it
      // If there is a token, we force refresh it because we know it's going to expire soon
      let result;
      if (!state.token) {
        result = await getToken(app, platformLoggerProvider);
      } else {
        result = await getToken(app, platformLoggerProvider, true);
      }

      // getToken() always resolves. In case the result has an error field defined, it means the operation failed, and we should retry.
      if (result.error) {
        throw result.error;
      }
    },
    () => {
      // TODO: when should we retry?
      return true;
    },
    () => {
      const state = getState(app);

      if (state.token) {
        // issuedAtTime + (50% * total TTL) + 5 minutes
        let nextRefreshTimeMillis =
          state.token.issuedAtTimeMillis +
          (state.token.expireTimeMillis - state.token.issuedAtTimeMillis) *
            0.5 +
          5 * 60 * 1000;
        // Do not allow refresh time to be past (expireTime - 5 minutes)
        const latestAllowableRefresh =
          state.token.expireTimeMillis - 5 * 60 * 1000;
        nextRefreshTimeMillis = Math.min(
          nextRefreshTimeMillis,
          latestAllowableRefresh
        );
        return Math.max(0, nextRefreshTimeMillis - Date.now());
      } else {
        return 0;
      }
    },
    TOKEN_REFRESH_TIME.RETRIAL_MIN_WAIT,
    TOKEN_REFRESH_TIME.RETRIAL_MAX_WAIT
  );
}

function notifyTokenListeners(
  app: FirebaseApp,
  token: AppCheckTokenResult
): void {
  const listeners = getState(app).tokenListeners;

  for (const listener of listeners) {
    try {
      listener(token);
    } catch (e) {
      // If any handler fails, ignore and run next handler.
    }
  }
}

function isValid(token: AppCheckTokenInternal): boolean {
  return token.expireTimeMillis - Date.now() > 0;
}

function makeDummyTokenResult(error: Error): AppCheckTokenResult {
  return {
    token: formatDummyToken(defaultTokenErrorData),
    error
  };
}
