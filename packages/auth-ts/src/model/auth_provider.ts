import { OAuthCredential, AuthCredential } from './auth_credential';
import { UserCredential } from './user_credential';
import { Auth } from './auth';
import { AuthError } from './auth_error';
import { MultiFactorSession } from './multifactor';
import { ApplicationVerifier } from './application_verifier';

export interface AuthProvider {
    readonly providerId: string;
}

export class GoogleAuthProvider implements AuthProvider {
    static readonly PROVIDER_ID: string;
    static readonly GOOGLE_SIGN_IN_METHOD: string;
    readonly providerId: string = "google";
    static credentialFromResult(
      userCredential: UserCredential): OAuthCredential | null {
      throw new Error('not implemented');
    }
    static credentialFromError(error: AuthError): OAuthCredential | null {
      throw new Error('not implemented');
    }
    static credential(idToken?: string | null, accessToken?: string | null): OAuthCredential {
      throw new Error('not implemented');
    }
    static credentialFromJSON(json: object): OAuthCredential {
      throw new Error('not implemented');
    }
    addScope(scope: string): AuthProvider {
      throw new Error('not implemented');
    }
    setCustomParameters(customOAuthParameters: object): AuthProvider {
      throw new Error('not implemented');
    }
}

export class FacebookAuthProvider implements AuthProvider {
    static readonly PROVIDER_ID: string;
    static readonly FACEBOOK_SIGN_IN_METHOD: string;
    readonly providerId: string = "facebook";
    static credential(accessToken: string): OAuthCredential {
      throw new Error('not implemented');
    }
    static credentialFromResult(userCredential: UserCredential): OAuthCredential | null {
      throw new Error('not implemented');
    }
    static credentialFromError(error: AuthError): OAuthCredential | null {
      throw new Error('not implemented');
    }
    static credentialFromJSON(json: object): OAuthCredential {
      throw new Error('not implemented');
    }
    addScope(scope: string): AuthProvider {
      throw new Error('not implemented');
    }
    setCustomParameters(customOAuthParameters: object): AuthProvider {
      throw new Error('not implemented');
    }
}

export class GithubAuthProvider implements AuthProvider {
    static readonly PROVIDER_ID: string;
    static readonly GITHUB_SIGN_IN_METHOD: string;
    readonly providerId: string = "github";
    static credential(accessToken: string): OAuthCredential {
      throw new Error('not implemented');
    }
    static credentialFromResult(userCredential: UserCredential): OAuthCredential | null {
      throw new Error('not implemented');
    }
    static credentialFromError(error: AuthError): OAuthCredential | null {
      throw new Error('not implemented');
    }
    static credentialFromJSON(json: object): OAuthCredential {
      throw new Error('not implemented');
    }

    addScope(scope: string): AuthProvider {
      throw new Error('not implemented');
    }
    setCustomParameters(customOAuthParameters: object): AuthProvider {
      throw new Error('not implemented');
    }
}

export class TwitterAuthProvider implements AuthProvider {
    static readonly PROVIDER_ID: string;
    static readonly TWITTER_SIGN_IN_METHOD: string;
    readonly providerId: string = "twitter";
    static credential(token: string, secret: string): AuthCredential {
      throw new Error('not implemented');
    }
    static credentialFromResult(
      userCredential: UserCredential): OAuthCredential | null {
      throw new Error('not implemented');
    }
    static credentialFromError(error: AuthError): OAuthCredential | null {
      throw new Error('not implemented');
    }
    static credentialFromJSON(json: object): OAuthCredential {
      throw new Error('not implemented');
    }

    setCustomParameters(customOAuthParameters: object): AuthProvider {
      throw new Error('not implemented');
    }
}

export class EmailAuthProvider implements AuthProvider {
    static readonly PROVIDER_ID: string;
    static readonly EMAIL_PASSWORD_SIGN_IN_METHOD: string;
    static readonly EMAIL_LINK_SIGN_IN_METHOD: string;
    readonly providerId: string = "email";
    static credential(email: string, password: string): AuthCredential {
      throw new Error('not implemented');
    }
    static credentialWithLink(email: string, emailLink: string): AuthCredential {
      throw new Error('not implemented');
    }
}

export class SAMLAuthProvider implements AuthProvider {
  constructor(
        readonly providerId: string
  ) { }
  static credentialFromResult(
    userCredential: UserCredential): AuthCredential | null {
    throw new Error('not implemented');
  }
  static credentialFromError(error: AuthError): AuthCredential | null {
    throw new Error('not implemented');
  }
  static credentialFromJSON(json: object): AuthCredential {
    throw new Error('not implemented');
  }
}

export class OAuthProvider implements AuthProvider {
  constructor(
        readonly providerId: string
  ) { }
  static credentialFromResult(
    userCredential: UserCredential): OAuthCredential | null {
    throw new Error('not implemented');
  }
  static credentialFromError(error: AuthError): OAuthCredential | null {
    throw new Error('not implemented');
  }
  static credentialFromJSON(json: object): OAuthCredential {
    throw new Error('not implemented');
  }
  addScope(scope: string): AuthProvider {
    throw new Error('not implemented');
  }
  credential(idToken?: string, accessToken?: string, rawNonce?: string): OAuthCredential {
    throw new Error('not implemented');
  }
  setCustomParameters(customOAuthParameters: object): AuthProvider {
    throw new Error('not implemented');
  }
}

export class PhoneAuthProvider implements AuthProvider {
    static readonly PROVIDER_ID: string;
    static readonly PHONE_SIGN_IN_METHOD: string;
    static credential(
      verificationId: string,
      verificationCode: string
    ): AuthCredential {
      throw new Error('not implemented');
    }
    static credentialFromResult(
      userCredential: UserCredential): AuthCredential | null {
      throw new Error('not implemented');
    }
    static credentialFromError(error: AuthError): AuthCredential | null {
      throw new Error('not implemented');
    }
    static credentialFromJSON(json: object): AuthCredential {
      throw new Error('not implemented');
    }
    constructor(auth?: Auth | null) {
      throw new Error('not implemented');
    }
    readonly providerId: string = "phone";
    verifyPhoneNumber(
      phoneNumber: string,
      applicationVerifier: ApplicationVerifier,
      multiFactorSession?: MultiFactorSession,
    ): Promise<string> {
      throw new Error('not implemented');
    }
}