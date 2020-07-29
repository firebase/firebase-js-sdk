/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/**
 * @license
 * Copyright 2017 Google LLC
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

/**
 * @fileoverview This code is for the most part copied over from the packages/auth/demo
 *   package.
 */

import { initializeApp } from '@firebase/app-exp';
import {
  applyActionCode,
  browserLocalPersistence,
  browserSessionPersistence,
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  fetchSignInMethodsForEmail,
  indexedDBLocalPersistence,
  initializeAuth,
  inMemoryPersistence,
  isSignInWithEmailLink,
  linkWithCredential,
  multiFactor,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  reauthenticateWithCredential,
  RecaptchaVerifier,
  sendEmailVerification,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  signInAnonymously,
  signInWithCredential,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  unlink,
  updateEmail,
  updatePassword,
  updateProfile,
  verifyPasswordResetCode,
  getMultiFactorResolver,
  OAuthProvider,
  GoogleAuthProvider,
  FacebookAuthProvider,
  TwitterAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  linkWithPopup,
  reauthenticateWithPopup,
  signInWithRedirect,
  linkWithRedirect,
  reauthenticateWithRedirect,
  getRedirectResult,
  browserPopupRedirectResolver
} from '@firebase/auth-exp';

import { config } from './config';
import {
  alertError,
  alertNotImplemented,
  alertSuccess,
  clearLogs,
  log,
  logAtLevel_
} from './logging';

let app = null;
let auth = null;
let currentTab = null;
let lastUser = null;
let applicationVerifier = null;
let multiFactorErrorResolver = null;
let selectedMultiFactorHint = null;
let recaptchaSize = 'normal';
let webWorker = null;

// The corresponding Font Awesome icons for each provider.
const providersIcons = {
  'google.com': 'fa-google',
  'facebook.com': 'fa-facebook-official',
  'twitter.com': 'fa-twitter-square',
  'github.com': 'fa-github',
  'yahoo.com': 'fa-yahoo',
  'phone': 'fa-phone'
};

/**
 * Returns the active user (i.e. currentUser or lastUser).
 * @return {!firebase.User}
 */
function activeUser() {
  const type = $('input[name=toggle-user-selection]:checked').val();
  if (type === 'lastUser') {
    return lastUser;
  } else {
    return auth.currentUser;
  }
}

/**
 * Refreshes the current user data in the UI, displaying a user info box if
 * a user is signed in, or removing it.
 */
function refreshUserData() {
  if (activeUser()) {
    const user = activeUser();
    $('.profile').show();
    $('body').addClass('user-info-displayed');
    $('div.profile-email,span.profile-email').text(user.email || 'No Email');
    $('div.profile-phone,span.profile-phone').text(
      user.phoneNumber || 'No Phone'
    );
    $('div.profile-uid,span.profile-uid').text(user.uid);
    $('div.profile-name,span.profile-name').text(user.displayName || 'No Name');
    $('input.profile-name').val(user.displayName);
    $('input.photo-url').val(user.photoURL);
    if (user.photoURL != null) {
      let photoURL = user.photoURL;
      // Append size to the photo URL for Google hosted images to avoid requesting
      // the image with its original resolution (using more bandwidth than needed)
      // when it is going to be presented in smaller size.
      if (
        photoURL.indexOf('googleusercontent.com') !== -1 ||
        photoURL.indexOf('ggpht.com') !== -1
      ) {
        photoURL = photoURL + '?sz=' + $('img.profile-image').height();
      }
      $('img.profile-image')
        .attr('src', photoURL)
        .show();
    } else {
      $('img.profile-image').hide();
    }
    $('.profile-email-verified').toggle(user.emailVerified);
    $('.profile-email-not-verified').toggle(!user.emailVerified);
    $('.profile-anonymous').toggle(user.isAnonymous);
    // Display/Hide providers icons.
    $('.profile-providers').empty();
    if (user['providerData'] && user['providerData'].length) {
      const providersCount = user['providerData'].length;
      for (let i = 0; i < providersCount; i++) {
        addProviderIcon(user['providerData'][i]['providerId']);
      }
    }
    // Show enrolled second factors if available for the active user.
    showMultiFactorStatus(user);
    // Change color.
    if (user === auth.currentUser) {
      $('#user-info').removeClass('last-user');
      $('#user-info').addClass('current-user');
    } else {
      $('#user-info').removeClass('current-user');
      $('#user-info').addClass('last-user');
    }
  } else {
    $('.profile').slideUp();
    $('body').removeClass('user-info-displayed');
    $('input.profile-data').val('');
  }
}

/**
 * Sets last signed in user and updates UI.
 * @param {?firebase.User} user The last signed in user.
 */
function setLastUser(user) {
  lastUser = user;
  if (user) {
    // Displays the toggle.
    $('#toggle-user').show();
    $('#toggle-user-placeholder').hide();
  } else {
    $('#toggle-user').hide();
    $('#toggle-user-placeholder').show();
  }
}

/**
 * Add a provider icon to the profile info.
 * @param {string} providerId The providerId of the provider.
 */
function addProviderIcon(providerId) {
  const pElt = $('<i>')
    .addClass('fa ' + providersIcons[providerId])
    .attr('title', providerId)
    .data({
      'toggle': 'tooltip',
      'placement': 'bottom'
    });
  $('.profile-providers').append(pElt);
  pElt.tooltip();
}

/**
 * Updates the active user's multi-factor enrollment status.
 * @param {!firebase.User} activeUser The corresponding user.
 */
function showMultiFactorStatus(activeUser) {
  mfaUser = multiFactor(activeUser);
  const enrolledFactors = (mfaUser && mfaUser.enrolledFactors) || [];
  const $listGroup = $('#user-info .dropdown-menu.enrolled-second-factors');
  // Hide the drop down menu initially.
  $listGroup
    .empty()
    .parent()
    .hide();
  if (enrolledFactors.length) {
    // If enrolled factors are available, show the drop down menu.
    $listGroup.parent().show();
    // Populate the enrolled factors.
    showMultiFactors(
      $listGroup,
      enrolledFactors,
      // On row click, do nothing. This is needed to prevent the drop down
      // menu from closing.
      e => {
        e.preventDefault();
        e.stopPropagation();
      },
      // On delete click unenroll the selected factor.
      function(e) {
        e.preventDefault();
        // Get the corresponding second factor index.
        const index = parseInt($(this).attr('data-index'), 10);
        // Get the second factor info.
        const info = enrolledFactors[index];
        // Get the display name. If not available, use uid.
        const label = info && (info.displayName || info.uid);
        if (label) {
          $('#enrolled-factors-drop-down').removeClass('open');
          mfaUser.unenroll(info).then(() => {
            refreshUserData();
            alertSuccess('Multi-factor successfully unenrolled.');
          }, onAuthError);
        }
      }
    );
  }
}

/**
 * Updates the UI when the user is successfully authenticated.
 * @param {!firebase.User} user User authenticated.
 */
function onAuthSuccess(user) {
  console.log(user);
  alertSuccess('User authenticated, id: ' + user.uid);
  refreshUserData();
}

