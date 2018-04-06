/**
 * Copyright 2017 Google Inc.
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
 * @fileoverview Common javascript for the application.
 */

var app = null;
var auth = null;
var currentTab = null;
var lastUser = null;
var applicationVerifier = null;
var recaptchaSize = 'normal';

// Fix for IE8 when developer's console is not opened.
if (!window.console) {
  window.console = {
    log: function() {},
    error: function() {}
  };
}


// The corresponding Font Awesome icons for each provider.
var providersIcons = {
  'google.com': 'fa-google',
  'facebook.com': 'fa-facebook-official',
  'twitter.com': 'fa-twitter-square',
  'github.com': 'fa-github'
};


/**
 * Logs the message in the console and on the log window in the app
 * using the level given.
 * @param {?Object} message Object or message to log.
 * @param {string} level The level of log (log, error, debug).
 * @private
 */
function logAtLevel_(message, level) {
  if (message != null) {
    var messageDiv = $('<div></div>');
    messageDiv.addClass(level);
    if (typeof message === 'object') {
      messageDiv.text(JSON.stringify(message, null, '  '));
    } else {
      messageDiv.text(message);
    }
    $('.logs').append(messageDiv);
  }
  console[level](message);
}


/**
 * Logs info level.
 * @param {string} message Object or message to log.
 */
function log(message) {
  logAtLevel_(message, 'log');
}

/**
 * Clear the logs.
 */
function clearLogs() {
  $('.logs').text('');
}


/**
 * Displays for a few seconds a box with a specific message and then fades
 * it out.
 * @param {string} message Small message to display.
 * @param {string} cssClass The class(s) to give the alert box.
 * @private
 */
function alertMessage_(message, cssClass) {
  var alertBox = $('<div></div>')
      .addClass(cssClass)
      .css('display', 'none')
      .text(message);
  $('#alert-messages').prepend(alertBox);
  alertBox.fadeIn({
    complete: function() {
      setTimeout(function() {
        alertBox.slideUp();
      }, 3000);
    }
  });
}


/**
 * Alerts a small success message in a overlaying alert box.
 * @param {string} message Small message to display.
 */
function alertSuccess(message) {
  alertMessage_(message, 'alert alert-success');
}


/**
 * Alerts a small error message in a overlaying alert box.
 * @param {string} message Small message to display.
 */
function alertError(message) {
  alertMessage_(message, 'alert alert-danger');
}


/**
 * Returns the active user (i.e. currentUser or lastUser).
 * @return {!firebase.User}
 */
