/**
 * @license
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

goog.provide('fireauth.exports');

goog.require('fireauth.ActionCodeInfo');
goog.require('fireauth.ActionCodeURL');
goog.require('fireauth.Auth');
goog.require('fireauth.AuthCredential');
goog.require('fireauth.AuthError');
goog.require('fireauth.AuthErrorWithCredential');
goog.require('fireauth.AuthSettings');
goog.require('fireauth.AuthUser');
goog.require('fireauth.ConfirmationResult');
goog.require('fireauth.EmailAuthCredential');
goog.require('fireauth.EmailAuthProvider');
goog.require('fireauth.FacebookAuthProvider');
goog.require('fireauth.GRecaptchaMockFactory');
goog.require('fireauth.GithubAuthProvider');
goog.require('fireauth.GoogleAuthProvider');
goog.require('fireauth.InvalidOriginError');
goog.require('fireauth.MultiFactorError');
goog.require('fireauth.MultiFactorResolver');
goog.require('fireauth.MultiFactorUser');
goog.require('fireauth.OAuthCredential');
goog.require('fireauth.OAuthProvider');
goog.require('fireauth.PhoneAuthCredential');
goog.require('fireauth.PhoneAuthProvider');
goog.require('fireauth.PhoneMultiFactorGenerator');
goog.require('fireauth.RecaptchaVerifier');
goog.require('fireauth.SAMLAuthCredential');
goog.require('fireauth.SAMLAuthProvider');
goog.require('fireauth.TwitterAuthProvider');
goog.require('fireauth.args');
goog.require('fireauth.authStorage.Persistence');
goog.require('fireauth.exportlib');
goog.require('fireauth.grecaptcha');
goog.require('fireauth.idp.ProviderId');
goog.require('goog.Promise');

/** @define {string} */
const AUTH_NPM_PACKAGE_VERSION = '';

fireauth.exportlib.exportPrototypeMethods(
    fireauth.Auth.prototype, {
      applyActionCode: {
        name: 'applyActionCode',
        args: [fireauth.args.string('code')]
      },
      checkActionCode: {
        name: 'checkActionCode',
        args: [fireauth.args.string('code')]
      },
      confirmPasswordReset: {
        name: 'confirmPasswordReset',
        args: [
          fireauth.args.string('code'),
          fireauth.args.string('newPassword')
        ]
      },
      createUserWithEmailAndPassword: {
        name: 'createUserWithEmailAndPassword',
        args: [fireauth.args.string('email'), fireauth.args.string('password')]
      },
      fetchSignInMethodsForEmail: {
        name: 'fetchSignInMethodsForEmail',
        args: [fireauth.args.string('email')]
      },
      getRedirectResult: {
        name: 'getRedirectResult',
        args: []
      },
      isSignInWithEmailLink: {
        name: 'isSignInWithEmailLink',
        args: [fireauth.args.string('emailLink')]
      },
      onAuthStateChanged: {
        name: 'onAuthStateChanged',
        args: [
          fireauth.args.or(
              fireauth.args.object(),
              fireauth.args.func(),
              'nextOrObserver'),
          fireauth.args.func('opt_error', true),
          fireauth.args.func('opt_completed', true)
        ]
      },
      onIdTokenChanged: {
        name: 'onIdTokenChanged',
        args: [
          fireauth.args.or(
              fireauth.args.object(),
              fireauth.args.func(),
              'nextOrObserver'),
          fireauth.args.func('opt_error', true),
          fireauth.args.func('opt_completed', true)
        ]
      },
      sendPasswordResetEmail: {
        name: 'sendPasswordResetEmail',
        args: [
          fireauth.args.string('email'),
          fireauth.args.or(
              fireauth.args.object('opt_actionCodeSettings', true),
              fireauth.args.null(null, true),
              'opt_actionCodeSettings',
              true)
        ]
      },
      sendSignInLinkToEmail: {
        name: 'sendSignInLinkToEmail',
        args: [
          fireauth.args.string('email'),
          fireauth.args.object('actionCodeSettings')
        ]
      },
      setPersistence: {
        name: 'setPersistence',
        args:  [fireauth.args.string('persistence')]
      },
      signInAndRetrieveDataWithCredential: {
        name: 'signInAndRetrieveDataWithCredential',
        args: [fireauth.args.authCredential()]
      },
      signInAnonymously: {
        name: 'signInAnonymously',
        args: []
      },
      signInWithCredential: {
        name: 'signInWithCredential',
        args: [fireauth.args.authCredential()]
      },
      signInWithCustomToken: {
        name: 'signInWithCustomToken',
        args: [fireauth.args.string('token')]
      },
      signInWithEmailAndPassword: {
        name: 'signInWithEmailAndPassword',
        args: [fireauth.args.string('email'), fireauth.args.string('password')]
      },
      signInWithEmailLink: {
        name: 'signInWithEmailLink',
        args: [
          fireauth.args.string('email'), fireauth.args.string('emailLink', true)
        ]
      },
      signInWithPhoneNumber: {
        name: 'signInWithPhoneNumber',
        args: [
          fireauth.args.string('phoneNumber'),
          fireauth.args.applicationVerifier()
        ]
      },
      signInWithPopup: {
        name: 'signInWithPopup',
        args: [fireauth.args.authProvider()]
      },
      signInWithRedirect: {
        name: 'signInWithRedirect',
        args: [fireauth.args.authProvider()]
      },
      updateCurrentUser: {
        name: 'updateCurrentUser',
        args: [
          fireauth.args.or(
            fireauth.args.firebaseUser(),
            fireauth.args.null(),
            'user')
        ]
      },
      signOut: {
        name: 'signOut',
        args: []
      },
      toJSON: {
        name: 'toJSON',
        // This shouldn't take an argument but a blank string is being passed
        // on JSON.stringify and causing this to fail with an argument error.
        // So allow an optional string.
        args: [fireauth.args.string(null, true)]
      },
      useDeviceLanguage: {
        name: 'useDeviceLanguage',
        args: []
      },
      useEmulator: {
        name: 'useEmulator',
        args: [
          fireauth.args.string('hostname'),
          fireauth.args.number('port')
        ]
      },
      verifyPasswordResetCode: {
        name: 'verifyPasswordResetCode',
        args: [fireauth.args.string('code')]
      }
    });

