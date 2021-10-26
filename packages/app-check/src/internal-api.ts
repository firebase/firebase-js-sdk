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

import { FirebaseApp } from '@firebase/app';
import {
  AppCheckTokenResult,
  AppCheckTokenInternal,
  AppCheckTokenObserver,
  ListenerType
} from './types';
import { AppCheckTokenListener } from './public-types';
import { getState, setState } from './state';
import { TOKEN_REFRESH_TIME } from './constants';
import { Refresher } from './proactive-refresh';
import { ensureActivated } from './util';
import { exchangeToken, getExchangeDebugTokenRequest } from './client';
import { writeTokenToStorage } from './storage';
import { getDebugToken, isDebugMode } from './debug';
import { base64, FirebaseError } from '@firebase/util';
import { logger } from './logger';
import { AppCheckService } from './factory';
import { AppCheckError } from './errors';

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
 * This function always resolves.
 * The result will contain an error field if there is any error.
 * In case there is an error, the token field in the result will be populated with a dummy value
 */
export async function getToken(
  appCheck: AppCheckService,
  forceRefresh = false
): Promise<AppCheckTokenResult> {
  const app = appCheck.app;
  ensureActivated(app);

  const state = getState(app);

  /**
   * First check if there is a token in memory from a previous `getToken()` call.
   */
  let token: AppCheckTokenInternal | undefined = state.token;
  let error: Error | undefined = undefined;

  /**
   * If there is no token in memory, try to load token from indexedDB.
   */
  if (!token) {
    // cachedTokenPromise contains the token found in IndexedDB or undefined if not found.
    const cachedToken = await state.cachedTokenPromise;
    if (cachedToken && isValid(cachedToken)) {
      token = cachedToken;
    }
  }

  // Return the cached token (from either memory or indexedDB) if it's valid
  if (!forceRefresh && token && isValid(token)) {
    return {
      token: token.token
    };
  }

  // Only set to true if this `getToken()` call is making the actual
  // REST call to the exchange endpoint, versus waiting for an already
  // in-flight call (see debug and regular exchange endpoint paths below)
  let shouldCallListeners = false;

  /**
   * DEBUG MODE
   * If debug mode is set, and there is no cached token, fetch a new App
   * Check token using the debug token, and return it directly.
   */
  if (isDebugMode()) {
    // Avoid making another call to the exchange endpoint if one is in flight.
    if (!state.exchangeTokenPromise) {
      state.exchangeTokenPromise = exchangeToken(
        getExchangeDebugTokenRequest(app, await getDebugToken()),
        appCheck.platformLoggerProvider
      ).then(token => {
        state.exchangeTokenPromise = undefined;
        return token;
      });
      shouldCallListeners = true;
    }
    const tokenFromDebugExchange: AppCheckTokenInternal =
      await state.exchangeTokenPromise;
    // Write debug token to indexedDB.
    await writeTokenToStorage(app, tokenFromDebugExchange);
    // Write debug token to state.
    setState(app, { ...state, token: tokenFromDebugExchange });
    return { token: tokenFromDebugExchange.token };
  }

  /**
   * request a new token
   */
  try {
    // Avoid making another call to the exchange endpoint if one is in flight.
    if (!state.exchangeTokenPromise) {
      // state.provider is populated in initializeAppCheck()
      // ensureActivated() at the top of this function checks that
      // initializeAppCheck() has been called.
      state.exchangeTokenPromise = state.provider!.getToken().then(token => {
        state.exchangeTokenPromise = undefined;
        return token;
      });
      shouldCallListeners = true;
    }
    token = await state.exchangeTokenPromise;
  } catch (e) {
    if ((e as FirebaseError).code === AppCheckError.THROTTLED) {
      // Warn if throttled, but do not treat it as an error.
      logger.warn((e as FirebaseError).message);
    } else {
      // `getToken()` should never throw, but logging error text to console will aid debugging.
      logger.error(e);
    }
    // Always save error to be added to dummy token.
    error = e as FirebaseError;
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
    // write the new token to the memory state as well as the persistent storage.
    // Only do it if we got a valid new token
    setState(app, { ...state, token });
    await writeTokenToStorage(app, token);
  }

  if (shouldCallListeners) {
    notifyTokenListeners(app, interopTokenResult);
  }
  return interopTokenResult;
}

