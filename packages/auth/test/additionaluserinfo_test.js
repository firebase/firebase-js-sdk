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
 * @fileoverview Tests for additionaluserinfo.js
 */

goog.provide('fireauth.AdditionalUserInfoTest');

goog.require('fireauth.AdditionalUserInfo');
goog.require('fireauth.FacebookAdditionalUserInfo');
goog.require('fireauth.FederatedAdditionalUserInfo');
goog.require('fireauth.GenericAdditionalUserInfo');
goog.require('fireauth.GithubAdditionalUserInfo');
goog.require('fireauth.GoogleAdditionalUserInfo');
goog.require('fireauth.TwitterAdditionalUserInfo');
goog.require('goog.testing.jsunit');

goog.setTestOnly('fireauth.AdditionalUserInfoTest');


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

// Typical verifyPhoneNumber response.
var verifyPhoneNumberResponse = {
  'idToken': tokenPhone,
  'refreshToken': 'REFRESH_TOKEN',
  'expiresIn': '3600',
  'localId': '123456',
  'isNewUser': true,
  'phoneNumber': '+11234567890'
};

// Expected generic additional user info object for the above verifyPhoneNumber
// response.
var expectedGenericAdditionalUserInfo = {
  'isNewUser': true,
  'providerId': 'phone'
};

// "iss": "https://securetoken.google.com/12345678",
// "picture": "https://plus.google.com/abcdefghijklmnopqrstu",
// "aud": "12345678",
// "auth_time": 1510357622,
// "user_id": "abcdefghijklmnopqrstu",
// "sub": "abcdefghijklmnopqrstu",
// "iat": 1510357622,
// "exp": 1510361222,
// "email": "user@example.com",
// "email_verified": true,
// "firebase": {"identities": {
//               "email": ["user@example.com"]
//               }, "sign_in_provider": "password"}
var tokenEmail = 'HEAD.ew0KICAiaXNzIjogImh0dHBzOi8vc2VjdXJldG9rZW4uZ29vZ2xlL' +
                 'mNvbS8xMjM0NTY3OCIsDQogICJwaWN0dXJlIjogImh0dHBzOi8vcGx1cy5' +
                 'nb29nbGUuY29tL2FiY2RlZmdoaWprbG1ub3BxcnN0dSIsDQogICJhdWQiO' +
                 'iAiMTIzNDU2NzgiLA0KICAiYXV0aF90aW1lIjogMTUxMDM1NzYyMiwNCiA' +
                 'gInVzZXJfaWQiOiAiYWJjZGVmZ2hpamtsbW5vcHFyc3R1IiwNCiAgInN1Y' +
                 'iI6ICJhYmNkZWZnaGlqa2xtbm9wcXJzdHUiLA0KICAiaWF0IjogMTUxMDM' +
                 '1NzYyMiwNCiAgImV4cCI6IDE1MTAzNjEyMjIsDQogICJlbWFpbCI6ICJ1c' +
                 '2VyQGV4YW1wbGUuY29tIiwNCiAgImVtYWlsX3ZlcmlmaWVkIjogdHJ1ZSw' +
                 'NCiAgImZpcmViYXNlIjogew0KICAgICJpZGVudGl0aWVzIjogew0KICAgI' +
                 'CAgImVtYWlsIjogWw0KICAgICAgICAidXNlckBleGFtcGxlLmNvbSINCiA' +
                 'gICAgIF0NCiAgICB9LA0KICAgICJzaWduX2luX3Byb3ZpZGVyIjogInBhc' +
                 '3N3b3JkIg0KICB9DQp9.SIGNATURE';

// SignupNewUserResponse response without isNewUser field.
var signUpNewUserResponse = {
  'kind': 'identitytoolkit#SignupNewUserResponse',
  'idToken': tokenEmail,
  'refreshToken': 'REFRESH_TOKEN',
  'expiresIn': '3600',
  'localId': '123456'
};

// Expected generic additional user info object for the above signUpNewUser
// response.
var expectedGenericAdditionalUserInfoForSignUpNewUser = {
  'isNewUser': true,
  'providerId': 'password'
};