fireauth.exportlib.exportPrototypeProperties(
    fireauth.Auth.prototype, {
      'lc': {
        name: 'languageCode',
        arg: fireauth.args.or(
            fireauth.args.string(),
            fireauth.args.null(),
            'languageCode')
      },
      'ti': {
        name: 'tenantId',
        arg: fireauth.args.or(
            fireauth.args.string(),
            fireauth.args.null(),
            'tenantId')
      }
    });

// Exports firebase.auth.Auth.Persistence.
fireauth.Auth['Persistence'] = fireauth.authStorage.Persistence;
fireauth.Auth['Persistence']['LOCAL'] = fireauth.authStorage.Persistence.LOCAL;
fireauth.Auth['Persistence']['SESSION'] =
    fireauth.authStorage.Persistence.SESSION;
fireauth.Auth['Persistence']['NONE'] = fireauth.authStorage.Persistence.NONE;


fireauth.exportlib.exportPrototypeMethods(
    fireauth.AuthUser.prototype, {
      'delete': {
        name: 'delete',
        args: []
      },
      getIdTokenResult: {
        name: 'getIdTokenResult',
        args: [fireauth.args.bool('opt_forceRefresh', true)]
      },
      getIdToken: {
        name: 'getIdToken',
        args: [fireauth.args.bool('opt_forceRefresh', true)]
      },
      linkAndRetrieveDataWithCredential: {
        name: 'linkAndRetrieveDataWithCredential',
        args: [fireauth.args.authCredential()]
      },
      linkWithCredential: {
        name: 'linkWithCredential',
        args: [fireauth.args.authCredential()]
      },
      linkWithPhoneNumber: {
        name: 'linkWithPhoneNumber',
        args: [
          fireauth.args.string('phoneNumber'),
          fireauth.args.applicationVerifier()
        ]
      },
      linkWithPopup: {
        name: 'linkWithPopup',
        args: [fireauth.args.authProvider()]
      },
      linkWithRedirect: {
        name: 'linkWithRedirect',
        args: [fireauth.args.authProvider()]
      },
      reauthenticateAndRetrieveDataWithCredential: {
        name: 'reauthenticateAndRetrieveDataWithCredential',
        args: [fireauth.args.authCredential()]
      },
      reauthenticateWithCredential: {
        name: 'reauthenticateWithCredential',
        args: [fireauth.args.authCredential()]
      },
      reauthenticateWithPhoneNumber: {
        name: 'reauthenticateWithPhoneNumber',
        args: [
          fireauth.args.string('phoneNumber'),
          fireauth.args.applicationVerifier()
        ]
      },
      reauthenticateWithPopup: {
        name: 'reauthenticateWithPopup',
        args: [fireauth.args.authProvider()]
      },
      reauthenticateWithRedirect: {
        name: 'reauthenticateWithRedirect',
        args: [fireauth.args.authProvider()]
      },
      reload: {
        name: 'reload',
        args: []
      },
      sendEmailVerification: {
        name: 'sendEmailVerification',
        args: [
          fireauth.args.or(
              fireauth.args.object('opt_actionCodeSettings', true),
              fireauth.args.null(null, true),
              'opt_actionCodeSettings',
              true)
        ]
      },
      toJSON: {
        name: 'toJSON',
        // This shouldn't take an argument but a blank string is being passed
        // on JSON.stringify and causing this to fail with an argument error.
        // So allow an optional string.
        args: [fireauth.args.string(null, true)]
      },
      unlink: {
        name: 'unlink',
        args: [fireauth.args.string('provider')]
      },
      updateEmail: {
        name: 'updateEmail',
        args: [fireauth.args.string('email')]
      },
      updatePassword: {
        name: 'updatePassword',
        args: [fireauth.args.string('password')]
      },
      updatePhoneNumber: {
        name: 'updatePhoneNumber',
        args: [fireauth.args.authCredential(fireauth.idp.ProviderId.PHONE)]
      },
      updateProfile: {
        name: 'updateProfile',
        args: [fireauth.args.object('profile')]
      },
      verifyBeforeUpdateEmail: {
        name: 'verifyBeforeUpdateEmail',
        args: [
          fireauth.args.string('email'),
          fireauth.args.or(
              fireauth.args.object('opt_actionCodeSettings', true),
              fireauth.args.null(null, true),
              'opt_actionCodeSettings',
              true)
        ]
      }
    });