/**
 * Displays an error message when the authentication failed.
 * @param {!Error} error Error message to display.
 */
function onAuthError(error) {
  logAtLevel_(error, 'error');
  if (error.code === 'auth/multi-factor-auth-required') {
    // Handle second factor sign-in.
    handleMultiFactorSignIn(getMultiFactorResolver(auth, error));
  } else {
    alertError('Error: ' + error.code);
  }
}

/**
 * Changes the UI when the user has been signed out.
 */
function signOut() {
  log('User successfully signed out.');
  alertSuccess('User successfully signed out.');
  refreshUserData();
}

/**
 * Saves the new language code provided in the language code input field.
 */
function onSetLanguageCode() {
  const languageCode = $('#language-code').val() || null;
  try {
    auth.languageCode = languageCode;
    alertSuccess('Language code changed to "' + languageCode + '".');
  } catch (error) {
    alertError('Error: ' + error.code);
  }
}

/**
 * Switches Auth instance language to device language.
 */
function onUseDeviceLanguage() {
  auth.useDeviceLanguage();
  $('#language-code').val(auth.languageCode);
  alertSuccess('Using device language "' + auth.languageCode + '".');
}

/**
 * Changes the Auth state persistence to the specified one.
 */
function onSetPersistence() {
  const type = $('#persistence-type').val();
  let persistence;
  switch (type) {
    case 'local':
      persistence = browserLocalPersistence;
      break;
    case 'session':
      persistence = browserSessionPersistence;
      break;
    case 'indexedDB':
      persistence = indexedDBLocalPersistence;
      break;
    case 'none':
      persistence = inMemoryPersistence;
      break;
    default:
      alertError('Unexpected persistence type: ' + type);
  }
  try {
    auth.setPersistence(persistence).then(
      () => {
        log('Persistence state change to "' + type + '".');
        alertSuccess('Persistence state change to "' + type + '".');
      },
      error => {
        alertError('Error: ' + error.code);
      }
    );
  } catch (error) {
    alertError('Error: ' + error.code);
  }
}

/**
 * Signs up a new user with an email and a password.
 */
function onSignUp() {
  const email = $('#signup-email').val();
  const password = $('#signup-password').val();
  createUserWithEmailAndPassword(auth, email, password).then(
    onAuthUserCredentialSuccess,
    onAuthError
  );
}

/**
 * Signs in a user with an email and a password.
 */
function onSignInWithEmailAndPassword() {
  const email = $('#signin-email').val();
  const password = $('#signin-password').val();
  signInWithEmailAndPassword(auth, email, password).then(
    onAuthUserCredentialSuccess,
    onAuthError
  );
}

/**
 * Signs in a user with an email link.
 */
function onSignInWithEmailLink() {
  const email = $('#sign-in-with-email-link-email').val();
  const link = $('#sign-in-with-email-link-link').val() || undefined;
  if (isSignInWithEmailLink(auth, link)) {
    signInWithEmailLink(auth, email, link).then(onAuthSuccess, onAuthError);
  } else {
    alertError('Sign in link is invalid');
  }
}

/**
 * Links a user with an email link.
 */
function onLinkWithEmailLink() {
  const email = $('#link-with-email-link-email').val();
  const link = $('#link-with-email-link-link').val() || undefined;
  const credential = EmailAuthProvider.credentialWithLink(email, link);
  linkWithCredential(activeUser(), credential).then(
    onAuthUserCredentialSuccess,
    onAuthError
  );
}

/**
 * Re-authenticate a user with email link credential.
 */
function onReauthenticateWithEmailLink() {
  const email = $('#link-with-email-link-email').val();
  const link = $('#link-with-email-link-link').val() || undefined;
  const credential = EmailAuthProvider.credentialWithLink(email, link);
  reauthenticateWithCredential(activeUser(), credential).then(result => {
    logAdditionalUserInfo(result);
    refreshUserData();
    alertSuccess('User reauthenticated!');
  }, onAuthError);
}

/**
 * Signs in with a custom token.
 * @param {DOMEvent} _event HTML DOM event returned by the listener.
 */
function onSignInWithCustomToken(_event) {
  // The token can be directly specified on the html element.
  const token = $('#user-custom-token').val();

  signInWithCustomToken(auth, token).then(
    onAuthUserCredentialSuccess,
    onAuthError
  );
}

/**
 * Signs in anonymously.
 */
function onSignInAnonymously() {
  signInAnonymously(auth).then(onAuthUserCredentialSuccess, onAuthError);
}

/**
 * Signs in with a generic IdP credential.
 */
function onSignInWithGenericIdPCredential() {
  alertNotImplemented();
  // var providerId = $('#signin-generic-idp-provider-id').val();
  // var idToken = $('#signin-generic-idp-id-token').val() || undefined;
  // var rawNonce = $('#signin-generic-idp-raw-nonce').val() || undefined;
  // var accessToken = $('#signin-generic-idp-access-token').val() || undefined;
  // var provider = new OAuthProvider(providerId);
  // signInWithCredential(
  //     auth,
  //     provider.credential({
  //       idToken: idToken,
  //       accessToken: accessToken,
  //       rawNonce: rawNonce,
  //     })).then(onAuthUserCredentialSuccess, onAuthError);
}

/**
 * Initializes the ApplicationVerifier.
 * @param {string} submitButtonId The ID of the DOM element of the button to
 *     which we attach the invisible reCAPTCHA. This is required even in visible
 *     mode.
 */
function makeApplicationVerifier(submitButtonId) {
  const container =
    recaptchaSize === 'invisible' ? submitButtonId : 'recaptcha-container';
  applicationVerifier = new RecaptchaVerifier(
    container,
    { 'size': recaptchaSize },
    auth
  );
}

/**
 * Clears the ApplicationVerifier.
 */
function clearApplicationVerifier() {
  if (applicationVerifier) {
    applicationVerifier.clear();
    applicationVerifier = null;
  }
}

/**
 * Sends a phone number verification code for sign-in.
 */
function onSignInVerifyPhoneNumber() {
  const phoneNumber = $('#signin-phone-number').val();
  const provider = new PhoneAuthProvider(auth);
  // Clear existing reCAPTCHA as an existing reCAPTCHA could be targeted for a
  // link/re-auth operation.
  clearApplicationVerifier();
  // Initialize a reCAPTCHA application verifier.
  makeApplicationVerifier('signin-verify-phone-number');
  provider.verifyPhoneNumber(phoneNumber, applicationVerifier).then(
    verificationId => {
      clearApplicationVerifier();
      $('#signin-phone-verification-id').val(verificationId);
      alertSuccess('Phone verification sent!');
    },
    error => {
      clearApplicationVerifier();
      onAuthError(error);
    }
  );
}

/**
 * Confirms a phone number verification for sign-in.
 */
function onSignInConfirmPhoneVerification() {
  const verificationId = $('#signin-phone-verification-id').val();
  const verificationCode = $('#signin-phone-verification-code').val();
  const credential = PhoneAuthProvider.credential(
    verificationId,
    verificationCode
  );
  signInOrLinkCredential(credential);
}