// Typical minimal verifyAssertion response for generic IdP user with no profile
// data.
var noProfileVerifyAssertion = {
  'kind': 'identitytoolkit#VerifyAssertionResponse',
  'idToken': 'ID_TOKEN',
  'isNewUser': true,
  'providerId': 'noprofile.com'
};

// Expected federated additional user info object with no profile.
var expectedNoProfileAdditionalUserInfo = {
  'isNewUser': true,
  'providerId': 'noprofile.com',
  'profile' : {}
};

// Typical verifyAssertion response for google user.
var googleVerifyAssertion = {
  'kind': 'identitytoolkit#VerifyAssertionResponse',
  'isNewUser': true,
  'idToken': 'ID_TOKEN',
  'providerId': 'google.com',
  'rawUserInfo': '{"kind":"plus#person","displayName":"John Doe","na' +
  'me":{"givenName":"John","familyName":"Doe"},"language":"en","isPl' +
  'usUser":true,"url":"https://plus.google.com/abcdefghijklmnopqrstu' +
  '","image":{"url":"https://lh5.googleusercontent.com/123456789012/' +
  'abcdefghijklmnopqrstuvwxyz/12345678/photo.jpg?sz=50","isDefault":' +
  'false},"placesLived":[{"primary":true,"value":"Mountain View, CA"' +
  '}],"emails":[{"type":"account","value":"dummyuser1234567@gmail.co' +
  'm"}],"ageRange":{"min":21},"verified":false,"circledByCount":0,"i' +
  'd":"abcdefghijklmnopqrstu","objectType":"person"}'
};

// Expected Google additional user info object.
var expectedGoogleAdditionalUserInfo = {
  'providerId': 'google.com',
  'isNewUser': true,
  'profile' : {
    'kind': 'plus#person',
    'displayName': 'John Doe',
    'name': {
      'givenName': 'John',
      'familyName': 'Doe'
    },
    'language': 'en',
    'isPlusUser': true,
    'url': 'https://plus.google.com/abcdefghijklmnopqrstu',
    'image': {
      'url': 'https://lh5.googleusercontent.com/123456789012/abcdefghijklmno' +
      'pqrstuvwxyz/12345678/photo.jpg?sz=50',
      'isDefault': false
    },
    'placesLived': [
      {
        'primary': true,
        'value': 'Mountain View, CA'
      }
    ],
    'emails': [
      {
        'type': 'account',
        'value': 'dummyuser1234567@gmail.com'
      }
    ],
    'ageRange': {
      'min': 21
    },
    'verified': false,
    'circledByCount': 0,
    'id': 'abcdefghijklmnopqrstu',
    'objectType': 'person'
  }
};

// Typical verifyAssertion response for Facebook user.
var facebookVerifyAssertion = {
  'kind': 'identitytoolkit#VerifyAssertionResponse',
  'isNewUser': true,
  'idToken': 'ID_TOKEN',
  'providerId': 'facebook.com',
  'rawUserInfo': '{"updated_time":"2015-09-14T19:51:07+0000","gender' +
  '":"male","timezone":-7,"link":"https://www.facebook.com/abcdefghi' +
  'jklmnopqr/1234567890123456/","verified":true,"last_name":"Do","loc' +
  'ale":"en_US","picture":{"data":{"is_silhouette":true,"url":"https' +
  '://scontent.xx.fbcdn.net/v.jpg"}},"age_range":{"min":21},"name":"' +
  'John Do","id":"1234567890123456","first_name":"John","email":"dumm' +
  'yuser1234567@gmail.com"}'
};

// Expected Facebook additional user info object.
var expectedFacebookAdditionalUserInfo = {
  'providerId': 'facebook.com',
  'isNewUser': true,
  'profile' : {
    'updated_time': '2015-09-14T19:51:07+0000',
    'gender': 'male',
    'timezone': -7,
    'link': 'https://www.facebook.com/abcdefghijklmnopqr/1234567890123456/',
    'verified': true,
    'last_name': 'Do',
    'locale': 'en_US',
    'picture': {
      'data': {
        'is_silhouette': true,
        'url': 'https://scontent.xx.fbcdn.net/v.jpg'
      }
    },
    'age_range': {
      'min': 21
    },
    'name': 'John Do',
    'id': '1234567890123456',
    'first_name': 'John',
    'email': 'dummyuser1234567@gmail.com'
  }
};