// Ensure internal grecaptcha mock API do not get obfuscated.
fireauth.exportlib.exportPrototypeMethods(
    fireauth.GRecaptchaMockFactory.prototype, {
      execute: {
        name: 'execute'
      },
      render: {
        name: 'render'
      },
      reset: {
        name: 'reset'
      },
      getResponse: {
        name: 'getResponse'
      }
    });

fireauth.exportlib.exportPrototypeMethods(
    fireauth.grecaptcha.prototype, {
      execute: {
        name: 'execute'
      },
      render: {
        name: 'render'
      },
      reset: {
        name: 'reset'
      },
      getResponse: {
        name: 'getResponse'
      }
    });

fireauth.exportlib.exportPrototypeMethods(
    goog.Promise.prototype, {
      thenAlways: {
        name: 'finally'
      },
      thenCatch: {
        name: 'catch'
      },
      then: {
        name: 'then'
      }
    });

fireauth.exportlib.exportPrototypeProperties(
    fireauth.AuthSettings.prototype, {
      'appVerificationDisabled': {
        name: 'appVerificationDisabledForTesting',
        arg: fireauth.args.bool('appVerificationDisabledForTesting')
      }
    });

fireauth.exportlib.exportPrototypeMethods(
   fireauth.ConfirmationResult.prototype, {
      confirm: {
        name: 'confirm',
        args: [
          fireauth.args.string('verificationCode')
        ]
      }
    });

fireauth.exportlib.exportFunction(
    fireauth.AuthCredential, 'fromJSON',
    fireauth.AuthCredential.fromPlainObject, [
      fireauth.args.or(fireauth.args.string(), fireauth.args.object(), 'json')
    ]);

fireauth.exportlib.exportFunction(
    fireauth.EmailAuthProvider, 'credential',
    fireauth.EmailAuthProvider.credential, [
      fireauth.args.string('email'),
      fireauth.args.string('password')
    ]);

fireauth.exportlib.exportPrototypeMethods(
    fireauth.EmailAuthCredential.prototype, {
     toPlainObject: {
        name: 'toJSON',
        // This shouldn't take an argument but a blank string is being passed
        // on JSON.stringify and causing this to fail with an argument error.
        // So allow an optional string.
        args: [fireauth.args.string(null, true)]
      }
    });