function activeUser() {
  var type = $("input[name=toggle-user-selection]:checked").val();
  if (type == 'lastUser') {
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
    var user = activeUser();
    $('.profile').show();
    $('body').addClass('user-info-displayed');
    $('div.profile-email,span.profile-email').text(user.email || 'No Email');
    $('div.profile-phone,span.profile-phone')
        .text(user.phoneNumber || 'No Phone');
    $('div.profile-uid,span.profile-uid').text(user.uid);
    $('div.profile-name,span.profile-name').text(user.displayName || 'No Name');
    $('input.profile-name').val(user.displayName);
    $('input.photo-url').val(user.photoURL);
    if (user.photoURL != null) {
      var photoURL = user.photoURL;
      // Append size to the photo URL for Google hosted images to avoid requesting
      // the image with its original resolution (using more bandwidth than needed)
      // when it is going to be presented in smaller size.
      if ((photoURL.indexOf('googleusercontent.com') != -1) ||
          (photoURL.indexOf('ggpht.com') != -1)) {
        photoURL = photoURL + '?sz=' + $('img.profile-image').height();
      }
      $('img.profile-image').attr('src', photoURL).show();
    } else {
      $('img.profile-image').hide();
    }
    $('.profile-email-verified').toggle(user.emailVerified);
    $('.profile-email-not-verified').toggle(!user.emailVerified);
    $('.profile-anonymous').toggle(user.isAnonymous);
    // Display/Hide providers icons.
    $('.profile-providers').empty();
    if (user['providerData'] && user['providerData'].length) {
      var providersCount = user['providerData'].length;
      for (var i = 0; i < providersCount; i++) {
        addProviderIcon(user['providerData'][i]['providerId']);
      }
    }
    // Change color.
    if (user == auth.currentUser) {
      $('#user-info').removeClass('last-user');
      $('#user-info').addClass('current-user');
    }  else {
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
  var pElt = $('<i>').addClass('fa ' + providersIcons[providerId])
      .attr('title', providerId)
      .data({
        'toggle': 'tooltip',
        'placement': 'bottom'
      });
  $('.profile-providers').append(pElt);
  pElt.tooltip();
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
 * @param {!firebase.auth.Error} error Error message to display.
 */
function onAuthError(error) {
  logAtLevel_(error, 'error');
  alertError('Error: ' + error.code);
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
  var languageCode = $('#language-code').val() || null;
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
  var type = $('#persistence-type').val();
  try {
    auth.setPersistence(type).then(function() {
      log('Persistence state change to "' + type + '".');
      alertSuccess('Persistence state change to "' + type + '".');
    }, function(error) {
      alertError('Error: ' + error.code);
    });
  } catch (error) {
    alertError('Error: ' + error.code);
  }
}


/**
 * Signs up a new user with an email and a password.
 */
function onSignUp() {
  var email = $('#signup-email').val();
  var password = $('#signup-password').val();
  auth.createUserAndRetrieveDataWithEmailAndPassword(email, password)
      .then(onAuthUserCredentialSuccess, onAuthError);
}


/**
 * Signs in a user with an email and a password.
 */
function onSignInWithEmailAndPassword() {
  var email = $('#signin-email').val();
  var password = $('#signin-password').val();
  auth.signInAndRetrieveDataWithEmailAndPassword(email, password)
      .then(onAuthUserCredentialSuccess, onAuthError);
}


/**
 * Signs in a user with an email link.
 */
function onSignInWithEmailLink() {
  var email = $('#sign-in-with-email-link-email').val();
  var link = $('#sign-in-with-email-link-link').val() || undefined;
  if (auth.isSignInWithEmailLink(link)) {
    auth.signInWithEmailLink(email, link).then(onAuthSuccess, onAuthError);
  } else {
    alertError('Sign in link is invalid');
  }
}

/**
 * Links a user with an email link.
 */
function onLinkWithEmailLink() {
  var email = $('#link-with-email-link-email').val();
  var link = $('#link-with-email-link-link').val() || undefined;
  var credential = firebase.auth.EmailAuthProvider
      .credentialWithLink(email, link);
  activeUser().linkAndRetrieveDataWithCredential(credential)
      .then(onAuthUserCredentialSuccess, onAuthError);
}


/**
 * Re-authenticate a user with email link credential.
 */
function onReauthenticateWithEmailLink() {
  var email = $('#link-with-email-link-email').val();
  var link = $('#link-with-email-link-link').val() || undefined;
  var credential = firebase.auth.EmailAuthProvider
      .credentialWithLink(email, link);
  activeUser().reauthenticateAndRetrieveDataWithCredential(credential)
      .then(function(result) {
        logAdditionalUserInfo(result);
        refreshUserData();
        alertSuccess('User reauthenticated!');
      }, onAuthError);
}


/**
 * Signs in with a custom token.
 * @param {DOMEvent} event HTML DOM event returned by the listener.
 */
function onSignInWithCustomToken(event) {
  // The token can be directly specified on the html element.
  var token = $('#user-custom-token').val();

  auth.signInAndRetrieveDataWithCustomToken(token)
      .then(onAuthUserCredentialSuccess, onAuthError);
}


/**
 * Signs in anonymously.
 */
function onSignInAnonymously() {
  auth.signInAnonymouslyAndRetrieveData()
      .then(onAuthUserCredentialSuccess, onAuthError);
}


/**
 * Signs in with a generic IdP credential.
 */
function onSignInWithGenericIdPCredential() {
  var providerId = $('#signin-generic-idp-provider-id').val();
  var idToken = $('#signin-generic-idp-id-token').val();
  var accessToken = $('#signin-generic-idp-access-token').val();
  var provider = new firebase.auth.OAuthProvider(providerId);
  auth.signInAndRetrieveDataWithCredential(
      provider.credential(idToken, accessToken))
      .then(onAuthUserCredentialSuccess, onAuthError);
}


/**
 * Initializes the ApplicationVerifier.
 * @param {string} submitButtonId The ID of the DOM element of the button to
 *     which we attach the invisible reCAPTCHA. This is required even in visible
 *     mode.
 */
function makeApplicationVerifier(submitButtonId) {
  var container = recaptchaSize === 'invisible' ?
      submitButtonId :
      'recaptcha-container';
  applicationVerifier = new firebase.auth.RecaptchaVerifier(container,
      {'size': recaptchaSize});
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
  var phoneNumber = $('#signin-phone-number').val();
  var provider = new firebase.auth.PhoneAuthProvider(auth);
  // Clear existing reCAPTCHA as an existing reCAPTCHA could be targeted for a
  // link/re-auth operation.
  clearApplicationVerifier();
  // Initialize a reCAPTCHA application verifier.
  makeApplicationVerifier('signin-verify-phone-number');
  provider.verifyPhoneNumber(phoneNumber, applicationVerifier)
      .then(function(verificationId) {
        clearApplicationVerifier();
        $('#signin-phone-verification-id').val(verificationId);
        alertSuccess('Phone verification sent!');
      }, function(error) {
        clearApplicationVerifier();
        onAuthError(error);
      });
}


/**
 * Confirms a phone number verification for sign-in.
 */
function onSignInConfirmPhoneVerification() {
  var verificationId = $('#signin-phone-verification-id').val();
  var verificationCode = $('#signin-phone-verification-code').val();
  var credential = firebase.auth.PhoneAuthProvider.credential(
      verificationId, verificationCode);
  signInOrLinkCredential(credential);
}


/**
 * Sends a phone number verification code for linking or reauth.
 */
function onLinkReauthVerifyPhoneNumber() {
  var phoneNumber = $('#link-reauth-phone-number').val();
  var provider = new firebase.auth.PhoneAuthProvider(auth);
  // Clear existing reCAPTCHA as an existing reCAPTCHA could be targeted for a
  // sign-in operation.
  clearApplicationVerifier();
  // Initialize a reCAPTCHA application verifier.
  makeApplicationVerifier('link-reauth-verify-phone-number');
  provider.verifyPhoneNumber(phoneNumber, applicationVerifier)
      .then(function(verificationId) {
        clearApplicationVerifier();
        $('#link-reauth-phone-verification-id').val(verificationId);
        alertSuccess('Phone verification sent!');
      }, function(error) {
        clearApplicationVerifier();
        onAuthError(error);
      });
}


/**
 * Updates the user's phone number.
 */
function onUpdateConfirmPhoneVerification() {
  if (!activeUser()) {
    alertError('You need to sign in before linking an account.');
    return;
  }
  var verificationId = $('#link-reauth-phone-verification-id').val();
  var verificationCode = $('#link-reauth-phone-verification-code').val();
  var credential = firebase.auth.PhoneAuthProvider.credential(
      verificationId, verificationCode);
  activeUser().updatePhoneNumber(credential).then(function() {
    refreshUserData();
    alertSuccess('Phone number updated!');
  }, onAuthError);
}


/**
 * Confirms a phone number verification for linking.
 */
function onLinkConfirmPhoneVerification() {
  var verificationId = $('#link-reauth-phone-verification-id').val();
  var verificationCode = $('#link-reauth-phone-verification-code').val();
  var credential = firebase.auth.PhoneAuthProvider.credential(
      verificationId, verificationCode);
  signInOrLinkCredential(credential);
}


/**
 * Confirms a phone number verification for reauthentication.
 */
function onReauthConfirmPhoneVerification() {
  var verificationId = $('#link-reauth-phone-verification-id').val();
  var verificationCode = $('#link-reauth-phone-verification-code').val();
  var credential = firebase.auth.PhoneAuthProvider.credential(
      verificationId, verificationCode);
  activeUser().reauthenticateAndRetrieveDataWithCredential(credential)
      .then(function(result) {
        logAdditionalUserInfo(result);
        refreshUserData();
        alertSuccess('User reauthenticated!');
      }, onAuthError);
}


/**
 * Signs in or links a provider's credential, based on current tab opened.
 * @param {!firebase.auth.AuthCredential} credential The provider's credential.
 */
function signInOrLinkCredential(credential) {
  if (currentTab == '#user-section') {
    if (!activeUser()) {
      alertError('You need to sign in before linking an account.');
      return;
    }
    activeUser().linkAndRetrieveDataWithCredential(credential)
        .then(function(result) {
          logAdditionalUserInfo(result);
          refreshUserData();
          alertSuccess('Provider linked!');
        }, onAuthError);
  } else {
    auth.signInAndRetrieveDataWithCredential(credential)
        .then(onAuthUserCredentialSuccess, onAuthError);
  }
}


/** @return {!Object} The Action Code Settings object. */
function getActionCodeSettings() {
  var actionCodeSettings = {};
  var url = $('#continueUrl').val();
  var apn = $('#apn').val();
  var amv = $('#amv').val();
  var ibi = $('#ibi').val();
  var installApp = $("input[name=install-app]:checked").val() == 'Yes';
  var handleCodeInApp = $("input[name=handle-in-app]:checked").val() == 'Yes';
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
  var email = $('#changed-email').val();
  activeUser().updateEmail(email).then(function() {
    refreshUserData();
    alertSuccess('Email changed!');
  }, onAuthError);
}


/**
 * Changes the user's password.
 */
function onChangePassword() {
  var password = $('#changed-password').val();
  activeUser().updatePassword(password).then(function() {
    refreshUserData();
    alertSuccess('Password changed!');
  }, onAuthError);
}


/**
 * Changes the user's password.
 */
function onUpdateProfile() {
  var displayName = $('#display-name').val();
  var photoURL = $('#photo-url').val();
  activeUser().updateProfile({
    'displayName': displayName,
    'photoURL': photoURL
  }).then(function() {
    refreshUserData();
    alertSuccess('Profile updated!');
  }, onAuthError);
}


/**
 * Sends sign in with email link to the user.
 */
function onSendSignInLinkToEmail() {
  var email = $('#sign-in-with-email-link-email').val();
  auth.sendSignInLinkToEmail(email, getActionCodeSettings()).then(function() {
    alertSuccess('Email sent!');
  }, onAuthError);
}

/**
 * Sends sign in with email link to the user and pass in current url.
 */
function onSendSignInLinkToEmailCurrentUrl() {
  var email = $('#sign-in-with-email-link-email').val();
  var actionCodeSettings = {
    'url': window.location.href,
    'handleCodeInApp': true
  };

  auth.sendSignInLinkToEmail(email, actionCodeSettings).then(function() {
    if ('localStorage' in window && window['localStorage'] !== null) {
      window.localStorage.setItem(
          'emailForSignIn',
          // Save the email and the timestamp.
          JSON.stringify({
            email: email,
            timestamp: new Date().getTime()
          }));
    }
    alertSuccess('Email sent!');
  }, onAuthError);
}


/**
 * Sends email link to link the user.
 */
function onSendLinkEmailLink() {
  var email = $('#link-with-email-link-email').val();
  auth.sendSignInLinkToEmail(email, getActionCodeSettings()).then(function() {
    alertSuccess('Email sent!');
  }, onAuthError);
}


/**
 * Sends password reset email to the user.
 */
function onSendPasswordResetEmail() {
  var email = $('#password-reset-email').val();
  auth.sendPasswordResetEmail(email, getActionCodeSettings()).then(function() {
    alertSuccess('Email sent!');
  }, onAuthError);
}


/**
 * Verifies the password reset code entered by the user.
 */
function onVerifyPasswordResetCode() {
  var code = $('#password-reset-code').val();
  auth.verifyPasswordResetCode(code).then(function() {
    alertSuccess('Password reset code is valid!');
  }, onAuthError);
}


/**
 * Confirms the password reset with the code and password supplied by the user.
 */
function onConfirmPasswordReset() {
  var code = $('#password-reset-code').val();
  var password = $('#password-reset-password').val();
  auth.confirmPasswordReset(code, password).then(function() {
    alertSuccess('Password has been changed!');
  }, onAuthError);
}


/**
 * Gets the list of IDPs that can be used to log in for the given email address.
 */
function onFetchProvidersForEmail() {
  var email = $('#fetch-providers-email').val();
  auth.fetchProvidersForEmail(email).then(function(providers) {
    log('Providers for ' + email + ' :');
    log(providers);
    if (providers.length == 0) {
      alertSuccess('Providers for ' + email + ': N/A');
    } else {
      alertSuccess('Providers for ' + email +': ' + providers.join(', '));
    }
  }, onAuthError);
}


/**
 * Gets the list of possible sign in methods for the given email address.
 */
function onFetchSignInMethodsForEmail() {
  var email = $('#fetch-providers-email').val();
  auth.fetchSignInMethodsForEmail(email).then(function(signInMethods) {
    log('Sign in methods for ' + email + ' :');
    log(signInMethods);
    if (signInMethods.length == 0) {
      alertSuccess('Sign In Methods for ' + email + ': N/A');
    } else {
      alertSuccess(
          'Sign In Methods for ' + email +': ' + signInMethods.join(', '));
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
  var email = $('#link-email').val();
  var password = $('#link-password').val();
  activeUser().linkAndRetrieveDataWithCredential(
      firebase.auth.EmailAuthProvider.credential(email, password))
      .then(onAuthUserCredentialSuccess, onAuthError);
}


/**
 * Links with a generic IdP credential.
 */
function onLinkWithGenericIdPCredential() {
  var providerId = $('#link-generic-idp-provider-id').val();
  var idToken = $('#link-generic-idp-id-token').val();
  var accessToken = $('#link-generic-idp-access-token').val();
  var provider = new firebase.auth.OAuthProvider(providerId);
  activeUser().linkAndRetrieveDataWithCredential(
      provider.credential(idToken, accessToken))
      .then(onAuthUserCredentialSuccess, onAuthError);
}


/**
 * Unlinks the specified provider.
 */
function onUnlinkProvider() {
  var providerId = $('#unlinked-provider-id').val();
  activeUser().unlink(providerId).then(function(user) {
    alertSuccess('Provider unlinked from user.');
    refreshUserData();
  }, onAuthError);
}


/**
 * Sends email verification to the user.
 */
function onSendEmailVerification() {
  activeUser().sendEmailVerification(getActionCodeSettings()).then(function() {
    alertSuccess('Email verification sent!');
  }, onAuthError);
}


/**
 * Confirms the email verification code given.
 */
function onApplyActionCode() {
  var code = $('#email-verification-code').val();
  auth.applyActionCode(code).then(function() {
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
    activeUser().getIdToken(forceRefresh).then(alertSuccess, function() {
      log("No token");
    });
  } else {
    activeUser().getToken(forceRefresh).then(alertSuccess, function() {
      log("No token");
    });
  }
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
 * Adds a new row to insert an OAuth custom parameter key/value pair.
 * @param {!jQuery.Event} event The jQuery event object.
 */
function onPopupRedirectAddCustomParam(event) {
  // Form container.
  var html = '<form class="customParamItem form form-bordered no-submit">';
  // OAuth parameter key input.
  html += '<input type="text" class="form-control customParamKey" ' +
      'placeholder="OAuth Parameter Key"/>';
  // OAuth parameter value input.
  html += '<input type="text" class="form-control customParamValue" ' +
      'placeholder="OAuth Parameter Value"/>';
  // Button to remove current key/value pair.
  html += '<button class="btn btn-block btn-primary">Remove</button>';
  html += '</form>';
  // Create jQuery node.
  var $node = $(html);
  // Add button click event listener to remove item.
  $node.find('button').on('click', function(e) {
    // Remove button click event listener.
    $(this).off('click');
    // Get row container and remove it.
    $(this).closest('form.customParamItem').remove();
    e.preventDefault();
  });
  // Append constructed row to parameter list container.
  $("#popup-redirect-custom-parameters").append($node);
}


/**
 * Performs the corresponding popup/redirect action for a generic provider.
 */
function onPopupRedirectGenericProviderClick() {
  var providerId = $('#popup-redirect-generic-providerid').val();
  var provider = new firebase.auth.OAuthProvider(providerId);
  signInWithPopupRedirect(provider);
}


/**
 * Performs the corresponding popup/redirect action based on user's selection.
 * @param {!jQuery.Event} event The jQuery event object.
 */
function onPopupRedirectProviderClick(event) {
  var providerId = $(event.currentTarget).data('provider');
  var provider = null;
  switch (providerId) {
    case 'google.com':
      provider = new firebase.auth.GoogleAuthProvider();
      break;
    case 'facebook.com':
      provider = new firebase.auth.FacebookAuthProvider();
      break;
    case 'github.com':
      provider = new firebase.auth.GithubAuthProvider();
      break;
    case 'twitter.com':
      provider = new firebase.auth.TwitterAuthProvider();
      break;
    default:
      return;
  }
  signInWithPopupRedirect(provider);
}


/**
 * Performs a popup/redirect action based on a given provider and the user's
 * selections.
 * @param {!firebase.auth.AuthProvider} provider The provider with which to
 *     sign in.
 */
function signInWithPopupRedirect(provider) {
  var action = $("input[name=popup-redirect-action]:checked").val();
  var type = $("input[name=popup-redirect-type]:checked").val();
  var method = null;
  var inst = null;
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
  if (type == 'popup') {
    method += 'Popup';
  } else {
    method += 'Redirect';
  }
  // Get custom OAuth parameters.
  var customParameters = {};
  // For each entry.
  $('form.customParamItem').each(function(index) {
    // Get parameter key.
    var key = $(this).find('input.customParamKey').val();
    // Get parameter value.
    var value = $(this).find('input.customParamValue').val();
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
    var scopes = $.trim($('#scopes').val()).split(/\s*,\s*/);
    for (var i = 0; i < scopes.length; i++) {
      provider.addScope(scopes[i]);
    }
  }
  console.log('Provider:');
  console.log(provider);
  if (type == 'popup') {
    inst[method](provider).then(function(response) {
      console.log('Popup response:');
      console.log(response);
      alertSuccess(action + ' with ' + provider['providerId'] + ' successful!');
      logAdditionalUserInfo(response);
      onAuthSuccess(activeUser());
    }, onAuthError);
  } else {
    try {
      inst[method](provider).catch(onAuthError);
    } catch (error) {
      console.log('Error while calling ' + method);
      console.error(error);
    }
  }
}


/**
 * Displays user credential result.
 * @param {!firebase.auth.UserCredential} result The UserCredential result
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
  auth.getRedirectResult().then(function(response) {
    log('Redirect results:');
    if (response.credential) {
      log('Credential:');
      log(response.credential);
    } else {
      log('No credential');
    }
    if (response.user) {
      log('User\'s id:');
      log(response.user.uid);
    } else {
      log('No user');
    }
    logAdditionalUserInfo(response);
    console.log(response);
  }, onAuthError);
}


/**
 * Logs additional user info returned by a sign-in event, if available.
 * @param {!Object} response
 */
function logAdditionalUserInfo(response) {
  if (response.additionalUserInfo) {
    if (response.additionalUserInfo.username) {
      log(response.additionalUserInfo['providerId'] + ' username: ' +
          response.additionalUserInfo.username);
    }
    if (response.additionalUserInfo.profile) {
      log(response.additionalUserInfo['providerId'] + ' profile information:');
      log(JSON.stringify(response.additionalUserInfo.profile, null, 2));
    }
    if (typeof response.additionalUserInfo.isNewUser !== 'undefined') {
      log(response.additionalUserInfo['providerId'] + ' isNewUser: ' +
          response.additionalUserInfo.isNewUser);
    }
  }
}



/**
 * Deletes the user account.
 */
function onDelete() {
  activeUser()['delete']().then(function() {
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
  var url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)');
  var results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}


/**
 * Detects if an action code is passed in the URL, and populates accordingly
 * the input field for the confirm email verification process.
 */
function populateActionCodes() {
  var emailForSignIn = null;
  var signInTime = 0;
  if ('localStorage' in window && window['localStorage'] !== null) {
    try {
      // Try to parse as JSON first using new storage format.
      var emailForSignInData =
          JSON.parse(window.localStorage.getItem('emailForSignIn'));
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
  var actionCode = getParameterByName('oobCode');
  if (actionCode != null) {
    var mode = getParameterByName('mode');
    if (mode == 'verifyEmail') {
      $('#email-verification-code').val(actionCode);
    } else if (mode == 'resetPassword') {
      $('#password-reset-code').val(actionCode);
    } else if (mode == 'signIn') {
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
  var randomString = Math.floor(Math.random() * 10000000).toString();
  var dbRef;
  var dbPath;
  var errMessage;
  // Run this check only when Database module is available.
  if (typeof firebase !== 'undefined' &&
      typeof firebase.database !== 'undefined') {
    if (lastUser && !firebase.auth().currentUser) {
      dbPath = 'users/' + lastUser.uid;
      // After sign out, confirm read/write access to users/$user_id blocked.
      dbRef = firebase.database().ref(dbPath);
      dbRef.set({
        'test': randomString
      }).then(function() {
        alertError(
            'Error: Unauthenticated write to Database node ' + dbPath +
            ' unexpectedly succeeded!');
      }).catch(function(error) {
        errMessage = error.message.toLowerCase();
        // Permission denied error should be thrown.
        if (errMessage.indexOf('permission_denied') == -1) {
          alertError('Error: ' + error.code);
          return;
        }
        dbRef.once('value')
            .then(function() {
              alertError('Error: Unauthenticated read to Database node ' +
                  dbPath + ' unexpectedly succeeded!');
            }).catch(function(error) {
              errMessage = error.message.toLowerCase();
              // Permission denied error should be thrown.
              if (errMessage.indexOf('permission_denied') == -1) {
                alertError('Error: ' + error.code);
                return;
              }
              log('Unauthenticated read/write to Database node ' + dbPath +
                  ' failed as expected!');
            });
      });
    } else if (firebase.auth().currentUser) {
      dbPath = 'users/' + firebase.auth().currentUser.uid;
      // Confirm read/write access to users/$user_id allowed.
      dbRef = firebase.database().ref(dbPath);
      dbRef.set({
        'test': randomString
      }).then(function() {
        return dbRef.once('value');
      }).then(function(snapshot) {
        if (snapshot.val().test === randomString) {
          // read/write successful.
          log('Authenticated read/write to Database node ' + dbPath +
              ' succeeded!');
        } else {
          throw new Error('Authenticated read/write to Database node ' +
              dbPath + ' failed!');
        }
        // Clean up: clear that node's content.
        return dbRef.remove();
      }).catch(function(error) {
        alertError('Error: ' + error.code);
      });
    }
  }
}


/** Runs all web worker tests if web workers are supported. */
function onRunWebWorkTests() {
  if (!webWorker) {
    alertError('Error: Web workers are not supported in the current browser!');
    return;
  }
  var onError = function(error) {
    alertError('Error code: ' + error.code + ' message: ' + error.message);
  };
  auth.signInWithPopup(new firebase.auth.GoogleAuthProvider())
      .then(function(result) {
        runWebWorkerTests(result.credential.idToken);
      }, onError);
}


/** Runs service worker tests if supported. */
function onRunServiceWorkTests() {
  $.ajax('/checkIfAuthenticated').then(function(data, textStatus, jqXHR) {
    alertSuccess('User authenticated: ' + data.uid);
  }, function(jqXHR, textStatus, errorThrown) {
    alertError(jqXHR.status + ': ' + JSON.stringify(jqXHR.responseJSON));
  });
}


/**
 * Initiates the application by setting event listeners on the various buttons.
 */
function initApp(){
  log('Initializing app...');
  app = firebase.initializeApp(config);
  auth = app.auth();

  // Listen to reCAPTCHA config togglers.
  initRecaptchaToggle(function(size) {
    clearApplicationVerifier();
    recaptchaSize = size;
  });

  // The action code for email verification or password reset
  // can be passed in the url address as a parameter, and for convenience
  // this preloads the input field.
  populateActionCodes();

  // Allows to login the user if previously logged in.
  if (auth.onIdTokenChanged) {
    auth.onIdTokenChanged(function(user) {
      refreshUserData();
      if (user) {
        user.getIdToken(false).then(
          log,
          function() {
            log('No token.');
          }
         );
      } else {
        log('No user logged in.');
      }
    });
  }

  if (auth.onAuthStateChanged) {
    auth.onAuthStateChanged(function(user) {
      if (user) {
        log('user state change detected: ' + user.uid);
      } else {
        log('user state change detected: no user');
      }
      // Check Database Auth access.
      checkDatabaseAuthAccess();
    });
  }

  // We check for redirect result to refresh user's data.
  auth.getRedirectResult().then(function(response) {
    refreshUserData();
    logAdditionalUserInfo(response);
  }, onAuthError);

  // Bootstrap tooltips.
  $('[data-toggle="tooltip"]').tooltip();

  // Auto submit the choose library type form.
  $('#library-form').on('change', 'input.library-option', function() {
    $('#library-form').submit();
  });

  // To clear the logs in the page.
  $('.clear-logs').click(clearLogs);

  // Disables JS forms.
  $('form.no-submit').on('submit', function() {
    return false;
  });

  // Keeps track of the current tab opened.
  $('#tab-menu a').click(function(event) {
    currentTab = $(event.currentTarget).attr("href");
  });

  // Toggles user.
  $('input[name=toggle-user-selection]').change(refreshUserData);

  // Actions listeners.
  $('#sign-up-with-email-and-password').click(onSignUp);
  $('#sign-in-with-email-and-password').click(onSignInWithEmailAndPassword);
  $('.sign-in-with-custom-token').click(onSignInWithCustomToken);
  $('#sign-in-anonymously').click(onSignInAnonymously);
  $('#sign-in-with-generic-idp-credential')
      .click(onSignInWithGenericIdPCredential);
  $('#signin-verify-phone-number').click(onSignInVerifyPhoneNumber);
  $('#signin-confirm-phone-verification')
      .click(onSignInConfirmPhoneVerification);
  // On enter click in verification code, complete phone sign-in. This prevents
  // reCAPTCHA from being re-rendered (default behavior on enter).
  $('#signin-phone-verification-code').keypress(function(e) {
    if (e.which == 13) {
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
  $('#send-sign-in-link-to-email-current-url')
      .click(onSendSignInLinkToEmailCurrentUrl);
  $('#send-link-email-link').click(onSendLinkEmailLink);

  $('#send-password-reset-email').click(onSendPasswordResetEmail);
  $('#verify-password-reset-code').click(onVerifyPasswordResetCode);
  $('#confirm-password-reset').click(onConfirmPasswordReset);

  $('#get-provider-data').click(onGetProviderData);
  $('#link-with-email-and-password').click(onLinkWithEmailAndPassword);
  $('#link-with-generic-idp-credential').click(onLinkWithGenericIdPCredential);
  $('#unlink-provider').click(onUnlinkProvider);
  $('#link-reauth-verify-phone-number').click(onLinkReauthVerifyPhoneNumber);
  $('#update-confirm-phone-verification')
      .click(onUpdateConfirmPhoneVerification);
  $('#link-confirm-phone-verification').click(onLinkConfirmPhoneVerification);
  $('#reauth-confirm-phone-verification')
      .click(onReauthConfirmPhoneVerification);
  // On enter click in verification code, complete phone sign-in. This prevents
  // reCAPTCHA from being re-rendered (default behavior on enter).
  $('#link-reauth-phone-verification-code').keypress(function(e) {
    if (e.which == 13) {
      // User first option option as default.
      onUpdateConfirmPhoneVerification();
      e.preventDefault();
    }
  });

  $('#send-email-verification').click(onSendEmailVerification);
  $('#confirm-email-verification').click(onApplyActionCode);
  $('#get-token').click(onGetIdToken);
  $('#refresh-token').click(onRefreshToken);
  $('#get-token-worker').click(onGetCurrentUserDataFromWebWorker);
  $('#sign-out').click(onSignOut);

  $('.popup-redirect-provider').click(onPopupRedirectProviderClick);
  $('#popup-redirect-generic').click(onPopupRedirectGenericProviderClick);
  $('#popup-redirect-get-redirect-result').click(onGetRedirectResult);
  $('#popup-redirect-add-custom-parameter')
      .click(onPopupRedirectAddCustomParam);

  $('#action-code-settings-reset').click(onActionCodeSettingsReset);

  $('#delete').click(onDelete);

  $('#set-persistence').click(onSetPersistence);

  $('#set-language-code').click(onSetLanguageCode);
  $('#use-device-language').click(onUseDeviceLanguage);

  $('#fetch-providers-for-email').click(onFetchProvidersForEmail);
  $('#fetch-sign-in-methods-for-email').click(onFetchSignInMethodsForEmail);

  $('#run-web-worker-tests').click(onRunWebWorkTests);
  $('#run-service-worker-tests').click(onRunServiceWorkTests);
}

$(initApp);