/**
 * Sends a phone number verification code for linking or reauth.
 */
function onLinkReauthVerifyPhoneNumber() {
  const phoneNumber = $('#link-reauth-phone-number').val();
  const provider = new PhoneAuthProvider(auth);
  // Clear existing reCAPTCHA as an existing reCAPTCHA could be targeted for a
  // sign-in operation.
  clearApplicationVerifier();
  // Initialize a reCAPTCHA application verifier.
  makeApplicationVerifier('link-reauth-verify-phone-number');
  provider.verifyPhoneNumber(phoneNumber, applicationVerifier).then(
    verificationId => {
      clearApplicationVerifier();
      $('#link-reauth-phone-verification-id').val(verificationId);
      alertSuccess('Phone verification sent!');
    },
    error => {
      clearApplicationVerifier();
      onAuthError(error);
    }
  );
}

/**
 * Updates the user's phone number.
 */
function onUpdateConfirmPhoneVerification() {
  if (!activeUser()) {
    alertError('You need to sign in before linking an account.');
    return;
  }
  const verificationId = $('#link-reauth-phone-verification-id').val();
  const verificationCode = $('#link-reauth-phone-verification-code').val();
  const credential = PhoneAuthProvider.credential(
    verificationId,
    verificationCode
  );
  activeUser()
    .updatePhoneNumber(credential)
    .then(() => {
      refreshUserData();
      alertSuccess('Phone number updated!');
    }, onAuthError);
}

/**
 * Confirms a phone number verification for linking.
 */
function onLinkConfirmPhoneVerification() {
  const verificationId = $('#link-reauth-phone-verification-id').val();
  const verificationCode = $('#link-reauth-phone-verification-code').val();
  const credential = PhoneAuthProvider.credential(
    verificationId,
    verificationCode
  );
  signInOrLinkCredential(credential);
}

/**
 * Confirms a phone number verification for reauthentication.
 */
function onReauthConfirmPhoneVerification() {
  const verificationId = $('#link-reauth-phone-verification-id').val();
  const verificationCode = $('#link-reauth-phone-verification-code').val();
  const credential = PhoneAuthProvider.credential(
    verificationId,
    verificationCode
  );
  reauthenticateWithCredential(activeUser(), credential).then(result => {
    logAdditionalUserInfo(result);
    refreshUserData();
    alertSuccess('User reauthenticated!');
  }, onAuthError);
}

/**
 * Sends a phone number verification code for enrolling second factor.
 */
function onStartEnrollWithPhoneMultiFactor() {
  const phoneNumber = $('#enroll-mfa-phone-number').val();
  if (!phoneNumber || !activeUser()) {
    return;
  }
  const provider = new PhoneAuthProvider(auth);
  // Clear existing reCAPTCHA as an existing reCAPTCHA could be targeted for a
  // sign-in operation.
  clearApplicationVerifier();
  // Initialize a reCAPTCHA application verifier.
  makeApplicationVerifier('enroll-mfa-verify-phone-number');
  multiFactor(activeUser())
    .getSession()
    .then(multiFactorSession => {
      const phoneInfoOptions = {
        phoneNumber,
        'session': multiFactorSession
      };
      return provider.verifyPhoneNumber(phoneInfoOptions, applicationVerifier);
    })
    .then(
      verificationId => {
        clearApplicationVerifier();
        $('#enroll-mfa-phone-verification-id').val(verificationId);
        alertSuccess('Phone verification sent!');
      },
      error => {
        clearApplicationVerifier();
        onAuthError(error);
      }
    );
}

/**
 * Confirms a phone number verification for MFA enrollment.
 */
function onFinalizeEnrollWithPhoneMultiFactor() {
  const verificationId = $('#enroll-mfa-phone-verification-id').val();
  const verificationCode = $('#enroll-mfa-phone-verification-code').val();
  if (!verificationId || !verificationCode || !activeUser()) {
    return;
  }
  const credential = PhoneAuthProvider.credential(
    verificationId,
    verificationCode
  );
  const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(
    auth,
    credential
  );
  const displayName = $('#enroll-mfa-phone-display-name').val() || undefined;

  multiFactor(activeUser())
    .enroll(multiFactorAssertion, displayName)
    .then(() => {
      refreshUserData();
      alertSuccess('Phone number enrolled!');
    }, onAuthError);
}

/**
 * Signs in or links a provider's credential, based on current tab opened.
 * @param {!AuthCredential} credential The provider's credential.
 */
function signInOrLinkCredential(credential) {
  if (currentTab === '#user-section') {
    if (!activeUser()) {
      alertError('You need to sign in before linking an account.');
      return;
    }

    linkWithCredential(activeUser(), credential).then(result => {
      logAdditionalUserInfo(result);
      refreshUserData();
      alertSuccess('Provider linked!');
    }, onAuthError);
  } else {
    signInWithCredential(auth, credential).then(
      onAuthUserCredentialSuccess,
      onAuthError
    );
  }
}

/** @return {!Object} The Action Code Settings object. */
function getActionCodeSettings() {
  const actionCodeSettings = {};
  const url = $('#continueUrl').val();
  const apn = $('#apn').val();
  const amv = $('#amv').val();
  const ibi = $('#ibi').val();
  const installApp = $('input[name=install-app]:checked').val() === 'Yes';
  const handleCodeInApp =
    $('input[name=handle-in-app]:checked').val() === 'Yes';
  if (url || apn || ibi) {
    actionCodeSettings['url'] = url;
    if (apn) {
      actionCodeSettings['android'] = {
        'packageName': apn,
        'installApp': !!installApp,
        'minimumVersion': amv || undefined
      };
    }
    if (ibi) {
      actionCodeSettings['iOS'] = {
        'bundleId': ibi
      };
    }
    actionCodeSettings['handleCodeInApp'] = handleCodeInApp;
  }
  return actionCodeSettings;
}

/** Reset action code settings form. */
function onActionCodeSettingsReset() {
  $('#continueUrl').val('');
  $('#apn').val('');
  $('#amv').val('');
  $('#ibi').val('');
}

/**
 * Changes the user's email.
 */
function onChangeEmail() {
  const email = $('#changed-email').val();
  updateEmail(activeUser(), email).then(() => {
    refreshUserData();
    alertSuccess('Email changed!');
  }, onAuthError);
}

/**
 * Changes the user's password.
 */
function onChangePassword() {
  const password = $('#changed-password').val();
  updatePassword(activeUser(), password).then(() => {
    refreshUserData();
    alertSuccess('Password changed!');
  }, onAuthError);
}

/**
 * Changes the user's password.
 */
function onUpdateProfile() {
  const displayName = $('#display-name').val();
  const photoURL = $('#photo-url').val();
  updateProfile(activeUser(), {
    displayName,
    photoURL
  }).then(() => {
    refreshUserData();
    alertSuccess('Profile updated!');
  }, onAuthError);
}

/**
 * Sends sign in with email link to the user.
 */
