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
 * @fileoverview Tests for idtoken.js
 */

goog.provide('fireauth.IdTokenTest');

goog.require('fireauth.IdToken');
goog.require('goog.testing.jsunit');

goog.setTestOnly('fireauth.IdTokenTest');


// exp: 1326439044
// sub: "679"
// aud: "204241631686"
// provider_id: "gmail.com"
// email: "test123456@gmail.com"
// federated_id: "https://www.google.com/accounts/123456789"
var tokenGmail = 'HEADER.ew0KICAiaXNzIjogIkdJVGtpdCIsDQogICJleHAiOiAxMzI2NDM5' +
    'MDQ0LA0KICAic3ViIjogIjY3OSIsDQogICJhdWQiOiAiMjA0MjQxNjMxNjg2IiwNCiAgImZl' +
    'ZGVyYXRlZF9pZCI6ICJodHRwczovL3d3dy5nb29nbGUuY29tL2FjY291bnRzLzEyMzQ1Njc4' +
    'OSIsDQogICJwcm92aWRlcl9pZCI6ICJnbWFpbC5jb20iLA0KICAiZW1haWwiOiAidGVzdDEy' +
    'MzQ1NkBnbWFpbC5jb20iDQp9.SIGNATURE';


// exp: 1326446190
// sub: "274"
// aud: "204241631686"
// provider_id: "yahoo.com"
// email: "user123@yahoo.com"
// federated_id: "https://me.yahoo.com/whoamiwhowhowho#4a4ac"
var tokenYahoo = 'HEADER.ew0KICAiaXNzIjogIkdJVGtpdCIsDQogICJleHAiOiAxMzI2NDQ2' +
    'MTkwLA0KICAic3ViIjogIjI3NCIsDQogICJhdWQiOiAiMjA0MjQxNjMxNjg2IiwNCiAgImZl' +
    'ZGVyYXRlZF9pZCI6ICJodHRwczovL21lLnlhaG9vLmNvbS93aG9hbWl3aG93aG93aG8jNGE0' +
    'YWMiLA0KICAicHJvdmlkZXJfaWQiOiAieWFob28uY29tIiwNCiAgImVtYWlsIjogInVzZXIx' +
    'MjNAeWFob28uY29tIg0KfQ==.SIGNATURE';


// iss: "https://identitytoolkit.google.com/"
// aud: "12345678.apps.googleusercontent.com"
// iat: 1441246088
// exp: 2442455688
// sub: "1458474"
// email: "testuser@gmail.com"
// provider_id: "google.com"
// verified: true
// display_name: "John Doe"
// photo_url: "https://lh5.googleusercontent.com/1458474/photo.jpg"
var tokenGoogleWithFederatedId = 'HEADER.ew0KICAiaXNzIjogImh0dHBzOi8vaWRlbnRp' +
    'dHl0b29sa2l0Lmdvb2dsZS5jb20vIiwNCiAgImF1ZCI6ICIxMjM0NTY3OC5hcHBzLmdvb2ds' +
    'ZXVzZXJjb250ZW50LmNvbSIsDQogICJpYXQiOiAxNDQxMjQ2MDg4LA0KICAiZXhwIjogMjQ0' +
    'MjQ1NTY4OCwNCiAgInN1YiI6ICIxNDU4NDc0IiwNCiAgImVtYWlsIjogInRlc3R1c2VyQGdt' +
    'YWlsLmNvbSIsDQogICJwcm92aWRlcl9pZCI6ICJnb29nbGUuY29tIiwNCiAgInZlcmlmaWVk' +
    'IjogdHJ1ZSwNCiAgImRpc3BsYXlfbmFtZSI6ICJKb2huIERvZSIsDQogICJwaG90b191cmwi' +
    'OiAiaHR0cHM6Ly9saDUuZ29vZ2xldXNlcmNvbnRlbnQuY29tLzE0NTg0NzQvcGhvdG8uanBn' +
    'Ig0KfQ==.SIGNATURE';


// exp: 1326446190
// sub: "365"
// aud: "204241631686"
// is_anonymous: true
var tokenAnonymous = 'HEAD.eyJpc3MiOiJHSVRraXQiLCJleHAiOjEzMjY0NDYxOTAsInN1Yi' +
    'I6IjM2NSIsImF1ZCI6IjIwNDI0MTYzMTY4NiIsImlzX2Fub255bW91cyI6dHJ1ZX0' +
    '.SIGNATURE';