// Typical verifyAssertion response for Twitter user.
var twitterVerifyAssertion = {
  'kind': 'identitytoolkit#VerifyAssertionResponse',
  'isNewUser': false,
  'idToken': 'ID_TOKEN',
  'providerId': 'twitter.com',
  'screenName': 'twitterxy',
  'rawUserInfo': '{"utc_offset":null,"friends_count":10,"profile_ima' +
  'ge_url_https":"https://abs.twimg.com/sticky/default_profile_image' +
  's/default_profile_3_normal.png","listed_count":0,"profile_backgro' +
  'und_image_url":"http://abs.twimg.com/images/themes/theme1/bg.png"' +
  ',"default_profile_image":true,"favourites_count":0,"description":' +
  '"","created_at":"Thu Mar 26 03:05:49 +0000 2015","is_translator":' +
  'false,"profile_background_image_url_https":"https://abs.twimg.com' +
  '/images/themes/theme1/bg.png","protected":false,"screen_name":"tw' +
  'itterxy","id_str":"1234567890","profile_link_color":"0084B4","is_' +
  'translation_enabled":false,"id":1234567890,"geo_enabled":false,"p' +
  'rofile_background_color":"C0DEED","lang":"en","has_extended_profi' +
  'le":false,"profile_sidebar_border_color":"C0DEED","profile_text_c' +
  'olor":"333333","verified":false,"profile_image_url":"http://abs.t' +
  'wimg.com/sticky/default_profile_images/default_profile_3_normal.p' +
  'ng","time_zone":null,"url":null,"contributors_enabled":false,"pro' +
  'file_background_tile":false,"entities":{"description":{"urls":[]}' +
  '},"statuses_count":0,"follow_request_sent":false,"followers_count":' +
  '1,"profile_use_background_image":true,"default_profile":true,"follo' +
  'wing":false,"name":"John Doe","location":"","profile_sidebar_fill_c' +
  'olor":"DDEEF6","notifications":false}'
};

// Expected Twitter additional user info object.
var expectedTwitterAdditionalUserInfo = {
  'isNewUser': false,
  'providerId': 'twitter.com',
  'username': 'twitterxy',
  'profile' : {
    'utc_offset': null,
    'friends_count': 10,
    'profile_image_url_https': 'https://abs.twimg.com/sticky/default_profile' +
    '_images/default_profile_3_normal.png',
    'listed_count': 0,
    'profile_background_image_url': 'http://abs.twimg.com/images/themes/them' +
    'e1/bg.png',
    'default_profile_image': true,
    'favourites_count': 0,
    'description': '',
    'created_at': 'Thu Mar 26 03:05:49 +0000 2015',
    'is_translator': false,
    'profile_background_image_url_https': 'https://abs.twimg.com/images/them' +
    'es/theme1/bg.png',
    'protected': false,
    'screen_name': 'twitterxy',
    'id_str': '1234567890',
    'profile_link_color': '0084B4',
    'is_translation_enabled': false,
    'id': 1234567890,
    'geo_enabled': false,
    'profile_background_color': 'C0DEED',
    'lang': 'en',
    'has_extended_profile': false,
    'profile_sidebar_border_color': 'C0DEED',
    'profile_text_color': '333333',
    'verified': false,
    'profile_image_url': 'http://abs.twimg.com/sticky/default_profile_images' +
    '/default_profile_3_normal.png',
    'time_zone': null,
    'url': null,
    'contributors_enabled': false,
    'profile_background_tile': false,
    'entities': {
      'description': {
        'urls': []
      }
    },
    'statuses_count': 0,
    'follow_request_sent': false,
    'followers_count': 1,
    'profile_use_background_image': true,
    'default_profile': true,
    'following': false,
    'name': 'John Doe',
    'location': '',
    'profile_sidebar_fill_color': 'DDEEF6',
    'notifications': false
  }
};

