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

/**
 * @fileoverview Tests for storageusermanager.js
 */

goog.provide('fireauth.storage.UserManagerTest');

goog.require('fireauth.AuthUser');
goog.require('fireauth.authStorage');
goog.require('fireauth.common.testHelper');
goog.require('fireauth.constants');
goog.require('fireauth.storage.MockStorage');
goog.require('fireauth.storage.UserManager');
goog.require('fireauth.util');
goog.require('goog.Promise');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('goog.testing.MockClock');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.events');
goog.require('goog.testing.events.Event');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.recordFunction');

goog.setTestOnly('fireauth.storage.UserManagerTest');


var config = {
  apiKey: 'apiKey1'
};
var appId = 'appId1';
var clock;
var expectedUser;
var expectedUserWithAuthDomain;
var stubs = new goog.testing.PropertyReplacer();
var testUser;
var testUser2;
var mockLocalStorage;
var mockSessionStorage;
var now = new Date();


function setUp() {
  // Create new mock storages for persistent and temporary storage before each
  // test.
  mockLocalStorage = new fireauth.storage.MockStorage();
  mockSessionStorage = new fireauth.storage.MockStorage();
  fireauth.common.testHelper.installMockStorages(
      stubs, mockLocalStorage, mockSessionStorage);
  // Simulate browser that synchronizes between and iframe and a popup.
  stubs.replace(
     fireauth.util,
      'isLocalStorageNotSynchronized',
      function() {
        return false;
      });
  clock = new goog.testing.MockClock(true);
  window.localStorage.clear();
  window.sessionStorage.clear();
  var config = {
    'apiKey': 'API_KEY',
    'appName': 'appId1'
  };
  var accountInfo = {
    'uid': 'defaultUserId',
    'email': 'user@default.com',
    'displayName': 'defaultDisplayName',
    'photoURL': 'https://www.default.com/default/default.png',
    'emailVerified': true,
    'multiFactor': {
      'enrolledFactors': [
        {
          'uid': 'ENROLLMENT_UID1',
          'displayName': 'Work phone number',
          'enrollmentTime': now.toUTCString(),
          'factorId': fireauth.constants.SecondFactorType.PHONE,
          'phoneNumber': '+16505551234'
        },
        {
          'uid': 'ENROLLMENT_UID2',
          'displayName': 'Spouse phone number',
          'enrollmentTime': now.toUTCString(),
          'factorId': fireauth.constants.SecondFactorType.PHONE,
          'phoneNumber': '+16505556789'
        }
      ]
    }
  };
  var accountInfo2 = {
    'uid': 'defaultUserId2',
    'email': 'user2@default.com',
    'displayName': 'defaultDisplayName2',
    'photoURL': 'https://www.default.com/default/default2.png',
    'emailVerified': false
  };
  var tokenResponse = {
    'idToken': fireauth.common.testHelper.createMockJwt(),
    'refreshToken': 'refreshToken'
  };
  testUser = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  testUser2 = new fireauth.AuthUser(config, tokenResponse, accountInfo2);
}


function tearDown() {
  if (expectedUser) {
    expectedUser.destroy();
  }
  if (expectedUserWithAuthDomain) {
    expectedUserWithAuthDomain.destroy();
  }
  if (testUser) {
    testUser.destroy();
  }
  if (testUser2) {
    testUser2.destroy();
  }
  goog.dispose(clock);
}


/**
 * @return {!fireauth.authStorage.Manager} The default local storage
 *     synchronized manager instance used for testing.
 */
function getDefaultStorageManagerInstance() {
  return new fireauth.authStorage.Manager('firebase', ':', false, true);
}


