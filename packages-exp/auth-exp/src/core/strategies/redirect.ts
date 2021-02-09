// We only get one redirect outcome for any one auth, so just store it

import { Auth } from '../../model/auth';
import { AuthEvent, AuthEventType, PopupRedirectResolver } from '../../model/popup_redirect';
import { UserCredential } from '../../model/user';
import { AbstractPopupRedirectOperation } from './abstract_popup_redirect_operation';

// in here.
const redirectOutcomeMap: Map<
  string,
  () => Promise<UserCredential | null>
> = new Map();

export class RedirectAction extends AbstractPopupRedirectOperation {
  eventId = null;

  constructor(
    auth: Auth,
    resolver: PopupRedirectResolver,
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
  async execute(): Promise<UserCredential | null> {
    let readyOutcome = redirectOutcomeMap.get(this.auth._key());
    if (!readyOutcome) {
      try {
        const result = await super.execute();
        readyOutcome = () => Promise.resolve(result);
      } catch (e) {
        readyOutcome = () => Promise.reject(e);
      }

      redirectOutcomeMap.set(this.auth._key(), readyOutcome);
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

export function _clearRedirectOutcomes(): void {
  redirectOutcomeMap.clear();
}