// Typical verifyAssertion response for GitHub user.
var githubVerifyAssertion = {
  'kind': 'identitytoolkit#VerifyAssertionResponse',
  'idToken': 'ID_TOKEN',
  'isNewUser': false,
  'providerId': 'github.com',
  'rawUserInfo': '{"gists_url":"https://api.github.com/users/uid1234' +
  '567890/gists{/gist_id}","repos_url":"https://api.github.com/users' +
  '/uid1234567890/repos","following_url":"https://api.github.com/use' +
  'rs/uid1234567890/following{/other_user}","bio":null,"created_at":' +
  '"2015-07-23T21:49:36Z","login":"uid1234567890","type":"User","blo' +
  'g":null,"subscriptions_url":"https://api.github.com/users/uid1234' +
  '567890/subscriptions","updated_at":"2016-06-21T20:22:45Z","site_a' +
  'dmin":false,"company":null,"id":13474811,"public_repos":0,"gravat' +
  'ar_id":"","email":null,"organizations_url":"https://api.github.co' +
  'm/users/uid1234567890/orgs","hireable":null,"starred_url":"https:' +
  '//api.github.com/users/uid1234567890/starred{/owner}{/repo}","fol' +
  'lowers_url":"https://api.github.com/users/uid1234567890/followers' +
  '","public_gists":0,"url":"https://api.github.com/users/uid1234567' +
  '890","received_events_url":"https://api.github.com/users/uid12345' +
  '67890/received_events","followers":0,"avatar_url":"https://avatar' +
  's.githubusercontent.com/u/12345678?v\\u003d3","events_url":"https' +
  '://api.github.com/users/uid1234567890/events{/privacy}","html_url' +
  '":"https://github.com/uid1234567890","following":0,"name":null,"l' +
  'ocation":null}'
};

// Expected GitHub additional user info object.
var expectedGithubAdditionalUserInfo = {
  'isNewUser': false,
  'providerId': 'github.com',
  'username': 'uid1234567890',
  'profile' : {
    'gists_url': 'https://api.github.com/users/uid1234567890/gists{/gist_id}',
    'repos_url': 'https://api.github.com/users/uid1234567890/repos',
    'following_url': 'https://api.github.com/users/uid1234567890/following{/' +
    'other_user}',
    'bio': null,
    'created_at': '2015-07-23T21:49:36Z',
    'login': 'uid1234567890',
    'type': 'User',
    'blog': null,
    'subscriptions_url':'https://api.github.com/users/uid1234567890/subscrip' +
    'tions',
    'updated_at': '2016-06-21T20:22:45Z',
    'site_admin': false,
    'company': null,
    'id': 13474811,
    'public_repos': 0,
    'gravatar_id': '',
    'email': null,
    'organizations_url': 'https://api.github.com/users/uid1234567890/orgs',
    'hireable': null,
    'starred_url': 'https://api.github.com/users/uid1234567890/starred{/owne' +
    'r}{/repo}',
    'followers_url': 'https://api.github.com/users/uid1234567890/followers',
    'public_gists': 0,
    'url': 'https://api.github.com/users/uid1234567890',
    'received_events_url': 'https://api.github.com/users/uid1234567890/recei' +
    'ved_events',
    'followers': 0,
    'avatar_url': 'https://avatars.githubusercontent.com/u/12345678?v=3',
    'events_url': 'https://api.github.com/users/uid1234567890/events{/privacy}',
    'html_url': 'https://github.com/uid1234567890',
    'following': 0,
    'name': null,
    'location': null
  }
};


function testInvalidAdditionalUserInfo() {
  var invalid = {};
  try {
    new fireauth.FederatedAdditionalUserInfo(invalid);
    fail('Initializing an invalid additional user info object should fail.');
  } catch (e) {
    assertEquals('Invalid additional user info!', e.message);
  }
  assertNull(fireauth.AdditionalUserInfo.fromPlainObject(invalid));
}


