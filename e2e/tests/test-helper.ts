
const RECAPTCHA_URL = 'https://www.google.com/recaptcha/api.js';

function findgreCAPTCHAScriptsOnPage(): HTMLScriptElement[] {
  const scriptTags = window.document.getElementsByTagName('script');
  const tags = [];
  for (const tag of Object.values(scriptTags)) {
    if (tag.src && tag.src.includes(RECAPTCHA_URL)) {
      tags.push(tag);
    }
  }
  return tags;
}

export function removegreCAPTCHAScriptsOnPage(): void {
  const tags = findgreCAPTCHAScriptsOnPage();

  for (const tag of tags) {
    tag.remove();
  }

  if (self.grecaptcha) {
    self.grecaptcha = undefined;
  }
}