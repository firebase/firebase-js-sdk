import {
  FacebookAuthProvider,
  getRedirectResult,
  GoogleAuthProvider,
  linkWithCredential,
  linkWithRedirect,
  OAuthProvider,
  reauthenticateWithRedirect,
  signInWithCredential,
  signInWithRedirect,
} from '@firebase/auth-exp';

export function idpRedirect(optProvider) {
  const provider = optProvider ? new OAuthProvider(optProvider) : new GoogleAuthProvider();
  signInWithRedirect(auth, provider);
}

export function idpReauthRedirect() {
  reauthenticateWithRedirect(auth.currentUser, new GoogleAuthProvider());
}

export function idpLinkRedirect() {
  linkWithRedirect(auth.currentUser, new GoogleAuthProvider());
}

export function redirectResult() {
  return getRedirectResult(auth);
}

export async function generateCredentialFromRedirectResultAndStore() {
  const result = await getRedirectResult(auth);
  window.redirectCred = GoogleAuthProvider.credentialFromResult(result);
  return window.redirectCred;
}

export async function signInWithRedirectCredential() {
  return signInWithCredential(auth, window.redirectCred);
}

export async function linkWithErrorCredential() {
  await linkWithCredential(auth.currentUser, window.errorCred);
}

// These below are not technically redirect functions but they're helpers for
// the redirect tests.

export function createFakeGoogleUser(email) {
  return signInWithCredential(
  auth,
  GoogleAuthProvider.credential(
    `{"sub": "__${email}__", "email": "${email}", "email_verified": true}`
))
}

export async function tryToSignInUnverified(email) { 
  try {
    await signInWithCredential(auth, FacebookAuthProvider.credential(
      `{"sub": "$$${email}$$", "email": "${email}", "email_verified": false}`
    ));
  } catch (e) {
    window.errorCred = FacebookAuthProvider.credentialFromError(e);
    throw e;
  }
}