function testGenericAdditionalUserInfo() {
  var genericAdditionalUserInfo = new fireauth.GenericAdditionalUserInfo(
      verifyPhoneNumberResponse);
  assertObjectEquals(
      expectedGenericAdditionalUserInfo,
      genericAdditionalUserInfo);
  assertObjectEquals(
      genericAdditionalUserInfo,
      fireauth.AdditionalUserInfo.fromPlainObject(verifyPhoneNumberResponse));
}



function testGenericAdditionalUserInfo_fromSignUpNewUserResponse() {
  var genericAdditionalUserInfo = new fireauth.GenericAdditionalUserInfo(
      signUpNewUserResponse);
  assertObjectEquals(
      expectedGenericAdditionalUserInfoForSignUpNewUser,
      genericAdditionalUserInfo);
  assertObjectEquals(
      genericAdditionalUserInfo,
      fireauth.AdditionalUserInfo.fromPlainObject(signUpNewUserResponse));
}


function testGenericAdditionalUserInfo_fromAnonymousSignInResponse() {
  // "iss": "https://securetoken.google.com/12345678",
  // "provider_id": "anonymous",
  // "aud": "12345678",
  // "auth_time": 1510874749,
  // "user_id": "abcdefghijklmnopqrstu",
  // "sub": "abcdefghijklmnopqrstu",
  // "iat": 1510874749,
  // "exp": 1510878349,
  // "firebase": { "identities": {},
  //               "sign_in_provider": "anonymous"}
  var tokenAnonymous = 'HEAD.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5' +
                       'jb20vMTIzNDU2NzgiLCJwcm92aWRlcl9pZCI6ImFub255bW91cyI' +
                       'sImF1ZCI6IjEyMzQ1Njc4IiwiYXV0aF90aW1lIjoxNTEwODc0NzQ' +
                       '5LCJ1c2VyX2lkIjoiYWJjZGVmZ2hpamtsbW5vcHFyc3R1Iiwic3V' +
                       'iIjoiYWJjZGVmZ2hpamtsbW5vcHFyc3R1IiwiaWF0IjoxNTEwODc' +
                       '0NzQ5LCJleHAiOjE1MTA4NzgzNDksImZpcmViYXNlIjp7ImlkZW5' +
                       '0aXRpZXMiOnt9LCJzaWduX2luX3Byb3ZpZGVyIjoiYW5vbnltb3V' +
                       'zIn0sImFsZyI6IkhTMjU2In0.SIGNATURE';
  var anonymousSignInResponse = {
    'kind': 'identitytoolkit#SignupNewUserResponse',
    'idToken': tokenAnonymous,
    'refreshToken': 'REFRESH_TOKEN',
    'expiresIn': '3600',
    'localId': '123456'
  };
  var expectedGenericAdditionalUserInfo = {
    'isNewUser': true,
    'providerId': null
  };
  var genericAdditionalUserInfo = new fireauth.GenericAdditionalUserInfo(
      anonymousSignInResponse);
  assertObjectEquals(
      expectedGenericAdditionalUserInfo,
      genericAdditionalUserInfo);
  assertObjectEquals(
      genericAdditionalUserInfo,
      fireauth.AdditionalUserInfo.fromPlainObject(anonymousSignInResponse));

}