function testGetSetRemoveCurrentUser() {
  // Avoid triggering getProjectConfig RPC.
  fireauth.AuthEventManager.ENABLED = false;
  var storageManager = getDefaultStorageManagerInstance();
  var userManager = new fireauth.storage.UserManager(appId, storageManager);
  var config = {
    'apiKey': 'API_KEY',
    'appName': 'appId1'
  };
  var configWithAuthDomain = {
    'apiKey': 'API_KEY',
    'appName': 'appId1',
    'authDomain': 'project.firebaseapp.com'
  };
  var accountInfo = {
    'uid': 'defaultUserId',
    'email': 'user@default.com',
    'displayName': 'defaultDisplayName',
    'photoURL': 'https://www.default.com/default/default.png',
    'emailVerified': true,
    'multiFactor': {
      'enrolledFactors': [
        {
          'uid': 'ENROLLMENT_UID1',
          'displayName': 'Work phone number',
          'enrollmentTime': now.toUTCString(),
          'factorId': fireauth.constants.SecondFactorType.PHONE,
          'phoneNumber': '+16505551234'
        },
        {
          'uid': 'ENROLLMENT_UID2',
          'displayName': 'Spouse phone number',
          'enrollmentTime': now.toUTCString(),
          'factorId': fireauth.constants.SecondFactorType.PHONE,
          'phoneNumber': '+16505556789'
        }
      ]
    }
  };
  var tokenResponse = {
    'idToken': fireauth.common.testHelper.createMockJwt(),
    'refreshToken': 'refreshToken'
  };
  expectedUser = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  // Expected user with authDomain.
  expectedUserWithAuthDomain =
    new fireauth.AuthUser(configWithAuthDomain, tokenResponse, accountInfo);
  // Listen to calls on RPC Handler.
  stubs.replace(
    fireauth.RpcHandler.prototype,
    'updateEmulatorConfig',
    goog.testing.recordFunction(
      fireauth.RpcHandler.prototype.updateEmulatorConfig));
  var storageKey = 'firebase:authUser:appId1';
  return goog.Promise.resolve()
      .then(function() {
        return userManager.setCurrentUser(expectedUser);
      })
      .then(function() {
        return userManager.getCurrentUser();
      })
      .then(function(user) {
        assertObjectEquals(expectedUser.toPlainObject(), user.toPlainObject());
        return mockLocalStorage.get(storageKey);
      })
      .then(function(user) {
        assertObjectEquals(expectedUser.toPlainObject(), user);
        // Get user with authDomain.
        return userManager.getCurrentUser('project.firebaseapp.com');
      })
      .then(function(user) {
        fireauth.common.testHelper.assertUserEquals(
          expectedUserWithAuthDomain, user);
        // Get user with authDomain & emulator config.
        return userManager.getCurrentUser('project.firebaseapp.com',
          {
            url: 'http://emulator.test.domain:1234'
          });
      })
    .then(function () {
      // Verify RpcHandler was notified of config change.
      assertEquals(1,
        fireauth.RpcHandler.prototype.updateEmulatorConfig.getCallCount());
      assertObjectEquals(
        {
          url: 'http://emulator.test.domain:1234'
        },
        fireauth.RpcHandler.prototype.updateEmulatorConfig.getLastCall()
          .getArgument(0));
        return userManager.removeCurrentUser();
      })
      .then(function() {
        return mockLocalStorage.get(storageKey);
      })
      .then(function(user) {
        assertUndefined(user);
        return userManager.getCurrentUser();
      })
      .then(function(user) {
        assertNull(user);
      });
}


function testAddRemoveCurrentUserChangeListener() {
  var calls = 0;
  var storageManager = getDefaultStorageManagerInstance();
  var userManager = new fireauth.storage.UserManager('appId1', storageManager);
  var listener = function() {
    calls++;
    if (calls > 1) {
      fail('Listener should be called once.');
    }
  };
  // Save existing Auth users for appId1 and appId2.
  mockLocalStorage.set('firebase:authUser:appId1', testUser.toPlainObject());
  mockLocalStorage.set('firebase:authUser:appId2', testUser.toPlainObject());
  return goog.Promise.resolve().then(function() {
    return mockLocalStorage.set(
        'firebase:authUser:appId1', testUser.toPlainObject());
  })
  .then(function() {
    return mockLocalStorage.set(
        'firebase:authUser:appId2', testUser.toPlainObject());
  })
  .then(function() {
    userManager.addCurrentUserChangeListener(listener);
    // Simulate appId1 user deletion.
    var storageEvent =
        new goog.testing.events.Event(goog.events.EventType.STORAGE, window);
    storageEvent.key = 'firebase:authUser:appId1';
    storageEvent.oldValue = JSON.stringify(testUser.toPlainObject());
    storageEvent.newValue = null;
    // This should trigger listener.
    mockLocalStorage.fireBrowserEvent(storageEvent);
    assertEquals(1, calls);
    // Simulate appId2 user deletion.
    storageEvent.key = 'firebase:authUser:appId2';
    storageEvent.oldValue = JSON.stringify(testUser.toPlainObject());
    storageEvent.newValue = null;
    // This should not trigger listener.
    mockLocalStorage.fireBrowserEvent(storageEvent);
    assertEquals(1, calls);
    // Remove listener.
    userManager.removeCurrentUserChangeListener(listener);
    // Simulate new user saved for appId1.
    // This should not trigger listener.
    storageEvent.key = 'firebase:authUser:appId1';
    storageEvent.newValue = JSON.stringify(testUser.toPlainObject());
    storageEvent.oldValue = null;
    mockLocalStorage.fireBrowserEvent(storageEvent);
    assertEquals(1, calls);
  });
}