export function addTokenListener(
  appCheck: AppCheckService,
  type: ListenerType,
  listener: AppCheckTokenListener,
  onError?: (error: Error) => void
): void {
  const { app } = appCheck;
  const state = getState(app);
  const tokenObserver: AppCheckTokenObserver = {
    next: listener,
    error: onError,
    type
  };
  setState(app, {
    ...state,
    tokenObservers: [...state.tokenObservers, tokenObserver]
  });

  // Invoke the listener async immediately if there is a valid token
  // in memory.
  if (state.token && isValid(state.token)) {
    const validToken = state.token;
    Promise.resolve()
      .then(() => {
        listener({ token: validToken.token });
        initTokenRefresher(appCheck);
      })
      .catch(() => {
        /* we don't care about exceptions thrown in listeners */
      });
  }

  /**
   * Wait for any cached token promise to resolve before starting the token
   * refresher. The refresher checks to see if there is an existing token
   * in state and calls the exchange endpoint if not. We should first let the
   * IndexedDB check have a chance to populate state if it can.
   *
   * Listener call isn't needed here because cachedTokenPromise will call any
   * listeners that exist when it resolves.
   */

  // state.cachedTokenPromise is always populated in `activate()`.
  void state.cachedTokenPromise!.then(() => initTokenRefresher(appCheck));
}

export function removeTokenListener(
  app: FirebaseApp,
  listener: AppCheckTokenListener
): void {
  const state = getState(app);

  const newObservers = state.tokenObservers.filter(
    tokenObserver => tokenObserver.next !== listener
  );
  if (
    newObservers.length === 0 &&
    state.tokenRefresher &&
    state.tokenRefresher.isRunning()
  ) {
    state.tokenRefresher.stop();
  }

  setState(app, {
    ...state,
    tokenObservers: newObservers
  });
}

/**
 * Logic to create and start refresher as needed.
 */
function initTokenRefresher(appCheck: AppCheckService): void {
  const { app } = appCheck;
  const state = getState(app);
  // Create the refresher but don't start it if `isTokenAutoRefreshEnabled`
  // is not true.
  let refresher: Refresher | undefined = state.tokenRefresher;
  if (!refresher) {
    refresher = createTokenRefresher(appCheck);
    setState(app, { ...state, tokenRefresher: refresher });
  }
  if (!refresher.isRunning() && state.isTokenAutoRefreshEnabled) {
    refresher.start();
  }
}

function createTokenRefresher(appCheck: AppCheckService): Refresher {
  const { app } = appCheck;
  return new Refresher(
    // Keep in mind when this fails for any reason other than the ones
    // for which we should retry, it will effectively stop the proactive refresh.
    async () => {
      const state = getState(app);
      // If there is no token, we will try to load it from storage and use it
      // If there is a token, we force refresh it because we know it's going to expire soon
      let result;
      if (!state.token) {
        result = await getToken(appCheck);
      } else {
        result = await getToken(appCheck, true);
      }

      // getToken() always resolves. In case the result has an error field defined, it means the operation failed, and we should retry.
      if (result.error) {
        throw result.error;
      }
    },
    (error: unknown) => {
      // Do not queue up retries if it's in a throttled state.
      if ((error as FirebaseError).code === AppCheckError.THROTTLED) {
        return false;
      }
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

export function notifyTokenListeners(
  app: FirebaseApp,
  token: AppCheckTokenResult
): void {
  const observers = getState(app).tokenObservers;

  for (const observer of observers) {
    try {
      if (observer.type === ListenerType.EXTERNAL && token.error != null) {
        // If this listener was added by a 3P call, send any token error to
        // the supplied error handler. A 3P observer always has an error
        // handler.
        observer.error!(token.error);
      } else {
        // If the token has no error field, always return the token.
        // If this is a 2P listener, return the token, whether or not it
        // has an error field.
        observer.next(token);
      }
    } catch (e) {
      // Errors in the listener function itself are always ignored.
    }
  }
}

export function isValid(token: AppCheckTokenInternal): boolean {
  return token.expireTimeMillis - Date.now() > 0;
}

function makeDummyTokenResult(error: Error): AppCheckTokenResult {
  return {
    token: formatDummyToken(defaultTokenErrorData),
    error
  };
}
