import { RECAPTCHA_ENTERPRISE_ONLOAD_CALLBACK_NAME } from "../../src/platform_browser/recaptcha/recaptcha_enterprise_verifier";

export const mockLoadJS = (): Promise<Event> => {
  if (typeof window[RECAPTCHA_ENTERPRISE_ONLOAD_CALLBACK_NAME] === 'function') {
    window[RECAPTCHA_ENTERPRISE_ONLOAD_CALLBACK_NAME]();
  }
  return Promise.resolve(new Event(''));
};