function testGenericAdditionalUserInfo_fromCustomTokenSignInResponse() {
  // "iss": "https://securetoken.google.com/12345678",
  // "aud": "12345678",
  // "auth_time": 1511378629,
  // "user_id": "abcdefghijklmnopqrstu",
  // "sub": "abcdefghijklmnopqrstu",
  // "iat": 1511378630,
  // "exp": 1511382230,
  // "firebase": { "identities": {},
  //               "sign_in_provider": "custom"}
  var tokenCustom = 'HEAD.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb2' +
                    '0vMTIzNDU2NzgiLCJhdWQiOiIxMjM0NTY3OCIsImF1dGhfdGltZSI6M' +
                    'TUxMTM3ODYyOSwidXNlcl9pZCI6ImFiY2RlZmdoaWprbG1ub3BxcnN0' +
                    'dSIsInN1YiI6ImFiY2RlZmdoaWprbG1ub3BxcnN0dSIsImlhdCI6MTU' +
                    'xMTM3ODYzMCwiZXhwIjoxNTExMzgyMjMwLCJmaXJlYmFzZSI6eyJpZG' +
                    'VudGl0aWVzIjp7fSwic2lnbl9pbl9wcm92aWRlciI6ImN1c3RvbSJ9L' +
                    'CJhbGciOiJIUzI1NiJ9.SIGNATURE';
  var customTokenSignInResponse = {
    'kind': 'identitytoolkit#VerifyCustomTokenResponse',
    'idToken': tokenCustom,
    'refreshToken': 'REFRESH_TOKEN',
    'expiresIn': '3600',
    'localId': '123456'
  };
  var expectedGenericAdditionalUserInfo = {
    'isNewUser': false,
    'providerId': null
  };
  var genericAdditionalUserInfo = new fireauth.GenericAdditionalUserInfo(
      customTokenSignInResponse);
  assertObjectEquals(
      expectedGenericAdditionalUserInfo,
      genericAdditionalUserInfo);
  assertObjectEquals(
      genericAdditionalUserInfo,
      fireauth.AdditionalUserInfo.fromPlainObject(customTokenSignInResponse));

}


function testFederatedAdditionalUserInfo_withProfile() {
  var federatedAdditionalUserInfo =
      new fireauth.FederatedAdditionalUserInfo(facebookVerifyAssertion);
  assertObjectEquals(
      expectedFacebookAdditionalUserInfo,
      federatedAdditionalUserInfo);
}


function testFederatedAdditionalUserInfo_noProfile() {
  var noProfileAdditionalUserInfo =
      new fireauth.FederatedAdditionalUserInfo(noProfileVerifyAssertion);
  assertObjectEquals(
      expectedNoProfileAdditionalUserInfo,
      noProfileAdditionalUserInfo);
  assertObjectEquals(
      noProfileAdditionalUserInfo,
      fireauth.AdditionalUserInfo.fromPlainObject(noProfileVerifyAssertion));
}


function testFacebookAdditionalUserInfo() {
  var facebookAdditionalUserInfo =
      new fireauth.FacebookAdditionalUserInfo(facebookVerifyAssertion);
  assertObjectEquals(
      expectedFacebookAdditionalUserInfo,
      facebookAdditionalUserInfo);
  assertObjectEquals(
      facebookAdditionalUserInfo,
      fireauth.AdditionalUserInfo.fromPlainObject(facebookVerifyAssertion));
}


function testGithubAdditionalUserInfo() {
  var githubAdditionalUserInfo =
      new fireauth.GithubAdditionalUserInfo(githubVerifyAssertion);
  assertObjectEquals(
      expectedGithubAdditionalUserInfo,
      githubAdditionalUserInfo);
  assertObjectEquals(
      githubAdditionalUserInfo,
      fireauth.AdditionalUserInfo.fromPlainObject(githubVerifyAssertion));
}


function testGoogleAdditionalUserInfo() {
  var googleAdditionalUserInfo =
      new fireauth.GoogleAdditionalUserInfo(googleVerifyAssertion);
  assertObjectEquals(
      expectedGoogleAdditionalUserInfo,
      googleAdditionalUserInfo);
  assertObjectEquals(
      googleAdditionalUserInfo,
      fireauth.AdditionalUserInfo.fromPlainObject(googleVerifyAssertion));
}


function testTwitterAdditionalUserInfo() {
  var twitterAdditionalUserInfo =
      new fireauth.TwitterAdditionalUserInfo(twitterVerifyAssertion);
  assertObjectEquals(
      expectedTwitterAdditionalUserInfo,
      twitterAdditionalUserInfo);
  assertObjectEquals(
      twitterAdditionalUserInfo,
      fireauth.AdditionalUserInfo.fromPlainObject(twitterVerifyAssertion));
}
