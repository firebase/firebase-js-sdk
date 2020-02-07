import { Auth } from '../../model/auth';
import * as api from '../../api/authentication';
import { UserCredential, OperationType } from '../../model/user_credential';
import { Operation } from '../../model/action_code_info';
import { getCurrentUrl } from '../util/location';
import { AUTH_ERROR_FACTORY, AuthErrorCode } from '../errors';
import { EmailAuthProvider, EmailAuthCredential } from '../providers/email';
import { signInWithIdTokenResponse } from '.';
import { ActionCodeSettings, setActionCodeSettingsOnRequest } from '../../model/action_code_settings';
import { ActionCodeURL } from '../../model/action_code_url';

export async function sendSignInLinkToEmail(
  auth: Auth,
  email: string,
  actionCodeSettings?: ActionCodeSettings
): Promise<void> {
  const request: api.EmailSigninRequest = {
    requestType: api.GetOobCodeRequestType.EMAIL_SIGNIN,
    email
  };
  if (actionCodeSettings) {
    setActionCodeSettingsOnRequest(request, actionCodeSettings);
  }

  await api.sendOobCode(auth, request);
}

export function isSignInWithEmailLink(
  auth: Auth, emailLink: string): boolean {
  const actionCodeUrl = ActionCodeURL.fromEmailLink(auth, emailLink);
  return !!(actionCodeUrl && actionCodeUrl.operation === Operation.EMAIL_SIGNIN);
}

export async function signInWithEmailLink(
  auth: Auth,
  email: string,
  emailLink?: string
): Promise<UserCredential> {
  const link = emailLink || getCurrentUrl();
  const actionCodeUrl = ActionCodeURL.fromEmailLink(auth, link);
  if (!actionCodeUrl) {
    throw AUTH_ERROR_FACTORY.create(AuthErrorCode.ARGUMENT_ERROR, { appName: auth.name });
  }

  const credential: EmailAuthCredential = EmailAuthProvider.credential(email, actionCodeUrl.code, EmailAuthProvider.EMAIL_LINK_SIGN_IN_METHOD);
  
  // Check if the tenant ID in the email link matches the tenant ID on Auth
  // instance.
  if (actionCodeUrl.tenantId !== auth.tenantId) {
    throw AUTH_ERROR_FACTORY.create(AuthErrorCode.TENANT_ID_MISMATCH, {appName: auth.name});
  }
 
  // return signInWithCredential(credential);

  const response = await api.signInWithEmailLink(auth, {
    email,
    oobCode: credential.password
  });

  const user = await signInWithIdTokenResponse(auth, response);
  return new UserCredential(user!, EmailAuthProvider.PROVIDER_ID, OperationType.SIGN_IN);
}
