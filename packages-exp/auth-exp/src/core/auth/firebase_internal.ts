import { Unsubscribe } from '@firebase/util';

import { Auth } from '../../model/auth';

declare module '@firebase/component' {
  interface NameServiceMapping {
    'auth-internal-exp': AuthInternal;
  }
}

interface TokenListener {
  (tok: string|null): unknown;
}

export class AuthInternal {
  private readonly internalListeners: Map<TokenListener, Unsubscribe> = new Map();

  constructor(private readonly auth: Auth) {
  }

  getUid(): string | null {
    return this.auth.currentUser?.uid || null;
  }

  async getToken(forceRefresh?: boolean): Promise<{accessToken: string}|null> {
    await this.auth._initializationPromise;
    if (!this.auth.currentUser) {
      return null;
    }
  
    const accessToken = await this.auth.currentUser.getIdToken(forceRefresh);
    return {accessToken};
  }

  addAuthTokenListener(listener: TokenListener): void {

    if (this.internalListeners.has(listener)) {
      return;
    }

    const unsubscribe = this.auth._onIdTokenChanged(user => {
      listener(user?.stsTokenManager.accessToken || null)
    });
    this.internalListeners.set(listener, unsubscribe);
    this.updateProactiveRefresh();
  }

  removeAuthTokenListener(listener: TokenListener): void {
    const unsubscribe = this.internalListeners.get(listener);
    if (!unsubscribe) {
      return;
    }

    this.internalListeners.delete(listener);
    unsubscribe();
    this.updateProactiveRefresh();
  }

  private updateProactiveRefresh(): void {
    if (this.internalListeners.size > 0) {
      this.auth._startProactiveRefresh();
    } else {
      this.auth._stopProactiveRefresh();
    }
  }
}