fireauth.exportlib.exportPrototypeMethods(
    fireauth.FacebookAuthProvider.prototype, {
      addScope: {
        name: 'addScope',
        args: [fireauth.args.string('scope')]
      },
      setCustomParameters: {
        name: 'setCustomParameters',
        args: [fireauth.args.object('customOAuthParameters')]
      }
    });
fireauth.exportlib.exportFunction(
    fireauth.FacebookAuthProvider, 'credential',
    fireauth.FacebookAuthProvider.credential, [
      fireauth.args.or(fireauth.args.string(), fireauth.args.object(),
          'token')
    ]);
fireauth.exportlib.exportFunction(
    fireauth.EmailAuthProvider, 'credentialWithLink',
    fireauth.EmailAuthProvider.credentialWithLink, [
      fireauth.args.string('email'),
      fireauth.args.string('emailLink')
    ]);

fireauth.exportlib.exportPrototypeMethods(
    fireauth.GithubAuthProvider.prototype, {
      addScope: {
        name: 'addScope',
        args: [fireauth.args.string('scope')]
      },
      setCustomParameters: {
        name: 'setCustomParameters',
        args: [fireauth.args.object('customOAuthParameters')]
      }
    });
fireauth.exportlib.exportFunction(
    fireauth.GithubAuthProvider, 'credential',
    fireauth.GithubAuthProvider.credential, [
      fireauth.args.or(fireauth.args.string(), fireauth.args.object(),
          'token')
    ]);

fireauth.exportlib.exportPrototypeMethods(
    fireauth.GoogleAuthProvider.prototype, {
      addScope: {
        name: 'addScope',
        args: [fireauth.args.string('scope')]
      },
      setCustomParameters: {
        name: 'setCustomParameters',
        args: [fireauth.args.object('customOAuthParameters')]
      }
    });
fireauth.exportlib.exportFunction(
    fireauth.GoogleAuthProvider, 'credential',
    fireauth.GoogleAuthProvider.credential, [
      fireauth.args.or(fireauth.args.string(),
          fireauth.args.or(fireauth.args.object(), fireauth.args.null()),
          'idToken'),
      fireauth.args.or(fireauth.args.string(), fireauth.args.null(),
          'accessToken', true)
    ]);

fireauth.exportlib.exportPrototypeMethods(
    fireauth.TwitterAuthProvider.prototype, {
      setCustomParameters: {
        name: 'setCustomParameters',
        args: [fireauth.args.object('customOAuthParameters')]
      }
    });
fireauth.exportlib.exportFunction(
    fireauth.TwitterAuthProvider, 'credential',
    fireauth.TwitterAuthProvider.credential, [
      fireauth.args.or(fireauth.args.string(), fireauth.args.object(),
          'token'),
      fireauth.args.string('secret', true)
    ]);
fireauth.exportlib.exportPrototypeMethods(
    fireauth.OAuthProvider.prototype, {
      addScope: {
        name: 'addScope',
        args: [fireauth.args.string('scope')]
      },
      credential: {
        name: 'credential',
        args: [
          fireauth.args.or(
              fireauth.args.string(),
              fireauth.args.or(fireauth.args.object(), fireauth.args.null()),
              'optionsOrIdToken'),
          fireauth.args.or(fireauth.args.string(), fireauth.args.null(),
              'accessToken', true)
        ]
      },
      setCustomParameters: {
        name: 'setCustomParameters',
        args: [fireauth.args.object('customOAuthParameters')]
      }
    });

fireauth.exportlib.exportPrototypeMethods(
    fireauth.OAuthCredential.prototype, {
     toPlainObject: {
        name: 'toJSON',
        // This shouldn't take an argument but a blank string is being passed
        // on JSON.stringify and causing this to fail with an argument error.
        // So allow an optional string.
        args: [fireauth.args.string(null, true)]
      }
    });

fireauth.exportlib.exportPrototypeMethods(
    fireauth.SAMLAuthCredential.prototype, {
     toPlainObject: {
        name: 'toJSON',
        // This shouldn't take an argument but a blank string is being passed
        // on JSON.stringify and causing this to fail with an argument error.
        // So allow an optional string.
        args: [fireauth.args.string(null, true)]
      }
    });

fireauth.exportlib.exportFunction(
    fireauth.PhoneAuthProvider, 'credential',
    fireauth.PhoneAuthProvider.credential, [
      fireauth.args.string('verificationId'),
      fireauth.args.string('verificationCode')
    ]);