function onSendSignInLinkToEmail() {
  const email = $('#sign-in-with-email-link-email').val();
  sendSignInLinkToEmail(auth, email, getActionCodeSettings()).then(() => {
    alertSuccess('Email sent!');
  }, onAuthError);
}

/**
 * Sends sign in with email link to the user and pass in current url.
 */
function onSendSignInLinkToEmailCurrentUrl() {
  const email = $('#sign-in-with-email-link-email').val();
  const actionCodeSettings = {
    'url': window.location.href,
    'handleCodeInApp': true
  };

  sendSignInLinkToEmail(auth, email, actionCodeSettings).then(() => {
    if ('localStorage' in window && window['localStorage'] !== null) {
      window.localStorage.setItem(
        'emailForSignIn',
        // Save the email and the timestamp.
        JSON.stringify({
          email,
          timestamp: new Date().getTime()
        })
      );
    }
    alertSuccess('Email sent!');
  }, onAuthError);
}

/**
 * Sends email link to link the user.
 */
function onSendLinkEmailLink() {
  const email = $('#link-with-email-link-email').val();
  sendSignInLinkToEmail(auth, email, getActionCodeSettings()).then(() => {
    alertSuccess('Email sent!');
  }, onAuthError);
}

/**
 * Sends password reset email to the user.
 */
function onSendPasswordResetEmail() {
  const email = $('#password-reset-email').val();
  sendPasswordResetEmail(auth, email, getActionCodeSettings()).then(() => {
    alertSuccess('Email sent!');
  }, onAuthError);
}

/**
 * Verifies the password reset code entered by the user.
 */
function onVerifyPasswordResetCode() {
  const code = $('#password-reset-code').val();
  verifyPasswordResetCode(auth, code).then(() => {
    alertSuccess('Password reset code is valid!');
  }, onAuthError);
}

/**
 * Confirms the password reset with the code and password supplied by the user.
 */
function onConfirmPasswordReset() {
  const code = $('#password-reset-code').val();
  const password = $('#password-reset-password').val();
  confirmPasswordReset(auth, code, password).then(() => {
    alertSuccess('Password has been changed!');
  }, onAuthError);
}

/**
 * Gets the list of possible sign in methods for the given email address.
 */
function onFetchSignInMethodsForEmail() {
  const email = $('#fetch-sign-in-methods-email').val();
  fetchSignInMethodsForEmail(auth, email).then(signInMethods => {
    log('Sign in methods for ' + email + ' :');
    log(signInMethods);
    if (signInMethods.length === 0) {
      alertSuccess('Sign In Methods for ' + email + ': N/A');
    } else {
      alertSuccess(
        'Sign In Methods for ' + email + ': ' + signInMethods.join(', ')
      );
    }
  }, onAuthError);
}

/**
 * Fetches and logs the user's providers data.
 */
function onGetProviderData() {
  log('Providers data:');
  log(activeUser()['providerData']);
}

/**
 * Links a signed in user with an email and password account.
 */
function onLinkWithEmailAndPassword() {
  const email = $('#link-email').val();
  const password = $('#link-password').val();
  linkWithCredential(
    activeUser(),
    EmailAuthProvider.credential(email, password)
  ).then(onAuthUserCredentialSuccess, onAuthError);
}

/**
 * Links with a generic IdP credential.
 */
function onLinkWithGenericIdPCredential() {
  alertNotImplemented();
  // var providerId = $('#link-generic-idp-provider-id').val();
  // var idToken = $('#link-generic-idp-id-token').val() || undefined;
  // var rawNonce = $('#link-generic-idp-raw-nonce').val() || undefined;
  // var accessToken = $('#link-generic-idp-access-token').val() || undefined;
  // var provider = new OAuthProvider(providerId);
  // activeUser().linkWithCredential(
  //    provider.credential({
  //     idToken: idToken,
  //     accessToken: accessToken,
  //     rawNonce: rawNonce,
  //   })).then(onAuthUserCredentialSuccess, onAuthError);
}

/**
 * Unlinks the specified provider.
 */
function onUnlinkProvider() {
  const providerId = $('#unlinked-provider-id').val();
  unlink(activeUser(), providerId).then(_user => {
    alertSuccess('Provider unlinked from user.');
    refreshUserData();
  }, onAuthError);
}

/**
 * Sends email verification to the user.
 */
function onSendEmailVerification() {
  sendEmailVerification(activeUser(), getActionCodeSettings()).then(() => {
    alertSuccess('Email verification sent!');
  }, onAuthError);
}

/**
 * Confirms the email verification code given.
 */
function onApplyActionCode() {
  var code = $('#email-verification-code').val();
  applyActionCode(auth, code).then(function() {
    alertSuccess('Email successfully verified!');
    refreshUserData();
  }, onAuthError);
}

/**
 * Gets or refreshes the ID token.
 * @param {boolean} forceRefresh Whether to force the refresh of the token
 *     or not.
 */
function getIdToken(forceRefresh) {
  if (activeUser() == null) {
    alertError('No user logged in.');
    return;
  }
  if (activeUser().getIdToken) {
    activeUser()
      .getIdToken(forceRefresh)
      .then(alertSuccess, () => {
        log('No token');
      });
  } else {
    activeUser()
      .getToken(forceRefresh)
      .then(alertSuccess, () => {
        log('No token');
      });
  }
}

/**
 * Gets or refreshes the ID token result.
 * @param {boolean} forceRefresh Whether to force the refresh of the token
 *     or not
 */
function getIdTokenResult(forceRefresh) {
  if (activeUser() == null) {
    alertError('No user logged in.');
    return;
  }
  activeUser()
    .getIdTokenResult(forceRefresh)
    .then(idTokenResult => {
      alertSuccess(JSON.stringify(idTokenResult));
    }, onAuthError);
}

/**
 * Triggers the retrieval of the ID token result.
 */
function onGetIdTokenResult() {
  getIdTokenResult(false);
}

/**
 * Triggers the refresh of the ID token result.
 */
function onRefreshTokenResult() {
  getIdTokenResult(true);
}

/**
 * Triggers the retrieval of the ID token.
 */
function onGetIdToken() {
  getIdToken(false);
}

/**
 * Triggers the refresh of the ID token.
 */
function onRefreshToken() {
  getIdToken(true);
}

/**
 * Signs out the user.
 */
function onSignOut() {
  setLastUser(auth.currentUser);
  auth.signOut().then(signOut, onAuthError);
}

/**
 * Handles multi-factor sign-in completion.
 * @param {!MultiFactorResolver} resolver The multi-factor error
 *     resolver.
 */
function handleMultiFactorSignIn(resolver) {
  // Save multi-factor error resolver.
  multiFactorErrorResolver = resolver;
  // Populate 2nd factor options from resolver.
  const $listGroup = $('#multiFactorModal div.enrolled-second-factors');
  // Populate the list of 2nd factors in the list group specified.
  showMultiFactors(
    $listGroup,
    multiFactorErrorResolver.hints,
    // On row click, select the corresponding second factor to complete
    // sign-in with.
    function(e) {
      e.preventDefault();
      // Remove all other active entries.
      $listGroup.find('a').removeClass('active');
      // Mark current entry as active.
      $(this).addClass('active');
      // Select current factor.
      onSelectMultiFactorHint(parseInt($(this).attr('data-index'), 10));
    },
    // Do not show delete option
    null
  );
  // Hide phone form (other second factor types could be supported).
  $('#multi-factor-phone').addClass('hidden');
  // Show second factor recovery dialog.
  $('#multiFactorModal').modal();
}

