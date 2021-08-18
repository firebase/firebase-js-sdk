/**
 * @license
 * Copyright 2018 Google Inc.
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

goog.provide('fireauth.IdTokenResultTest');

goog.require('fireauth.AuthError');
goog.require('fireauth.IdTokenResult');
goog.require('fireauth.authenum.Error');
goog.require('fireauth.common.testHelper');
goog.require('goog.testing.jsunit');

goog.setTestOnly();


function testIdTokenResult() {
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
  var tokenString = 'HEADER.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb' +
      '20vcHJvamVjdElkIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImF1ZCI6InB' +
      'yb2plY3RJZCIsImF1dGhfdGltZSI6MTUyMjcxNTMyNSwic3ViIjoibmVwMnV3TkNLNFBxa' +
      'nZvS2piMEluVkpIbEdpMSIsImlhdCI6MTUyMjc3NjgwNywiZXhwIjoxNTIyNzgwNTc1LCJ' +
      'lbWFpbCI6InRlc3R1c2VyQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJma' +
      'XJlYmFzZSI6eyJpZGVudGl0aWVzIjp7ImVtYWlsIjpbInRlc3R1c2VyQGdtYWlsLmNvbSJ' +
      'dfSwic2lnbl9pbl9wcm92aWRlciI6InBhc3N3b3JkIn19.SIGNATURE';
  var idTokenResult = new fireauth.IdTokenResult(tokenString);
  fireauth.common.testHelper.assertIdTokenResult(
      idTokenResult,
      tokenString,
      1522780575,
      1522715325,
      1522776807,
      'password',
      null,
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
      });
}


function testIdTokenResult_mfa() {
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
  //   "additional_factors": {
  //     "phone": [
  //       "+16505551234",
  //       "+16505557890"
  //     ]
  //   },
  //   "sign_in_provider": "password",
  //   "sign_in_second_factor": "phone"
  var tokenString = 'HEADER.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb' +
      '20vcHJvamVjdElkIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImF1ZCI6InB' +
      'yb2plY3RJZCIsImF1dGhfdGltZSI6MTUyMjcxNTMyNSwic3ViIjoibmVwMnV3TkNLNFBxa' +
      'nZvS2piMEluVkpIbEdpMSIsImlhdCI6MTUyMjc3NjgwNywiZXhwIjoxNTIyNzgwNTc1LCJ' +
      'lbWFpbCI6InRlc3R1c2VyQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJma' +
      'XJlYmFzZSI6eyJpZGVudGl0aWVzIjp7ImVtYWlsIjpbInRlc3R1c2VyQGdtYWlsLmNvbSJ' +
      'dfSwiYWRkaXRpb25hbF9mYWN0b3JzIjp7InBob25lIjogWyIrMTY1MDU1NTEyMzQiLCIrM' +
      'TY1MDU1NTc4OTAiXX0sInNpZ25faW5fcHJvdmlkZXIiOiJwYXNzd29yZCIsInNpZ25faW5' +
      'fc2Vjb25kX2ZhY3RvciI6ICJwaG9uZSJ9fQ.SIGNATURE';
  var idTokenResult = new fireauth.IdTokenResult(tokenString);
  fireauth.common.testHelper.assertIdTokenResult(
      idTokenResult,
      tokenString,
      1522780575,
      1522715325,
      1522776807,
      'password',
      'phone',
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
          'additional_factors': {
            'phone': [
              '+16505551234',
              '+16505557890'
            ]
          },
          'sign_in_provider': 'password',
          'sign_in_second_factor': 'phone'
        }
      });
}


function testIdTokenResult_invalid() {
  var tokenString = 'gegege.invalid.ggrgheh';
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.INTERNAL_ERROR,
      'An internal error occurred. The token obtained by Firebase appears ' +
      'to be malformed. Please retry the operation.');
  var error = assertThrows(function() {
    new fireauth.IdTokenResult(tokenString);
  });
  fireauth.common.testHelper.assertErrorEquals(expectedError, error);
}


function testIdTokenResult_null() {
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.INTERNAL_ERROR,
      'An internal error occurred. The token obtained by Firebase appears ' +
      'to be malformed. Please retry the operation.');
  var error = assertThrows(function() {
    new fireauth.IdTokenResult(null);
  });
  fireauth.common.testHelper.assertErrorEquals(expectedError, error);
}


function testIdTokenResult_missingRequiredFields() {
  // "iss": "https://securetoken.google.com/projectId",
  // "name": "John Doe",
  // "admin": true,
  // "aud": "projectId",
  // "sub": "nep2uwNCK4PqjvoKjb0InVJHlGi1",
  // "email": "testuser@gmail.com",
  // "email_verified": true,
  // "firebase": {
  //   "identities": {
  //     "email": [
  //       "testuser@gmail.com"
  //     ]
  //   },
  //   "sign_in_provider": "password"
  var tokenString = 'HEADER.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb' +
      '20vcHJvamVjdElkIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImF1ZCI6InB' +
      'yb2plY3RJZCIsInN1YiI6Im5lcDJ1d05DSzRQcWp2b0tqYjBJblZKSGxHaTEiLCJlbWFpb' +
      'CI6InRlc3R1c2VyQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJmaXJlYmF' +
      'zZSI6eyJpZGVudGl0aWVzIjp7ImVtYWlsIjpbInRlc3R1c2VyQGdtYWlsLmNvbSJdfSwic' +
      '2lnbl9pbl9wcm92aWRlciI6InBhc3N3b3JkIn19.SIGNATURE';
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.INTERNAL_ERROR,
      'An internal error occurred. The token obtained by Firebase appears ' +
      'to be malformed. Please retry the operation.');
  var error = assertThrows(function() {
    new fireauth.IdTokenResult(tokenString);
  });
  fireauth.common.testHelper.assertErrorEquals(expectedError, error);
}