fireauth.exportlib.exportPrototypeMethods(
    fireauth.PhoneAuthProvider.prototype, {
      verifyPhoneNumber: {
        name: 'verifyPhoneNumber',
        args: [
          fireauth.args.or(
              fireauth.args.string(),
              fireauth.args.phoneInfoOptions(),
              'phoneInfoOptions'),
          fireauth.args.applicationVerifier()
        ]
      }
    });

fireauth.exportlib.exportPrototypeMethods(
    fireauth.PhoneAuthCredential.prototype, {
     toPlainObject: {
        name: 'toJSON',
        // This shouldn't take an argument but a blank string is being passed
        // on JSON.stringify and causing this to fail with an argument error.
        // So allow an optional string.
        args: [fireauth.args.string(null, true)]
      }
    });

fireauth.exportlib.exportPrototypeMethods(
    fireauth.AuthError.prototype, {
      toJSON: {
        name: 'toJSON',
        // This shouldn't take an argument but a blank string is being passed
        // on JSON.stringify and causing this to fail with an argument error.
        // So allow an optional string.
        args: [fireauth.args.string(null, true)]
      }
    });
fireauth.exportlib.exportPrototypeMethods(
    fireauth.AuthErrorWithCredential.prototype, {
      toJSON: {
        name: 'toJSON',
        // This shouldn't take an argument but a blank string is being passed
        // on JSON.stringify and causing this to fail with an argument error.
        // So allow an optional string.
        args: [fireauth.args.string(null, true)]
      }
    });
fireauth.exportlib.exportPrototypeMethods(
    fireauth.InvalidOriginError.prototype, {
      toJSON: {
        name: 'toJSON',
        // This shouldn't take an argument but a blank string is being passed
        // on JSON.stringify and causing this to fail with an argument error.
        // So allow an optional string.
        args: [fireauth.args.string(null, true)]
      }
    });
fireauth.exportlib.exportPrototypeMethods(
    fireauth.MultiFactorError.prototype, {
      toJSON: {
        name: 'toJSON',
        // This shouldn't take an argument but a blank string is being passed
        // on JSON.stringify and causing this to fail with an argument error.
        // So allow an optional string.
        args: [fireauth.args.string(null, true)]
      }
    });
fireauth.exportlib.exportPrototypeMethods(
    fireauth.MultiFactorResolver.prototype, {
      resolveSignIn: {
        name: 'resolveSignIn',
        args: [fireauth.args.multiFactorAssertion()]
      }
    });
fireauth.exportlib.exportPrototypeMethods(
    fireauth.MultiFactorUser.prototype, {
      getSession: {
        name: 'getSession',
        args: []
      },
      enroll: {
        name: 'enroll',
        args: [
          fireauth.args.multiFactorAssertion(),
          fireauth.args.string('displayName', true)
        ]
      },
      unenroll: {
        name: 'unenroll',
        args: [
          fireauth.args.or(
              fireauth.args.multiFactorInfo(),
              fireauth.args.string(),
              'multiFactorInfoIdentifier')
        ]
      }
    });

fireauth.exportlib.exportPrototypeMethods(
    fireauth.RecaptchaVerifier.prototype, {
      clear: {
        name: 'clear',
        args: []
      },
      render: {
        name: 'render',
        args: []
      },
      verify: {
        name: 'verify',
        args: []
      }
    });

fireauth.exportlib.exportFunction(
    fireauth.ActionCodeURL, 'parseLink',
    fireauth.ActionCodeURL.parseLink, [fireauth.args.string('link')]);

fireauth.exportlib.exportFunction(
    fireauth.PhoneMultiFactorGenerator, 'assertion',
    fireauth.PhoneMultiFactorGenerator.assertion,
    [fireauth.args.authCredential(fireauth.idp.ProviderId.PHONE)]);