/**
 * Displays the list of multi-factors in the provided list group.
 * @param {!jQuery<!HTMLElement>} $listGroup The list group where the enrolled
 *     factors will be displayed.
 * @param {!Array<!MultiFactorInfo>} multiFactorInfo The list of
 *     multi-factors to display.
 * @param {?function(!jQuery.Event)} onClick The click handler when a second
 *     factor is clicked.
 * @param {?function(!jQuery.Event)} onDelete The click handler when a second
 *     factor is delete. If not provided, no delete button is shown.
 */
function showMultiFactors($listGroup, multiFactorInfo, onClick, onDelete) {
  // Append entry to list.
  $listGroup.empty();
  $.each(multiFactorInfo, i => {
    // Append entry to list.
    const info = multiFactorInfo[i];
    const displayName = info.displayName || 'N/A';
    const $a = $('<a href="#" />')
      .addClass('list-group-item')
      .addClass('list-group-item-action')
      // Set index on entry.
      .attr('data-index', i)
      .appendTo($listGroup);
    $a.append($('<h4 class="list-group-item-heading" />').text(info.uid));
    $a.append($('<span class="badge" />').text(info.factorId));
    $a.append($('<p class="list-group-item-text" />').text(displayName));
    if (info.phoneNumber) {
      $a.append($('<small />').text(info.phoneNumber));
    }
    // Check if a delete button is to be displayed.
    if (onDelete) {
      const $deleteBtn = $(
        '<span class="pull-right button-group">' +
          '<button type="button" class="btn btn-danger btn-xs delete-factor" ' +
          'data-index="' +
          i.toString() +
          '">' +
          '<i class="fa fa-trash" data-title="Remove" />' +
          '</button>' +
          '</span>'
      );
      // Append delete button to row.
      $a.append($deleteBtn);
      // Add delete button click handler.
      $a.find('button.delete-factor').click(onDelete);
    }
    // On entry click.
    if (onClick) {
      $a.click(onClick);
    }
  });
}

/**
 * Handles the user selection of second factor to complete sign-in with.
 * @param {number} index The selected multi-factor hint index.
 */
function onSelectMultiFactorHint(index) {
  // Hide all forms for handling each type of second factors.
  // Currently only phone is supported.
  $('#multi-factor-phone').addClass('hidden');
  if (
    !multiFactorErrorResolver ||
    typeof multiFactorErrorResolver.hints[index] === 'undefined'
  ) {
    return;
  }

  if (multiFactorErrorResolver.hints[index].factorId === 'phone') {
    // Save selected second factor.
    selectedMultiFactorHint = multiFactorErrorResolver.hints[index];
    // Show options for phone 2nd factor.
    // Get reCAPTCHA ready.
    clearApplicationVerifier();
    makeApplicationVerifier('send-2fa-phone-code');
    // Show sign-in with phone second factor menu.
    $('#multi-factor-phone').removeClass('hidden');
    // Clear all input.
    $('#multi-factor-sign-in-verification-id').val('');
    $('#multi-factor-sign-in-verification-code').val('');
  } else {
    // 2nd factor not found or not supported by app.
    alertError('Selected 2nd factor is not supported!');
  }
}

/**
 * Start sign-in with the 2nd factor phone number.
 * @param {!jQuery.Event} event The jQuery event object.
 */
function onStartSignInWithPhoneMultiFactor(event) {
  event.preventDefault();
  // Make sure a second factor is selected.
  if (!selectedMultiFactorHint || !multiFactorErrorResolver) {
    return;
  }
  // Initialize a reCAPTCHA application verifier.
  const provider = new PhoneAuthProvider(auth);
  const signInRequest = {
    multiFactorHint: selectedMultiFactorHint,
    session: multiFactorErrorResolver.session
  };
  provider.verifyPhoneNumber(signInRequest, applicationVerifier).then(
    verificationId => {
      clearApplicationVerifier();
      $('#multi-factor-sign-in-verification-id').val(verificationId);
      alertSuccess('Phone verification sent!');
    },
    error => {
      clearApplicationVerifier();
      onAuthError(error);
    }
  );
}

/**
 * Completes sign-in with the 2nd factor phone assertion.
 * @param {!jQuery.Event} event The jQuery event object.
 */
function onFinalizeSignInWithPhoneMultiFactor(event) {
  event.preventDefault();
  const verificationId = $('#multi-factor-sign-in-verification-id').val();
  const code = $('#multi-factor-sign-in-verification-code').val();
  if (!code || !verificationId || !multiFactorErrorResolver) {
    return;
  }
  const cred = PhoneAuthProvider.credential(verificationId, code);
  const assertion = PhoneMultiFactorGenerator.assertion(auth, cred);
  multiFactorErrorResolver.resolveSignIn(assertion).then(userCredential => {
    onAuthUserCredentialSuccess(userCredential);
    $('#multiFactorModal').modal('hide');
  }, onAuthError);
}

/**
 * Adds a new row to insert an OAuth custom parameter key/value pair.
 * @param {!jQuery.Event} _event The jQuery event object.
 */
function onPopupRedirectAddCustomParam(_event) {
  // Form container.
  let html = '<form class="customParamItem form form-bordered no-submit">';
  // OAuth parameter key input.
  html +=
    '<input type="text" class="form-control customParamKey" ' +
    'placeholder="OAuth Parameter Key"/>';
  // OAuth parameter value input.
  html +=
    '<input type="text" class="form-control customParamValue" ' +
    'placeholder="OAuth Parameter Value"/>';
  // Button to remove current key/value pair.
  html += '<button class="btn btn-block btn-primary">Remove</button>';
  html += '</form>';
  // Create jQuery node.
  const $node = $(html);
  // Add button click event listener to remove item.
  $node.find('button').on('click', function(e) {
    // Remove button click event listener.
    $(this).off('click');
    // Get row container and remove it.
    $(this)
      .closest('form.customParamItem')
      .remove();
    e.preventDefault();
  });
  // Append constructed row to parameter list container.
  $('#popup-redirect-custom-parameters').append($node);
}

/**
 * Performs the corresponding popup/redirect action for a generic provider.
 */
function onPopupRedirectGenericProviderClick() {
  var providerId = $('#popup-redirect-generic-providerid').val();
  var provider = new OAuthProvider(providerId);
  signInWithPopupRedirect(provider);
}

/**
 * Performs the corresponding popup/redirect action for a SAML provider.
 */
function onPopupRedirectSamlProviderClick() {
  alertNotImplemented();
  // var providerId = $('#popup-redirect-saml-providerid').val();
  // var provider = new SAMLAuthProvider(providerId);
  // signInWithPopupRedirect(provider);
}

