/**
 * @license
 * Copyright 2026 Google LLC
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

import { Name, Provider } from '@firebase/component';

import { logError } from '../../logger';

/**
 * Options for retrieving a token.
 *
 * {@linkcode forceRefresh} - if true, forces a token refresh from the underlying service. If no token
 * is available in the underlying service, null will be returned.
 *
 * @internal
 */
export interface TokenOptions {
  forceRefresh?: boolean;
}

/**
 * Common token provider interface for SQL client access token providers.
 * @internal
 */
export interface TokenProvider<TToken, TListener> {
  getToken(options?: TokenOptions): Promise<TToken | null>;
  addTokenChangeListener(listener: TListener): void;
  removeTokenChangeListener(listener: TListener): void;
  terminate(): void;
}

/**
 * Abstract base class managing token retrieval lifecycle, in-flight deduplication,
 * delayed component initialization, and listener registration.
 * @internal
 */
export abstract class AbstractTokenProvider<
  Token,
  Component,
  Listener,
  ComponentName extends Name = Name
> implements TokenProvider<Token, Listener> {
  protected component: Component | undefined;
  /** Promise to dedupe concurrent in-flight getToken() requests */
  private activeGetTokenPromise?: Promise<Token | null> | undefined = undefined;
  /** Promise to dedupe concurrent in-flight getToken({ forceRefresh: true }) requests */
  private activeForceRefreshPromise?: Promise<Token | null> | undefined =
    undefined;
  /** Resolver to settle active inFlightGetToken early when a concurrent force-refresh returns */
  private resolveActiveGetTokenPromise?:
    ((token: Token | null) => void) | undefined = undefined;

  /** Unsubscribe callback to release onInit listener from the provider */
  private onInitUnsubscribe?: (() => void) | undefined = undefined;

  /**
   * Array of token change listeners registered on this provider.
   * Used to cleanup listeners when the instance is deleted.
   */
  private activeListeners: Listener[] = [];
  /** Array of token change listeners queued to be registered on this provider once it initializes. */
  private queuedListeners: Listener[] = [];

  /**
   * @param provider Provider for a Firebase service component
   * @param serverAppToken Static token from a Firebase Server App
   */
  constructor(
    protected readonly provider: Provider<ComponentName> | undefined,
    protected readonly serverAppToken?: string | undefined
  ) {
    this.component =
      (provider?.getImmediate({ optional: true }) as Component) ?? undefined;
    if (!this.component) {
      this.onInitUnsubscribe = provider?.onInit(component => {
        this.component = component as Component;
        const n = this.queuedListeners.length;
        for (let i = 0; i < n; i++) {
          const oldestListener = this.queuedListeners.shift();
          oldestListener && this.addTokenChangeListener(oldestListener);
        }
        this.cancelOnInit();
      });
    }
  }

  /**
   * Retrieves the token, deduplicating concurrent in-flight requests.
   *
   * NOTE: Calls {@linkcode requestToken()} which provides the {@linkcode serverAppToken} token if one was provided and no token is available from the
   * underlying service (and `TokenOptions.forceRefresh === false`).
   *
   * {@linkcode TokenOptions.forceRefresh} - if true, forces a token refresh from the underlying service. If no token
   * is available in the underlying service, null will be returned.
   */
  getToken(
    options: TokenOptions = { forceRefresh: false }
  ): Promise<Token | null> {
    if (!this.activeForceRefreshPromise && options.forceRefresh) {
      const forcedPromise = this.requestToken(options)
        .then(token => {
          this.resolveActiveGetTokenPromise?.(token);
          return token;
        })
        .finally(() => {
          if (this.activeForceRefreshPromise === forcedPromise) {
            this.activeForceRefreshPromise = undefined;
          }
        });
      this.activeForceRefreshPromise = forcedPromise;
    }
    if (this.activeForceRefreshPromise) {
      return this.activeForceRefreshPromise;
    }

    if (!this.activeGetTokenPromise) {
      const unforcedPromise = new Promise<Token | null>((resolve, reject) => {
        this.resolveActiveGetTokenPromise = resolve;
        this.requestToken(options).then(resolve, reject);
      }).finally(() => {
        if (this.activeGetTokenPromise === unforcedPromise) {
          this.activeGetTokenPromise = undefined;
          this.resolveActiveGetTokenPromise = undefined;
        }
      });
      this.activeGetTokenPromise = unforcedPromise;
    }
    return this.activeGetTokenPromise;
  }

  /**
   * Invoke the underlying service to fetch a token.
   * Allows for delayed initialization.
   */
  private requestToken(
    options: TokenOptions = { forceRefresh: false }
  ): Promise<Token | null> {
    if (this.component) {
      return this.fetchToken(this.component, options);
    }

    if (!this.provider) {
      if (this.serverAppToken && !options.forceRefresh) {
        return Promise.resolve(this.convertServerAppToken(this.serverAppToken));
      }
      return Promise.resolve(null);
    }

    return new Promise<Token | null>((resolve, reject) => {
      // Support delayed initialization. This allows our customers to initialize
      // the Firebase SQL SDK before initializing Auth or AppCheck and ensures that
      // all requests are authenticated if a token becomes available before the timeout expires.
      setTimeout(() => {
        if (this.component) {
          this.requestToken(options).then(resolve, reject);
        } else if (this.serverAppToken && !options.forceRefresh) {
          resolve(this.convertServerAppToken(this.serverAppToken));
        } else {
          resolve(null);
        }
      }, 0);
    });
  }

  /**
   * Invoke the underlying service component to add a token change listener. If the service is not
   * yet initialized, the listener is buffered and added once the service initializes.
   *
   * NOTE: Does NOT filter out duplicate listeners.
   */
  addTokenChangeListener(listener: Listener): void {
    if (this.component) {
      try {
        this.activeListeners.push(listener);
        this.addListener(this.component, listener);
      } catch (err) {
        this.activeListeners.pop();
        logError(err instanceof Error ? err.message : String(err));
      }
    } else {
      this.queuedListeners.push(listener);
    }
  }

  /**
   * Invoke the underlying service component to remove a token change listener. If the service is not
   * yet initialized, the listener is removed from the pending buffer.
   */
  removeTokenChangeListener(listener: Listener): void {
    if (this.component) {
      try {
        removeFirstOccurrenceFromList(listener, this.activeListeners);
        this.removeListener(this.component, listener);
      } catch (err) {
        logError(err instanceof Error ? err.message : String(err));
      }
    }
    removeFirstOccurrenceFromList(listener, this.queuedListeners);
  }

  /**
   * Convert the Firebase Server App token to the appropriate token type.
   */
  protected abstract convertServerAppToken(token: string): Token;

  /**
   * Get token from underlying service component
   */
  protected abstract fetchToken(
    component: Component,
    options: TokenOptions
  ): Promise<Token | null>;

  /**
   * Add a token change listener to the underlying service component
   */
  protected abstract addListener(
    component: Component,
    listener: Listener
  ): void;

  /**
   * Remove an added token change listener from the underlying service component
   */
  protected abstract removeListener(
    component: Component,
    listener: Listener
  ): void;

  /**
   * Cleans up any pending initialization callbacks.
   * @internal
   */
  protected cancelOnInit(): void {
    this.onInitUnsubscribe?.();
    this.onInitUnsubscribe = undefined;
    this.queuedListeners = [];
  }

  /**
   * Terminates the `TokenProvider` instance. Cleans up any outstanding resources.
   * @internal
   */
  terminate(): void {
    this.cancelOnInit();
    [...this.activeListeners].forEach(listener =>
      this.removeTokenChangeListener(listener)
    );
  }
}

/**
 * Removes the first occurrence of an item from the list.
 * @internal
 */
function removeFirstOccurrenceFromList<Element>(
  item: Element,
  list: Element[]
): boolean {
  const index = list.indexOf(item);
  if (index !== -1) {
    list.splice(index, 1);
  }
  return index !== -1;
}
