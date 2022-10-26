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

import { AuthInternal } from '../../model/auth';
import {
  AuthEvent,
  AuthEventType,
  PopupRedirectResolverInternal
} from '../../model/popup_redirect';
import { UserCredentialInternal } from '../../model/user';
import { PersistenceInternal } from '../persistence';
import { _persistenceKeyName } from '../persistence/persistence_user_manager';
import { _getInstance } from '../util/instantiator';
import { AbstractPopupRedirectOperation } from './abstract_popup_redirect_operation';

const PENDING_REDIRECT_KEY = 'pendingRedirect';

// We only get one redirect outcome for any one auth, so just store it
// in here.
const redirectOutcomeMap: Map<
  string,
  () => Promise<UserCredentialInternal | null>
> = new Map();

export class RedirectAction extends AbstractPopupRedirectOperation {
  eventId = null;

  constructor(
    auth: AuthInternal,
    resolver: PopupRedirectResolverInternal,
    bypassAuthState = false
  ) {
    super(
      auth,
      [
        AuthEventType.SIGN_IN_VIA_REDIRECT,
        AuthEventType.LINK_VIA_REDIRECT,
        AuthEventType.REAUTH_VIA_REDIRECT,
        AuthEventType.UNKNOWN
      ],
      resolver,
      undefined,
      bypassAuthState
    );
  }

  /**
   * Override the execute function; if we already have a redirect result, then
   * just return it.
   */
  async execute(): Promise<UserCredentialInternal | null> {
    let readyOutcome = redirectOutcomeMap.get(this.auth._key());
    if (!readyOutcome) {
      try {
        const hasPendingRedirect = await _getAndClearPendingRedirectStatus(
          this.resolver,
          this.auth
        );
        const result = hasPendingRedirect ? await super.execute() : null;
        readyOutcome = () => Promise.resolve(result);
      } catch (e) {
        readyOutcome = () => Promise.reject(e);
      }

      redirectOutcomeMap.set(this.auth._key(), readyOutcome);
    }

    // If we're not bypassing auth state, the ready outcome should be set to
    // null.
    if (!this.bypassAuthState) {
      redirectOutcomeMap.set(this.auth._key(), () => Promise.resolve(null));
    }

    return readyOutcome();
  }

  async onAuthEvent(event: AuthEvent): Promise<void> {
    if (event.type === AuthEventType.SIGN_IN_VIA_REDIRECT) {
      return super.onAuthEvent(event);
    } else if (event.type === AuthEventType.UNKNOWN) {
      // This is a sentinel value indicating there's no pending redirect
      this.resolve(null);
      return;
    }

    if (event.eventId) {
      const user = await this.auth._redirectUserForId(event.eventId);
      if (user) {
        this.user = user;
        return super.onAuthEvent(event);
      } else {
        this.resolve(null);
      }
    }
  }

  async onExecution(): Promise<void> {}

  cleanUp(): void {}
}

export async function _getAndClearPendingRedirectStatus(
  resolver: PopupRedirectResolverInternal,
  auth: AuthInternal
): Promise<boolean> {
  const key = pendingRedirectKey(auth);
  const persistence = resolverPersistence(resolver);
  if (!(await persistence._isAvailable())) {
    return false;
  }
  const hasPendingRedirect = (await persistence._get(key)) === 'true';
  await persistence._remove(key);
  return hasPendingRedirect;
}

export async function _setPendingRedirectStatus(
  resolver: PopupRedirectResolverInternal,
  auth: AuthInternal
): Promise<void> {
  return resolverPersistence(resolver)._set(pendingRedirectKey(auth), 'true');
}

export function _clearRedirectOutcomes(): void {
  redirectOutcomeMap.clear();
}

export function _overrideRedirectResult(
  auth: AuthInternal,
  result: () => Promise<UserCredentialInternal | null>
): void {
  redirectOutcomeMap.set(auth._key(), result);
}

function resolverPersistence(
  resolver: PopupRedirectResolverInternal
): PersistenceInternal {
  return _getInstance(resolver._redirectPersistence);
}

function pendingRedirectKey(auth: AuthInternal): string {
  return _persistenceKeyName(
    PENDING_REDIRECT_KEY,
    auth.config.apiKey,
    auth.name
  );
}
