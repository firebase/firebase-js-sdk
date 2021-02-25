import * as exp from '@firebase/auth-exp/internal';
import { _isAndroidOrIosCordovaScheme, _isCordova } from './platform';

const _assert: typeof exp._assert = exp._assert;

/** Platform-agnostic popup-redirect resolver */
export class CompatPopupRedirectResolver implements exp.PopupRedirectResolverInternal {
  private underlyingResolver: exp.PopupRedirectResolverInternal | null = null;
  _redirectPersistence = exp.browserSessionPersistence;

  _completeRedirectFn: (auth: exp.Auth, resolver: exp.PopupRedirectResolver, bypassAuthState: boolean) => Promise<exp.UserCredential | null> = exp._getRedirectResult;

  async _initialize(auth: exp.AuthImpl): Promise<exp.EventManager> {
    if (this.underlyingResolver) {
      return this.underlyingResolver._initialize(auth);
    }

    // We haven't yet determined whether or not we're in Cordova; go ahead
    // and determine that state now.
    const isCordova = await _isCordova();
    this.underlyingResolver = exp._getInstance(isCordova ? exp.cordovaPopupRedirectResolver : exp.browserPopupRedirectResolver);
    return this.assertedUnderlyingResolver._initialize(auth);
  }

  _openPopup(auth: exp.AuthImpl, provider: exp.AuthProvider, authType: exp.AuthEventType, eventId?: string): Promise<exp.AuthPopup> {
    return this.assertedUnderlyingResolver._openPopup(auth, provider, authType, eventId);
  }

  _openRedirect(auth: exp.AuthImpl, provider: exp.AuthProvider, authType: exp.AuthEventType, eventId?: string): Promise<void> {
    return this.assertedUnderlyingResolver._openRedirect(auth, provider, authType, eventId);
  }

  _isIframeWebStorageSupported(auth: exp.AuthImpl, cb: (support: boolean) => unknown): void {
    this.assertedUnderlyingResolver._isIframeWebStorageSupported(auth, cb);
  }

  _originValidation(auth: exp.Auth): Promise<void> {
    return this.assertedUnderlyingResolver._originValidation(auth);
  }

  private get assertedUnderlyingResolver(): exp.PopupRedirectResolverInternal {
    _assert(this.underlyingResolver, exp.AuthErrorCode.INTERNAL_ERROR);
    return this.underlyingResolver;
  }
}