function testUserManager_initializedWithSession() {
  // Save state in session storage.
  var storageKey = 'firebase:authUser:appId1';
  mockSessionStorage.set(storageKey, testUser.toPlainObject());
  var storageManager = getDefaultStorageManagerInstance();
  var userManager = new fireauth.storage.UserManager('appId1', storageManager);
  return userManager.getCurrentUser()
      .then(function(user) {
        fireauth.common.testHelper.assertUserEquals(testUser, user);
        // User should be saved in session storage only with everything else
        // cleared.
        return fireauth.common.testHelper.assertUserStorage(
            'appId1', 'session', testUser, storageManager);
      }).then(function() {
        // Should be saved in session storage.
        return userManager.setCurrentUser(testUser2);
      })
      .then(function() {
        return userManager.getCurrentUser();
      })
      .then(function(user) {
        fireauth.common.testHelper.assertUserEquals(testUser2, user);
        return fireauth.common.testHelper.assertUserStorage(
            'appId1', 'session', testUser2, storageManager);
      });
}


function testUserManager_initializedWithSession_duplicateStorage() {
  // Confirm any duplicate storage is cleared on initialization.
  var storageManager = getDefaultStorageManagerInstance();
  var userManager;
  // Save state in session storage.
  var storageKey = 'firebase:authUser:appId1';
  mockSessionStorage.set(storageKey, testUser.toPlainObject());
  // Add state to other types of storage.
  mockLocalStorage.set(storageKey, testUser2.toPlainObject());
  // Set redirect persistence to none.
  mockSessionStorage.set(
      'firebase:persistence:appId1', 'none');
  // Save state using in memory storage.
  return storageManager.set(
      {name: 'authUser', persistent: 'none'},
      testUser.toPlainObject(),
      'appId1')
      .then(function() {
        userManager = new fireauth.storage.UserManager(
            'appId1', storageManager);
        return userManager.getCurrentUser();
      })
      .then(function(user) {
        fireauth.common.testHelper.assertUserEquals(testUser, user);
        // User should be saved in session storage only with everything else
        // cleared.
        return fireauth.common.testHelper.assertUserStorage(
            'appId1', 'session', testUser, storageManager);
      }).then(function() {
        // Should be saved in session storage.
        return userManager.setCurrentUser(testUser2);
      })
      .then(function() {
        return userManager.getCurrentUser();
      })
      .then(function(user) {
        fireauth.common.testHelper.assertUserEquals(testUser2, user);
        return fireauth.common.testHelper.assertUserStorage(
            'appId1', 'session', testUser2, storageManager);
      });
}


function testUserManager_initializedWithInMemory() {
  // Save state in in-memory storage.
  var storageManager = getDefaultStorageManagerInstance();
  var userManager;
  return storageManager.set(
      {name: 'authUser', persistent: 'none'},
      testUser.toPlainObject(),
      'appId1')
      .then(function() {
        userManager = new fireauth.storage.UserManager(
            'appId1', storageManager);
        return userManager.getCurrentUser();
      })
      .then(function(user) {
        fireauth.common.testHelper.assertUserEquals(testUser, user);
        // User should be saved in memory only with everything else
        // cleared.
        return fireauth.common.testHelper.assertUserStorage(
            'appId1', 'none', testUser, storageManager);
      }).then(function() {
        // Should be saved using in memory storage only.
        return userManager.setCurrentUser(testUser2);
      })
      .then(function() {
        return userManager.getCurrentUser();
      })
      .then(function(user) {
        return fireauth.common.testHelper.assertUserStorage(
            'appId1', 'none', testUser2, storageManager);
      });
}