// iss: "https://securetoken.google.com/projectId"
// aud: "projectId"
// auth_time: 1506050282
// user_id: "123456"
// sub: "123456"
// iat: 1506050283
// exp: 1506053883
// email: "user@example.com"
// email_verified: false
// phone_number: "+11234567890"
// firebase: {identities: {phone: ["+11234567890"],
//            email: ["user@example.com"]
//           }, sign_in_provider: "phone"}
var tokenPhone = 'HEAD.ew0KICAiaXNzIjogImh0dHBzOi8vc2VjdXJldG9rZW4uZ29vZ2xlLm' +
    'NvbS9wcm9qZWN0SWQiLA0KICAiYXVkIjogInByb2plY3RJZCIsDQogICJhdXRoX3RpbWUiOi' +
    'AxNTA2MDUwMjgyLA0KICAidXNlcl9pZCI6ICIxMjM0NTYiLA0KICAic3ViIjogIjEyMzQ1Ni' +
    'IsDQogICJpYXQiOiAxNTA2MDUwMjgzLA0KICAiZXhwIjogMTUwNjA1Mzg4MywNCiAgImVtYW' +
    'lsIjogInVzZXJAZXhhbXBsZS5jb20iLA0KICAiZW1haWxfdmVyaWZpZWQiOiBmYWxzZSwNCi' +
    'AgInBob25lX251bWJlciI6ICIrMTEyMzQ1Njc4OTAiLA0KICAiZmlyZWJhc2UiOiB7DQogIC' +
    'AgImlkZW50aXRpZXMiOiB7DQogICAgICAicGhvbmUiOiBbDQogICAgICAgICIrMTEyMzQ1Nj' +
    'c4OTAiDQogICAgICBdLA0KICAgICAgImVtYWlsIjogWw0KICAgICAgICAidXNlckBleGFtcG' +
    'xlLmNvbSINCiAgICAgIF0NCiAgICB9LA0KICAgICJzaWduX2luX3Byb3ZpZGVyIjogInBob2' +
    '5lIg0KICB9DQp9.SIGNATURE';


// "iss": "https://securetoken.google.com/projectId",
// "name": "John Doe",
// "admin": true,
// "aud": "projectId",
// "auth_time": 1522715325,
// "sub": "nep2uwNCK4PqjvoKjb0InVJHlGi1",
// "iat": 1522776807,
// "exp": 1522780575,
// "email": "testuser@gmail.com",
// "email_verified": true,
// "firebase": {
//   "identities": {
//     "email": [
//       "testuser@gmail.com"
//     ]
//   },
//   "sign_in_provider": "password"
var tokenCustomClaim = 'HEAD.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5j' +
    'b20vcHJvamVjdElkIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImF1ZCI6InBy' +
    'b2plY3RJZCIsImF1dGhfdGltZSI6MTUyMjcxNTMyNSwic3ViIjoibmVwMnV3TkNLNFBxanZv' +
    'S2piMEluVkpIbEdpMSIsImlhdCI6MTUyMjc3NjgwNywiZXhwIjoxNTIyNzgwNTc1LCJlbWFp' +
    'bCI6InRlc3R1c2VyQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJmaXJlYmFz' +
    'ZSI6eyJpZGVudGl0aWVzIjp7ImVtYWlsIjpbInRlc3R1c2VyQGdtYWlsLmNvbSJdfSwic2ln' +
    'bl9pbl9wcm92aWRlciI6InBhc3N3b3JkIn19.SIGNATURE';


/**
 * Asserts the values in the token provided.
 * @param {!fireauth.IdToken} token The ID token to assert.
 * @param {?string} email The expected email.
 * @param {number} exp The expected expiration field.
 * @param {?string} providerId The expected provider ID.
 * @param {?string} displayName The expected display name.
 * @param {?string} photoURL The expected photo URL.
 * @param {boolean} anonymous The expected anonymous status.
 * @param {string} localId The expected user ID.
 * @param {?string} federatedId The expected federated ID.
 * @param {boolean} verified The expected verified status.
 * @param {?string} phoneNumber The expected phone number.
 */
