/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * @license
 * Copyright 2022 Google LLC
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

import { isEnterprise, RecaptchaConfig } from './recaptcha';
import { getRecaptchaConfig } from '../../api/authentication/recaptcha';
import {
  RecaptchaClientType,
  RecaptchaVersion,
  RecaptchaActionName,
  RecaptchaProvider
} from '../../api';

import { Auth } from '../../model/public_types';
import { AuthInternal } from '../../model/auth';
import { _castAuth } from '../../core/auth/auth_impl';
import * as jsHelpers from '../load_js';
import { AuthErrorCode } from '../../core/errors';

export const RECAPTCHA_ENTERPRISE_VERIFIER_TYPE = 'recaptcha-enterprise';
export const FAKE_TOKEN = 'NO_RECAPTCHA';

export class RecaptchaEnterpriseVerifier {
  /**
   * Identifies the type of application verifier (e.g. "recaptcha-enterprise").
   */
  readonly type = RECAPTCHA_ENTERPRISE_VERIFIER_TYPE;

  private readonly auth: AuthInternal;

  /**
   *
   * @param authExtern - The corresponding Firebase {@link Auth} instance.
   *
   */
  constructor(authExtern: Auth) {
    this.auth = _castAuth(authExtern);
  }

  /**
   * Executes the verification process.
   *
   * @returns A Promise for a token that can be used to assert the validity of a request.
   */
  async verify(
    action: string = 'verify',
    forceRefresh = false
  ): Promise<string> {
    async function retrieveSiteKey(auth: AuthInternal): Promise<string> {
      if (!forceRefresh) {
        if (auth.tenantId == null && auth._agentRecaptchaConfig != null) {
          return auth._agentRecaptchaConfig.siteKey;
        }
        if (
          auth.tenantId != null &&
          auth._tenantRecaptchaConfigs[auth.tenantId] !== undefined
        ) {
          return auth._tenantRecaptchaConfigs[auth.tenantId].siteKey;
        }
      }

      return new Promise<string>(async (resolve, reject) => {
        getRecaptchaConfig(auth, {
          clientType: RecaptchaClientType.WEB,
          version: RecaptchaVersion.ENTERPRISE
        })
          .then(response => {
            if (response.recaptchaKey === undefined) {
              reject(new Error('recaptcha Enterprise site key undefined'));
            } else {
              const config = new RecaptchaConfig(response);
              if (auth.tenantId == null) {
                auth._agentRecaptchaConfig = config;
              } else {
                auth._tenantRecaptchaConfigs[auth.tenantId] = config;
              }
              return resolve(config.siteKey);
            }
          })
          .catch(error => {
            reject(error);
          });
      });
    }

    function retrieveRecaptchaToken(
      siteKey: string,
      resolve: (value: string | PromiseLike<string>) => void,
      reject: (reason?: unknown) => void
    ): void {
      const grecaptcha = window.grecaptcha;
      if (isEnterprise(grecaptcha)) {
        grecaptcha.enterprise.ready(() => {
          grecaptcha.enterprise
            .execute(siteKey, { action })
            .then(token => {
              resolve(token);
            })
            .catch(() => {
              resolve(FAKE_TOKEN);
            });
        });
      } else {
        reject(Error('No reCAPTCHA enterprise script loaded.'));
      }
    }

    return new Promise<string>((resolve, reject) => {
      retrieveSiteKey(this.auth)
        .then(siteKey => {
          if (!forceRefresh && isEnterprise(window.grecaptcha)) {
            retrieveRecaptchaToken(siteKey, resolve, reject);
          } else {
            if (typeof window === 'undefined') {
              reject(
                new Error('RecaptchaVerifier is only supported in browser')
              );
              return;
            }
            let url = jsHelpers._recaptchaEnterpriseScriptUrl();
            if (url.length !== 0) {
              url += siteKey;
            }
            jsHelpers
              ._loadJS(url)
              .then(() => {
                retrieveRecaptchaToken(siteKey, resolve, reject);
              })
              .catch(error => {
                reject(error);
              });
          }
        })
        .catch(error => {
          reject(error);
        });
    });
  }
}

export async function injectRecaptchaFields<T>(
  auth: AuthInternal,
  request: T,
  action: RecaptchaActionName,
  captchaResp = false
): Promise<T> {
  const verifier = new RecaptchaEnterpriseVerifier(auth);
  let captchaResponse;
  try {
    captchaResponse = await verifier.verify(action);
  } catch (error) {
    captchaResponse = await verifier.verify(action, true);
  }
  const newRequest = { ...request };
  if (!captchaResp) {
    Object.assign(newRequest, { captchaResponse });
  } else {
    Object.assign(newRequest, { 'captchaResp': captchaResponse });
  }
  Object.assign(newRequest, { 'clientType': RecaptchaClientType.WEB });
  Object.assign(newRequest, {
    'recaptchaVersion': RecaptchaVersion.ENTERPRISE
  });
  return newRequest;
}

type ActionMethod<TRequest, TResponse> = (
  auth: Auth,
  request: TRequest
) => Promise<TResponse>;

export async function handleRecaptchaFlow<TRequest, TResponse>(
  authInstance: AuthInternal,
  request: TRequest,
  actionName: RecaptchaActionName,
  actionMethod: ActionMethod<TRequest, TResponse>
): Promise<TResponse> {
  if (
    authInstance
      ._getRecaptchaConfig()
      ?.isProviderEnabled(RecaptchaProvider.EMAIL_PASSWORD_PROVIDER)
  ) {
    const requestWithRecaptcha = await injectRecaptchaFields(
      authInstance,
      request,
      actionName,
      actionName === RecaptchaActionName.GET_OOB_CODE
    );
    return actionMethod(authInstance, requestWithRecaptcha);
  } else {
    return actionMethod(authInstance, request).catch(async error => {
      if (error.code === `auth/${AuthErrorCode.MISSING_RECAPTCHA_TOKEN}`) {
        console.log(
          `${actionName} is protected by reCAPTCHA Enterprise for this project. Automatically triggering the reCAPTCHA flow and restarting the flow.`
        );
        const requestWithRecaptcha = await injectRecaptchaFields(
          authInstance,
          request,
          actionName,
          actionName === RecaptchaActionName.GET_OOB_CODE
        );
        return actionMethod(authInstance, requestWithRecaptcha);
      } else {
        return Promise.reject(error);
      }
    });
  }
}

export async function _initializeRecaptchaConfig(auth: Auth): Promise<void> {
  const authInternal = _castAuth(auth);

  const response = await getRecaptchaConfig(authInternal, {
    clientType: RecaptchaClientType.WEB,
    version: RecaptchaVersion.ENTERPRISE
  });

  const config = new RecaptchaConfig(response);
  if (authInternal.tenantId == null) {
    authInternal._agentRecaptchaConfig = config;
  } else {
    authInternal._tenantRecaptchaConfigs[authInternal.tenantId] = config;
  }

  if (config.isProviderEnabled(RecaptchaProvider.EMAIL_PASSWORD_PROVIDER)) {
    const verifier = new RecaptchaEnterpriseVerifier(authInternal);
    void verifier.verify();
  }
}
