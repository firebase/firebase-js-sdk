import { loadCss, loadScript } from './lazy_load';

let uiConfig;

function useBasicUiConfig() {
  uiConfig = {
    signInSuccessUrl: '/logged_in.html',
    signInOptions: [
      // Leave the lines as is for the providers you want to offer your users.
      compat.auth.GoogleAuthProvider.PROVIDER_ID,
      compat.auth.FacebookAuthProvider.PROVIDER_ID,
      compat.auth.TwitterAuthProvider.PROVIDER_ID,
      compat.auth.GithubAuthProvider.PROVIDER_ID,
      compat.auth.EmailAuthProvider.PROVIDER_ID,
      compat.auth.PhoneAuthProvider.PROVIDER_ID,
      firebaseui.auth.AnonymousAuthProvider.PROVIDER_ID,
    ],
  };
}

export async function usePopupUiConfig() {
  useBasicUiConfig();
  uiConfig.signInFlow = 'popup';
}

export async function loadUiCode() {
  await loadScript('https://www.gstatic.com/firebasejs/ui/4.8.0/firebase-ui-auth.js');
  await loadCss('https://www.gstatic.com/firebasejs/ui/4.8.0/firebase-ui-auth.css');
}

export async function startUi() {
  // Hacky hack hack
  window.firebase = compat;

  if (!uiConfig) {
    useBasicUiConfig();
  }

  // Initialize the FirebaseUI Widget using Firebase.
  const ui = new firebaseui.auth.AuthUI(compat.auth());
  // The start method will wait until the DOM is loaded.
  ui.start('#ui-root', uiConfig);
}