function assertToken(
    token,
    email,
    exp,
    providerId,
    displayName,
    photoURL,
    anonymous,
    localId,
    federatedId,
    verified,
    phoneNumber) {
  assertEquals(email, token.getEmail());
  assertEquals(exp, token.getExp());
  assertEquals(providerId, token.getProviderId());
  assertEquals(displayName, token.getDisplayName());
  assertEquals(photoURL, token.getPhotoUrl());
  assertEquals(localId, token.getLocalId());
  assertEquals(federatedId, token.getFederatedId());
  assertEquals(anonymous, token.isAnonymous());
  assertEquals(verified, token.isVerified());
  assertEquals(phoneNumber, token.getPhoneNumber());
}


function testParse_invalid() {
  assertNull(fireauth.IdToken.parse('gegege.invalid.ggrgheh'));
}


function testParse_anonymous() {
  var token = fireauth.IdToken.parse(tokenAnonymous);
  assertToken(
      token,
      null,
      1326446190,
      null,
      null,
      null,
      true,
      '365',
      null,
      false,
      null);
}


function testParse_needPadding() {
  var token = fireauth.IdToken.parse(tokenGmail);
  assertToken(
      token,
      'test123456@gmail.com',
      1326439044,
      'gmail.com',
      null,
      null,
      false,
      '679',
      'https://www.google.com/accounts/123456789',
      false,
      null);
  assertTrue(token.isExpired());
}


function testParse_noPadding() {
  var token = fireauth.IdToken.parse(tokenYahoo);
  assertToken(
      token,
      'user123@yahoo.com',
      1326446190,
      'yahoo.com',
      null,
      null,
      false,
      '274',
      'https://me.yahoo.com/whoamiwhowhowho#4a4ac',
      false,
      null);
  assertTrue(token.isExpired());
}


function testParse_unexpired() {
  // This token will expire in year 2047.
  var token = fireauth.IdToken.parse(tokenGoogleWithFederatedId);
  assertToken(
      token,
      'testuser@gmail.com',
      2442455688,
      'google.com',
      'John Doe',
      'https://lh5.googleusercontent.com/1458474/photo.jpg',
      false,
      '1458474',
      null,
      true,
      null);
  // Check issuer of token.
  assertEquals('https://identitytoolkit.google.com/', token.getIssuer());
  assertFalse(token.isExpired());
}


function testParse_phoneAndFirebaseProviderId() {
  var token = fireauth.IdToken.parse(tokenPhone);
  assertToken(
      token,
      'user@example.com',
      1506053883,
      'phone',
      null,
      null,
      false,
      '123456',
      null,
      false,
      '+11234567890');
  assertEquals('https://securetoken.google.com/projectId', token.getIssuer());
}


function testParseIdTokenClaims_invalid() {
  assertNull(fireauth.IdToken.parseIdTokenClaims('gegege.invalid.ggrgheh'));
}


function testParseIdTokenClaims_null() {
  assertNull(fireauth.IdToken.parseIdTokenClaims(null));
}


function testParseIdTokenClaims() {
  var tokenJSON = fireauth.IdToken.parseIdTokenClaims(
      tokenGoogleWithFederatedId);
  assertObjectEquals(
      {
        'iss': 'https://identitytoolkit.google.com/',
        'aud': '12345678.apps.googleusercontent.com',
        'iat': 1441246088,
        'exp': 2442455688,
        'sub': '1458474',
        'email': 'testuser@gmail.com',
        'provider_id': 'google.com',
        'verified': true,
        'display_name': 'John Doe',
        'photo_url': 'https://lh5.googleusercontent.com/1458474/photo.jpg'
      },
      tokenJSON);
}


function testParseIdTokenClaims_customClaims() {
  var tokenJSON = fireauth.IdToken.parseIdTokenClaims(tokenCustomClaim);
  assertObjectEquals(
      {
        'iss': 'https://securetoken.google.com/projectId',
        'name': 'John Doe',
        'admin': true,
        'aud': 'projectId',
        'auth_time': 1522715325,
        'sub': 'nep2uwNCK4PqjvoKjb0InVJHlGi1',
        'iat': 1522776807,
        'exp': 1522780575,
        'email': "testuser@gmail.com",
        'email_verified': true,
        'firebase': {
          'identities': {
            'email': [
              'testuser@gmail.com'
            ]
          },
          'sign_in_provider': 'password'
        }
      },
      tokenJSON);
}
