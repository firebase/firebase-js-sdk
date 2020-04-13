import { Auth } from '../../model/auth';
import { HttpMethod, Endpoint, performApiRequest } from '..';

interface GetRecaptchaParamResponse {
  recaptchaSiteKey?: string;
}

export async function getRecaptchaParams(auth: Auth): Promise<string> {
  return (
    (
      await performApiRequest<void, GetRecaptchaParamResponse>(
        auth,
        HttpMethod.GET,
        Endpoint.GET_RECAPTCHA_PARAM
      )
    ).recaptchaSiteKey || ''
  );
}