/**
 * Performs the corresponding popup/redirect action based on user's selection.
 * @param {!jQuery.Event} _event The jQuery event object.
 */
function onPopupRedirectProviderClick(_event) {
  const providerId = $(event.currentTarget).data('provider');
  let provider = null;
  switch (providerId) {
      case 'google.com':
        provider = new GoogleAuthProvider();
        break;
      case 'facebook.com':
        provider = new FacebookAuthProvider();
        break;
      case 'github.com':
        provider = new GithubAuthProvider();
        break;
      case 'twitter.com':
        provider = new TwitterAuthProvider();
        break;
    default:
      return;
  }
  signInWithPopupRedirect(provider);
}

/**
 * Performs a popup/redirect action based on a given provider and the user's
 * selections.
 * @param {!AuthProvider} provider The provider with which to
 *     sign in.
 */
function signInWithPopupRedirect(provider) {
  const glob = {
    signInWithPopup,
    linkWithPopup,
    reauthenticateWithPopup,
    signInWithRedirect,
    linkWithRedirect,
    reauthenticateWithRedirect
  };
  let action = $('input[name=popup-redirect-action]:checked').val();
  let type = $('input[name=popup-redirect-type]:checked').val();
  let method = null;
  let inst = null;

  if (action == 'link' || action == 'reauthenticate') {
    if (!activeUser()) {
      alertError('No user logged in.');
      return;
    }
    inst = activeUser();
    method = action + 'With';
  } else {
    inst = auth;
    method = 'signInWith';
  }
  if (type === 'popup') {
    method += 'Popup';
  } else {
    method += 'Redirect';
  }
  // Get custom OAuth parameters.
  const customParameters = {};
  // For each entry.
  $('form.customParamItem').each(function(_index) {
    // Get parameter key.
    const key = $(this)
      .find('input.customParamKey')
      .val();
    // Get parameter value.
    const value = $(this)
      .find('input.customParamValue')
      .val();
    // Save to list if valid.
    if (key && value) {
      customParameters[key] = value;
    }
  });
  console.log('customParameters: ', customParameters);
  // For older jscore versions that do not support this.
  if (provider.setCustomParameters) {
    // Set custom parameters on current provider.
    provider.setCustomParameters(customParameters);
  }

  // Add scopes for providers who do have scopes available (i.e. not Twitter).
  if (provider.addScope) {
    // String.prototype.trim not available in IE8.
    const scopes = $.trim($('#scopes').val()).split(/\s*,\s*/);
    for (let i = 0; i < scopes.length; i++) {
      provider.addScope(scopes[i]);
    }
  }
  console.log('Provider:');
  console.log(provider);
  if (type == 'popup') {
    glob[method](inst, provider, browserPopupRedirectResolver).then(
      response => {
        console.log('Popup response:');
        console.log(response);
        alertSuccess(
          action + ' with ' + provider['providerId'] + ' successful!'
        );
        logAdditionalUserInfo(response);
        onAuthSuccess(activeUser());
      },
      onAuthError
    );
  } else {
    try {
      glob[method](inst, provider, browserPopupRedirectResolver).catch(
        onAuthError
      );
    } catch (error) {
      console.log('Error while calling ' + method);
      console.error(error);
    }
  }
}

/**
 * Displays user credential result.
 * @param {!UserCredential} result The UserCredential result
 *     object.
 */
function onAuthUserCredentialSuccess(result) {
  onAuthSuccess(result.user);
  logAdditionalUserInfo(result);
}

/**
 * Displays redirect result.
 */
function onGetRedirectResult() {
  getRedirectResult(auth, browserPopupRedirectResolver).then(function(
    response
  ) {
    log('Redirect results:');
    if (response.credential) {
      log('Credential:');
      log(response.credential);
    } else {
      log('No credential');
    }
    if (response.user) {
      log("User's id:");
      log(response.user.uid);
    } else {
      log('No user');
    }
    logAdditionalUserInfo(response);
    console.log(response);
  },
  onAuthError);
}

/**
 * Logs additional user info returned by a sign-in event, if available.
 * @param {!Object} response
 */
function logAdditionalUserInfo(response) {
  if (response.additionalUserInfo) {
    if (response.additionalUserInfo.username) {
      log(
        response.additionalUserInfo['providerId'] +
          ' username: ' +
          response.additionalUserInfo.username
      );
    }
    if (response.additionalUserInfo.profile) {
      log(response.additionalUserInfo['providerId'] + ' profile information:');
      log(JSON.stringify(response.additionalUserInfo.profile, null, 2));
    }
    if (typeof response.additionalUserInfo.isNewUser !== 'undefined') {
      log(
        response.additionalUserInfo['providerId'] +
          ' isNewUser: ' +
          response.additionalUserInfo.isNewUser
      );
    }
    if (response.credential) {
      log('credential: ' + JSON.stringify(response.credential.toJSON()));
    }
  }
}

/**
 * Deletes the user account.
 */
function onDelete() {
  activeUser()
    ['delete']()
    .then(() => {
      log('User successfully deleted.');
      alertSuccess('User successfully deleted.');
      refreshUserData();
    }, onAuthError);
}

/**
 * Gets a specific query parameter from the current URL.
 * @param {string} name Name of the parameter.
 * @return {string} The query parameter requested.
 */
function getParameterByName(name) {
  const url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)');
  const results = regex.exec(url);
  if (!results) {
    return null;
  }
  if (!results[2]) {
    return '';
  }
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

/**
 * Detects if an action code is passed in the URL, and populates accordingly
 * the input field for the confirm email verification process.
 */
function populateActionCodes() {
  let emailForSignIn = null;
  let signInTime = 0;
  if ('localStorage' in window && window['localStorage'] !== null) {
    try {
      // Try to parse as JSON first using new storage format.
      const emailForSignInData = JSON.parse(
        window.localStorage.getItem('emailForSignIn')
      );
      emailForSignIn = emailForSignInData['email'] || null;
      signInTime = emailForSignInData['timestamp'] || 0;
    } catch (e) {
      // JSON parsing failed. This means the email is stored in the old string
      // format.
      emailForSignIn = window.localStorage.getItem('emailForSignIn');
    }
    if (emailForSignIn) {
      // Clear old codes. Old format codes should be cleared immediately.
      if (new Date().getTime() - signInTime >= 1 * 24 * 3600 * 1000) {
        // Remove email from storage.
        window.localStorage.removeItem('emailForSignIn');
      }
    }
  }
  const actionCode = getParameterByName('oobCode');
  if (actionCode != null) {
    const mode = getParameterByName('mode');
    if (mode === 'verifyEmail') {
      $('#email-verification-code').val(actionCode);
    } else if (mode === 'resetPassword') {
      $('#password-reset-code').val(actionCode);
    } else if (mode === 'signIn') {
      if (emailForSignIn) {
        $('#sign-in-with-email-link-email').val(emailForSignIn);
        $('#sign-in-with-email-link-link').val(window.location.href);
        onSignInWithEmailLink();
        // Remove email from storage as the code is only usable once.
        window.localStorage.removeItem('emailForSignIn');
      }
    } else {
      $('#email-verification-code').val(actionCode);
      $('#password-reset-code').val(actionCode);
    }
  }
}