function testUserManager_initializedWithLocal() {
  // Save state in local storage.
  var storageKey = 'firebase:authUser:appId1';
  mockLocalStorage.set(storageKey, testUser.toPlainObject());
  var storageManager = getDefaultStorageManagerInstance();
  var userManager = new fireauth.storage.UserManager('appId1', storageManager);
  return userManager.getCurrentUser()
      .then(function(user) {
        fireauth.common.testHelper.assertUserEquals(testUser, user);
        // User should be saved in local storage only with everything else
        // cleared.
        return fireauth.common.testHelper.assertUserStorage(
            'appId1', 'local', testUser, storageManager);
      }).then(function() {
        // Should be saved in local storage only.
        return userManager.setCurrentUser(testUser2);
      })
      .then(function() {
        return userManager.getCurrentUser();
      })
      .then(function(user) {
        fireauth.common.testHelper.assertUserEquals(testUser2, user);
        return fireauth.common.testHelper.assertUserStorage(
            'appId1', 'local', testUser2, storageManager);
      });
}


function testUserManager_initializedWithLocal_migratedFromLocalStorage() {
  var storageKey = 'firebase:authUser:appId1';
  // Save Auth state to localStorage. This will be migrated to mockLocalStorage.
  window.localStorage.setItem(
      storageKey, JSON.stringify(testUser.toPlainObject()));
  var storageManager = getDefaultStorageManagerInstance();
  var userManager = new fireauth.storage.UserManager('appId1', storageManager);
  return userManager.getCurrentUser()
      .then(function(user) {
        fireauth.common.testHelper.assertUserEquals(testUser, user);
        // User should be cleared from window.localStorage.
        assertNull(window.localStorage.getItem(storageKey));
        // User should be saved in mock local storage only with everything else
        // cleared.
        return fireauth.common.testHelper.assertUserStorage(
            'appId1', 'local', testUser, storageManager);
      })
      .then(function() {
        // Should be saved in local storage only.
        return userManager.setCurrentUser(testUser2);
      })
      .then(function() {
        return userManager.getCurrentUser();
      })
      .then(function(user) {
        fireauth.common.testHelper.assertUserEquals(testUser2, user);
        return fireauth.common.testHelper.assertUserStorage(
            'appId1', 'local', testUser2, storageManager);
      });
}


function testUserManager_initializedWithLocal_multiplePersistentStorage() {
  var storageKey = 'firebase:authUser:appId1';
  // Save Auth state to window.localStorage. This will be cleared.
  window.localStorage.setItem(
      storageKey, JSON.stringify(testUser.toPlainObject()));
  // Save another Auth state in mockLocalStorage. This will have precedence over
  // window.localStorage.
  mockLocalStorage.set(storageKey, testUser2.toPlainObject());
  var storageManager = getDefaultStorageManagerInstance();
  var userManager = new fireauth.storage.UserManager('appId1', storageManager);
  return userManager.getCurrentUser()
      .then(function(user) {
        fireauth.common.testHelper.assertUserEquals(testUser2, user);
        // User should be ignored and cleared from window.localStorage.
        assertNull(window.localStorage.getItem(storageKey));
        // Existing user saved in mock local storage persisted with everything
        // else cleared.
        return fireauth.common.testHelper.assertUserStorage(
            'appId1', 'local', testUser2, storageManager);
      })
      .then(function() {
        return userManager.setCurrentUser(testUser);
      })
      .then(function() {
        return userManager.getCurrentUser();
      })
      .then(function(user) {
        fireauth.common.testHelper.assertUserEquals(testUser, user);
        return fireauth.common.testHelper.assertUserStorage(
            'appId1', 'local', testUser, storageManager);
      });
}


function testUserManager_initializedWithDefault() {
  var storageManager = getDefaultStorageManagerInstance();
  var userManager = new fireauth.storage.UserManager('appId1', storageManager);
  return userManager.getCurrentUser()
      .then(function(user) {
        assertNull(user);
        // Should be saved in default local storage.
        return userManager.setCurrentUser(testUser2);
      })
      .then(function() {
        return userManager.getCurrentUser();
      })
      .then(function(user) {
        fireauth.common.testHelper.assertUserEquals(testUser2, user);
        return fireauth.common.testHelper.assertUserStorage(
            'appId1', 'local', testUser2, storageManager);
      });
}