(function() {
  if (typeof firebase === 'undefined' || !firebase.INTERNAL ||
      !firebase.INTERNAL.registerComponent) {
    throw new Error('Cannot find the firebase namespace; be sure to include ' +
        'firebase-app.js before this library.');
  } else {
    var namespace = {
      // Exports firebase.auth.ActionCodeInfo.Operation.
      'ActionCodeInfo': {
        'Operation': {
          'EMAIL_SIGNIN': fireauth.ActionCodeInfo.Operation.EMAIL_SIGNIN,
          'PASSWORD_RESET': fireauth.ActionCodeInfo.Operation.PASSWORD_RESET,
          'RECOVER_EMAIL': fireauth.ActionCodeInfo.Operation.RECOVER_EMAIL,
          'REVERT_SECOND_FACTOR_ADDITION':
              fireauth.ActionCodeInfo.Operation.REVERT_SECOND_FACTOR_ADDITION,
          'VERIFY_AND_CHANGE_EMAIL':
              fireauth.ActionCodeInfo.Operation.VERIFY_AND_CHANGE_EMAIL,
          'VERIFY_EMAIL': fireauth.ActionCodeInfo.Operation.VERIFY_EMAIL
        }
      },
      'Auth': fireauth.Auth,
      'AuthCredential': fireauth.AuthCredential,
      'Error': fireauth.AuthError
    };
    fireauth.exportlib.exportFunction(namespace,
        'EmailAuthProvider', fireauth.EmailAuthProvider, []);
    fireauth.exportlib.exportFunction(namespace,
        'FacebookAuthProvider', fireauth.FacebookAuthProvider, []);
    fireauth.exportlib.exportFunction(namespace,
        'GithubAuthProvider', fireauth.GithubAuthProvider, []);
    fireauth.exportlib.exportFunction(namespace,
        'GoogleAuthProvider', fireauth.GoogleAuthProvider, []);
    fireauth.exportlib.exportFunction(namespace,
        'TwitterAuthProvider', fireauth.TwitterAuthProvider, []);
    fireauth.exportlib.exportFunction(namespace,
        'OAuthProvider', fireauth.OAuthProvider, [
          fireauth.args.string('providerId')
        ]);
    fireauth.exportlib.exportFunction(namespace,
        'SAMLAuthProvider', fireauth.SAMLAuthProvider, [
          fireauth.args.string('providerId')
        ]);
    fireauth.exportlib.exportFunction(namespace,
        'PhoneAuthProvider', fireauth.PhoneAuthProvider, [
          fireauth.args.firebaseAuth(true)
        ]);
    fireauth.exportlib.exportFunction(namespace,
        'RecaptchaVerifier', fireauth.RecaptchaVerifier, [
          fireauth.args.or(
              fireauth.args.string(),
              fireauth.args.element(),
              'recaptchaContainer'),
          fireauth.args.object('recaptchaParameters', true),
          fireauth.args.firebaseApp(true)
        ]);
    fireauth.exportlib.exportFunction(namespace,
        'ActionCodeURL', fireauth.ActionCodeURL, []);
    fireauth.exportlib.exportFunction(namespace,
        'PhoneMultiFactorGenerator', fireauth.PhoneMultiFactorGenerator, []);

    // Create auth components to register with firebase.
    // Provides Auth public APIs.
    const authComponent = { 
      'name': fireauth.exportlib.AUTH_TYPE,
      'instanceFactory': function(container) {
        var app = container['getProvider']('app')['getImmediate']();
        return new fireauth.Auth(app);
      },
      'multipleInstances': false,
      'serviceProps': namespace,
      'instantiationMode': 'LAZY',
      'type':  'PUBLIC'
    };
  
    // Provides Auth internal APIs.
    const authInteropComponent = { 
      'name': 'auth-internal',
      'instanceFactory': function(container) {
        var auth = container['getProvider'](fireauth.exportlib.AUTH_TYPE)['getImmediate']();
        return {
          'getUid': goog.bind(auth.getUid, auth),
          'getToken': goog.bind(auth.getIdTokenInternal, auth),
          'addAuthTokenListener':
            goog.bind(auth.addAuthTokenListenerInternal, auth),
          'removeAuthTokenListener':
            goog.bind(auth.removeAuthTokenListenerInternal, auth)
        };
      },
      'multipleInstances': false,
      'instantiationMode': 'LAZY',
      'type':  'PRIVATE'
    };
  
    firebase.INTERNAL.registerComponent(authComponent);
    firebase.INTERNAL.registerComponent(authInteropComponent);
    firebase.registerVersion('@firebase/auth', AUTH_NPM_PACKAGE_VERSION);

    // Expose User as firebase.User.
    firebase.INTERNAL.extendNamespace({
      'User': fireauth.AuthUser
    });
  }
})();