/**
 * Provides basic Database checks for authenticated and unauthenticated access.
 * The Database node being tested has the following rule:
 * "users": {
 *   "$user_id": {
 *     ".read": "$user_id === auth.uid",
 *     ".write": "$user_id === auth.uid"
 *   }
 * }
 * This applies when Real-time database service is available.
 */
function checkDatabaseAuthAccess() {
  const randomString = Math.floor(Math.random() * 10000000).toString();
  let dbRef;
  let dbPath;
  let errMessage;
  // Run this check only when Database module is available.
  if (
    typeof firebase !== 'undefined' &&
    typeof firebase.database !== 'undefined'
  ) {
    if (lastUser && !auth.currentUser) {
      dbPath = 'users/' + lastUser.uid;
      // After sign out, confirm read/write access to users/$user_id blocked.
      dbRef = firebase.database().ref(dbPath);
      dbRef
        .set({
          'test': randomString
        })
        .then(() => {
          alertError(
            'Error: Unauthenticated write to Database node ' +
              dbPath +
              ' unexpectedly succeeded!'
          );
        })
        .catch(error => {
          errMessage = error.message.toLowerCase();
          // Permission denied error should be thrown.
          if (errMessage.indexOf('permission_denied') === -1) {
            alertError('Error: ' + error.code);
            return;
          }
          dbRef
            .once('value')
            .then(() => {
              alertError(
                'Error: Unauthenticated read to Database node ' +
                  dbPath +
                  ' unexpectedly succeeded!'
              );
            })
            .catch(error => {
              errMessage = error.message.toLowerCase();
              // Permission denied error should be thrown.
              if (errMessage.indexOf('permission_denied') === -1) {
                alertError('Error: ' + error.code);
                return;
              }
              log(
                'Unauthenticated read/write to Database node ' +
                  dbPath +
                  ' failed as expected!'
              );
            });
        });
    } else if (auth.currentUser) {
      dbPath = 'users/' + auth.currentUser.uid;
      // Confirm read/write access to users/$user_id allowed.
      dbRef = firebase.database().ref(dbPath);
      dbRef
        .set({
          'test': randomString
        })
        .then(() => {
          return dbRef.once('value');
        })
        .then(snapshot => {
          if (snapshot.val().test === randomString) {
            // read/write successful.
            log(
              'Authenticated read/write to Database node ' +
                dbPath +
                ' succeeded!'
            );
          } else {
            throw new Error(
              'Authenticated read/write to Database node ' + dbPath + ' failed!'
            );
          }
          // Clean up: clear that node's content.
          return dbRef.remove();
        })
        .catch(error => {
          alertError('Error: ' + error.code);
        });
    }
  }
}

/**
 * Runs various Firebase Auth tests in a web worker environment and confirms the
 * expected behavior. This is useful for manual testing in different browsers.
 * @param {string} googleIdToken The Google ID token to sign in with.
 */
function onRunWebWorkTests() {
  if (!webWorker) {
    alertError('Error: Web workers are not supported in the current browser!');
    return;
  }
  // auth.signInWithPopup(new GoogleAuthProvider()).then(
  //   (result) => {
  webWorker.postMessage({
    type: 'RUN_TESTS'
    // googleIdToken: result.credential.idToken
  });
  //   },
  //   error => {
  //     alertError('Error code: ' + error.code + ' message: ' + error.message);
  //   }
  // );
}

/** Runs service worker tests if supported. */
function onRunServiceWorkTests() {
  $.ajax('/checkIfAuthenticated').then(
    (data, _textStatus, _jqXHR) => {
      alertSuccess('User authenticated: ' + data.uid);
    },
    (jqXHR, _textStatus, _errorThrown) => {
      alertError(jqXHR.status + ': ' + JSON.stringify(jqXHR.responseJSON));
    }
  );
}

/** Copy last user to auth. */
function onCopyLastUser() {
  // If last user is null, NULL_USER error will be thrown.
  auth.updateCurrentUser(lastUser).then(
    () => {
      alertSuccess('Copied last user to Auth');
    },
    error => {
      alertError('Error: ' + error.code);
    }
  );
}

/** Applies selected auth settings change. */
function onApplyAuthSettingsChange() {
  try {
    auth.settings.appVerificationDisabledForTesting =
      $('input[name=enable-app-verification]:checked').val() === 'No';
    alertSuccess('Auth settings changed');
  } catch (error) {
    alertError('Error: ' + error.code);
  }
}

/**
 * Initiates the application by setting event listeners on the various buttons.
 */