function testUserManager_initializedWithSavedPersistence() {
  // Save redirect persistence.
  mockSessionStorage.set('firebase:persistence:appId1', 'session');
  var storageManager = getDefaultStorageManagerInstance();
  var userManager = new fireauth.storage.UserManager('appId1', storageManager);
  return userManager.getCurrentUser()
      .then(function(user) {
        assertNull(user);
        // Should be saved in session storage as specified in redirect
        // persistence.
        return userManager.setCurrentUser(testUser2);
      })
      .then(function() {
        return userManager.getCurrentUser();
      })
      .then(function(user) {
        fireauth.common.testHelper.assertUserEquals(testUser2, user);
        return fireauth.common.testHelper.assertUserStorage(
            'appId1', 'session', testUser2, storageManager);
      });
}


function testUserManager_savePersistenceForRedirect_default() {
  // Confirm savePersistenceForRedirect behavior.
  var storageKey = 'firebase:persistence:appId1';
  var storageManager = getDefaultStorageManagerInstance();
  var userManager = new fireauth.storage.UserManager('appId1', storageManager);
  return userManager.savePersistenceForRedirect()
      .then(function() {
        // Should store persistence value in session storage.
        return mockSessionStorage.get(storageKey);
      })
      .then(function(value) {
        // Should apply the current default persistence.
        assertEquals('local', value);
      });
}


function testUserManager_savePersistenceForRedirect_modifed() {
  var storageKey = 'firebase:persistence:appId1';
  var storageManager = getDefaultStorageManagerInstance();
  var userManager = new fireauth.storage.UserManager('appId1', storageManager);
  // Update persistence.
  userManager.setPersistence('session');
  return userManager.savePersistenceForRedirect()
      .then(function() {
        // Should store persistence value in session storage.
        return mockSessionStorage.get(storageKey);
      })
      .then(function(value) {
        // The latest modified persistence value should be used.
        assertEquals('session', value);
      });
}


function testUserManager_clearState_setPersistence() {
  // Test setPersistence behavior with initially no saved stated.
  var storageManager = getDefaultStorageManagerInstance();
  // As no existing state, the default is local.
  var userManager = new fireauth.storage.UserManager('appId1', storageManager);
  // Switch to session persistence.
  userManager.setPersistence('session');
  // Should be saved in session.
  return userManager.setCurrentUser(testUser2)
      .then(function() {
        return userManager.getCurrentUser();
      })
      .then(function(user) {
        fireauth.common.testHelper.assertUserEquals(testUser2, user);
        return fireauth.common.testHelper.assertUserStorage(
            'appId1', 'session', testUser2, storageManager);
      })
      .then(function() {
        // Move to in memory.
        return userManager.setPersistence('none');
      })
      .then(function() {
        // User should be switched to in-memory storage.
        return fireauth.common.testHelper.assertUserStorage(
            'appId1', 'none', testUser2, storageManager);
      })
      .then(function() {
        // This should match.
        return userManager.getCurrentUser();
      })
      .then(function(user) {
        fireauth.common.testHelper.assertUserEquals(testUser2, user);
        // Internally switches to local storage.
        userManager.setPersistence('local');
        // Internally switches back to session storage.
        userManager.setPersistence('session');
        // This error should not affect last state change.
        assertThrows(function() {
          userManager.setPersistence('bla');
        });
        // Clears user (storage should be empty after).
        userManager.removeCurrentUser();
        // This should be saved in sessionStorage.
        userManager.setCurrentUser(testUser);
        return userManager.getCurrentUser();
      })
      .then(function(user) {
        // Should only be saved in session storage.
        fireauth.common.testHelper.assertUserEquals(testUser, user);
        return fireauth.common.testHelper.assertUserStorage(
            'appId1', 'session', testUser, storageManager);
      });
}


function testUserManager_existingState_setPersistence() {
  // Test setPersistence behavior with some initial saved persistence state.
  var storageKey = 'firebase:authUser:appId1';
  // Save initial data in local storage.
  mockLocalStorage.set(storageKey, testUser2.toPlainObject());
  var storageManager = getDefaultStorageManagerInstance();
  // As no existing state, the default is local.
  var userManager = new fireauth.storage.UserManager('appId1', storageManager);
  // Switch persistence to session.
  userManager.setPersistence('session');
  // Should be switched to session.
  return userManager.getCurrentUser()
      .then(function(user) {
        fireauth.common.testHelper.assertUserEquals(testUser2, user);
        return fireauth.common.testHelper.assertUserStorage(
            'appId1', 'session', testUser2, storageManager);
      })
      .then(function() {
        // Simulate some state duplication due to some unexpected error.
        mockLocalStorage.set(storageKey, testUser.toPlainObject());
        // Should switch state from session to none and clear everything else.
        userManager.setPersistence('none');
        return userManager.getCurrentUser();
      })
      .then(function(user) {
        return fireauth.common.testHelper.assertUserStorage(
            'appId1', 'none', testUser2, storageManager);
      });
}


function testUserManager_switchToLocalOnExternalEvents_noExistingUser() {
  // Test when external storage event is detected with no existing user that
  // persistence is switched to local.
  var storageKey = 'firebase:authUser:appId1';
  var listener = goog.testing.recordFunction();
  // Fake storage event.
  var storageEvent =
      new goog.testing.events.Event(goog.events.EventType.STORAGE, window);
  storageEvent.key = storageKey;
  storageEvent.newValue = null;

  var storageManager = getDefaultStorageManagerInstance();
  // As no existing state, the default is local.
  var userManager = new fireauth.storage.UserManager('appId1', storageManager);
  userManager.addCurrentUserChangeListener(listener);
  // Should switch to session.
  return userManager.setPersistence('session')
      .then(function() {
        // Simulate user signed in in another tab.
        storageEvent.newValue = JSON.stringify(testUser2.toPlainObject());
        // This should trigger listener and switch storage from session to
        // local.
        mockLocalStorage.fireBrowserEvent(storageEvent);
        // Listener should be called.
        assertEquals(1, listener.getCallCount());
        return userManager.getCurrentUser();
      })
      .then(function(user) {
        // User should be save in local storage.
        fireauth.common.testHelper.assertUserEquals(testUser2, user);
        return fireauth.common.testHelper.assertUserStorage(
            'appId1', 'local', testUser2, storageManager);
      })
      .then(function() {
        userManager.removeCurrentUserChangeListener(listener);
        // This should not trigger listener.
        mockLocalStorage.fireBrowserEvent(storageEvent);
        assertEquals(1, listener.getCallCount());
      });
}


function testUserManager_switchToLocalOnExternalEvents_existingUser() {
  // Test when external storage event is detected with an existing user stored
  // in a non-local storage that persistence is switched to local.
  var storageKey = 'firebase:authUser:appId1';
  var listener = goog.testing.recordFunction();
  // Fake storage event.
  var storageEvent =
      new goog.testing.events.Event(goog.events.EventType.STORAGE, window);
  storageEvent.key = storageKey;
  storageEvent.newValue = null;
  // Existing user in session storage.
  mockSessionStorage.set(storageKey, testUser.toPlainObject());

  var storageManager = getDefaultStorageManagerInstance();
  // Due to existing state in session storage, the initial state is session.
  var userManager = new fireauth.storage.UserManager('appId1', storageManager);
  userManager.addCurrentUserChangeListener(listener);
  // Should switch to session.
  return userManager.getCurrentUser()
      .then(function(user) {
        fireauth.common.testHelper.assertUserEquals(testUser, user);
        // Confirm user stored in session
        return fireauth.common.testHelper.assertUserStorage(
            'appId1', 'session', testUser, storageManager);
      })
      .then(function(user) {
        // Simulate user signed in in another tab.
        storageEvent.newValue = JSON.stringify(testUser2.toPlainObject());
        // This should trigger listener and switch storage to local.
        mockLocalStorage.fireBrowserEvent(storageEvent);
        assertEquals(1, listener.getCallCount());
        return userManager.getCurrentUser();
      })
      .then(function(user) {
        // New user should be stored in local storage.
        fireauth.common.testHelper.assertUserEquals(testUser2, user);
        return fireauth.common.testHelper.assertUserStorage(
            'appId1', 'local', testUser2, storageManager);
      })
      .then(function() {
        userManager.removeCurrentUserChangeListener(listener);
        // This should not trigger listener.
        mockLocalStorage.fireBrowserEvent(storageEvent);
        assertEquals(1, listener.getCallCount());
      });
}