function initApp() {
  log('Initializing app...');
  app = initializeApp(config);
  auth = initializeAuth(app, {
    persistence: browserSessionPersistence,
    popupRedirectResolver: browserPopupRedirectResolver
  });

  // tempApp = initializeApp({
  //   'apiKey': config['apiKey'],
  //   'authDomain': config['authDomain']
  // }, auth['name'] + '-temp');
  // tempAuth = initializeApp(tempApp);

  // Listen to reCAPTCHA config togglers.
  initRecaptchaToggle(size => {
    clearApplicationVerifier();
    recaptchaSize = size;
  });

  // The action code for email verification or password reset
  // can be passed in the url address as a parameter, and for convenience
  // this preloads the input field.
  populateActionCodes();

  // Allows to login the user if previously logged in.
  if (auth.onIdTokenChanged) {
    auth.onIdTokenChanged(user => {
      refreshUserData();
      if (user) {
        user.getIdTokenResult(false).then(
          idTokenResult => {
            log(JSON.stringify(idTokenResult));
          },
          () => {
            log('No token.');
          }
        );
      } else {
        log('No user logged in.');
      }
    });
  }

  if (auth.onAuthStateChanged) {
    auth.onAuthStateChanged(user => {
      if (user) {
        log('user state change detected: ' + user.uid);
      } else {
        log('user state change detected: no user');
      }
      // Check Database Auth access.
      checkDatabaseAuthAccess();
    });
  }

  /**
   * @fileoverview Utilities for Auth test app features.
   */

  /**
   * Initializes the widget for toggling reCAPTCHA size.
   * @param {function(string):void} callback The callback to call when the
   *     size toggler is changed, which takes in the new reCAPTCHA size.
   */
  function initRecaptchaToggle(callback) {
    // Listen to recaptcha config togglers.
    const $recaptchaConfigTogglers = $('.toggleRecaptcha');
    $recaptchaConfigTogglers.click(function(e) {
      // Remove currently active option.
      $recaptchaConfigTogglers.removeClass('active');
      // Set currently selected option.
      $(this).addClass('active');
      // Get the current reCAPTCHA setting label.
      const size = $(e.target)
        .text()
        .toLowerCase();
      callback(size);
    });
  }

  // Install servicerWorker if supported.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then(reg => {
        // Registration worked.
        console.log('Registration succeeded. Scope is ' + reg.scope);
      })
      .catch(error => {
        // Registration failed.
        console.log('Registration failed with ' + error.message);
      });
  }

  if (window.Worker) {
    webWorker = new Worker('/web-worker.js');
    /**
     * Handles the incoming message from the web worker.
     * @param {!Object} e The message event received.
     */
    webWorker.onmessage = function(e) {
      console.log('User data passed through web worker: ', e.data);
      switch (e.data.type) {
        case 'GET_USER_INFO':
          alertSuccess(
            'User data passed through web worker: ' + JSON.stringify(e.data)
          );
          break;
        case 'RUN_TESTS':
          if (e.data.status === 'success') {
            alertSuccess('Web worker tests ran successfully!');
          } else {
            alertError('Error: ' + JSON.stringify(e.data.error));
          }
          break;
        default:
          return;
      }
    };
  }

  /**
   * Asks the web worker, if supported in current browser, to return the user info
   * corresponding to the currentUser as seen within the worker.
   */
  function onGetCurrentUserDataFromWebWorker() {
    if (webWorker) {
      webWorker.postMessage({ type: 'GET_USER_INFO' });
    } else {
      alertError(
        'Error: Web workers are not supported in the current browser!'
      );
    }
  }

  // We check for redirect result to refresh user's data.
  getRedirectResult(auth, browserPopupRedirectResolver).then(function(
    response
  ) {
    refreshUserData();
    logAdditionalUserInfo(response);
  },
  onAuthError);

  // Bootstrap tooltips.
  $('[data-toggle="tooltip"]').tooltip();

  // Auto submit the choose library type form.
  $('#library-form').on('change', 'input.library-option', () => {
    $('#library-form').submit();
  });

  // To clear the logs in the page.
  $('.clear-logs').click(clearLogs);

  // Disables JS forms.
  $('form.no-submit').on('submit', () => {
    return false;
  });

  // Keeps track of the current tab opened.
  $('#tab-menu a').click(event => {
    currentTab = $(event.currentTarget).attr('href');
  });

  // Toggles user.
  $('input[name=toggle-user-selection]').change(refreshUserData);

  // Actions listeners.
  $('#sign-up-with-email-and-password').click(onSignUp);
  $('#sign-in-with-email-and-password').click(onSignInWithEmailAndPassword);
  $('.sign-in-with-custom-token').click(onSignInWithCustomToken);
  $('#sign-in-anonymously').click(onSignInAnonymously);
  $('#sign-in-with-generic-idp-credential').click(
    onSignInWithGenericIdPCredential
  );
  $('#signin-verify-phone-number').click(onSignInVerifyPhoneNumber);
  $('#signin-confirm-phone-verification').click(
    onSignInConfirmPhoneVerification
  );
  // On enter click in verification code, complete phone sign-in. This prevents
  // reCAPTCHA from being re-rendered (default behavior on enter).
  $('#signin-phone-verification-code').keypress(e => {
    if (e.which === 13) {
      onSignInConfirmPhoneVerification();
      e.preventDefault();
    }
  });
  $('#sign-in-with-email-link').click(onSignInWithEmailLink);
  $('#link-with-email-link').click(onLinkWithEmailLink);
  $('#reauth-with-email-link').click(onReauthenticateWithEmailLink);

  $('#change-email').click(onChangeEmail);
  $('#change-password').click(onChangePassword);
  $('#update-profile').click(onUpdateProfile);

  $('#send-sign-in-link-to-email').click(onSendSignInLinkToEmail);
  $('#send-sign-in-link-to-email-current-url').click(
    onSendSignInLinkToEmailCurrentUrl
  );
  $('#send-link-email-link').click(onSendLinkEmailLink);

  $('#send-password-reset-email').click(onSendPasswordResetEmail);
  $('#verify-password-reset-code').click(onVerifyPasswordResetCode);
  $('#confirm-password-reset').click(onConfirmPasswordReset);

  $('#get-provider-data').click(onGetProviderData);
  $('#link-with-email-and-password').click(onLinkWithEmailAndPassword);
  $('#link-with-generic-idp-credential').click(onLinkWithGenericIdPCredential);
  $('#unlink-provider').click(onUnlinkProvider);
  $('#link-reauth-verify-phone-number').click(onLinkReauthVerifyPhoneNumber);
  $('#update-confirm-phone-verification').click(
    onUpdateConfirmPhoneVerification
  );
  $('#link-confirm-phone-verification').click(onLinkConfirmPhoneVerification);
  $('#reauth-confirm-phone-verification').click(
    onReauthConfirmPhoneVerification
  );
  // On enter click in verification code, complete phone sign-in. This prevents
  // reCAPTCHA from being re-rendered (default behavior on enter).
  $('#link-reauth-phone-verification-code').keypress(e => {
    if (e.which === 13) {
      // User first option option as default.
      onUpdateConfirmPhoneVerification();
      e.preventDefault();
    }
  });

  $('#send-email-verification').click(onSendEmailVerification);
  $('#confirm-email-verification').click(onApplyActionCode);
  $('#get-token-result').click(onGetIdTokenResult);
  $('#refresh-token-result').click(onRefreshTokenResult);
  $('#get-token').click(onGetIdToken);
  $('#refresh-token').click(onRefreshToken);
  $('#get-token-worker').click(onGetCurrentUserDataFromWebWorker);
  $('#sign-out').click(onSignOut);

  $('.popup-redirect-provider').click(onPopupRedirectProviderClick);
  $('#popup-redirect-generic').click(onPopupRedirectGenericProviderClick);
  $('#popup-redirect-get-redirect-result').click(onGetRedirectResult);
  $('#popup-redirect-add-custom-parameter').click(
    onPopupRedirectAddCustomParam
  );
  $('#popup-redirect-saml').click(onPopupRedirectSamlProviderClick);

  $('#action-code-settings-reset').click(onActionCodeSettingsReset);

  $('#delete').click(onDelete);

  $('#set-persistence').click(onSetPersistence);

  $('#set-language-code').click(onSetLanguageCode);
  $('#use-device-language').click(onUseDeviceLanguage);

  $('#fetch-sign-in-methods-for-email').click(onFetchSignInMethodsForEmail);

  $('#run-web-worker-tests').click(onRunWebWorkTests);
  $('#run-service-worker-tests').click(onRunServiceWorkTests);
  // $('#copy-active-user').click(onCopyActiveUser);
  $('#copy-last-user').click(onCopyLastUser);

  $('#apply-auth-settings-change').click(onApplyAuthSettingsChange);

  // Multi-factor operations.
  // Starts multi-factor sign-in with selected phone number.
  $('#send-2fa-phone-code').click(onStartSignInWithPhoneMultiFactor);
  // Completes multi-factor sign-in with supplied SMS code.
  $('#sign-in-with-phone-multi-factor').click(
    onFinalizeSignInWithPhoneMultiFactor
  );
  // Starts multi-factor enrollment with phone number.
  $('#enroll-mfa-verify-phone-number').click(onStartEnrollWithPhoneMultiFactor);
  // Completes multi-factor enrollment with supplied SMS code.
  $('#enroll-mfa-confirm-phone-verification').click(
    onFinalizeEnrollWithPhoneMultiFactor
  );
}

$(initApp);
