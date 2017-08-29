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
'use strict';

const FCM_APPLICATION_SERVER_KEY = [
  0x04,
  0x33,
  0x94,
  0xf7,
  0xdf,
  0xa1,
  0xeb,
  0xb1,
  0xdc,
  0x03,
  0xa2,
  0x5e,
  0x15,
  0x71,
  0xdb,
  0x48,
  0xd3,
  0x2e,
  0xed,
  0xed,
  0xb2,
  0x34,
  0xdb,
  0xb7,
  0x47,
  0x3a,
  0x0c,
  0x8f,
  0xc4,
  0xcc,
  0xe1,
  0x6f,
  0x3c,
  0x8c,
  0x84,
  0xdf,
  0xab,
  0xb6,
  0x66,
  0x3e,
  0xf2,
  0x0c,
  0xd4,
  0x8b,
  0xfe,
  0xe3,
  0xf9,
  0x76,
  0x2f,
  0x14,
  0x1c,
  0x63,
  0x08,
  0x6a,
  0x6f,
  0x2d,
  0xb1,
  0x1a,
  0x95,
  0xb0,
  0xce,
  0x37,
  0xc0,
  0x9c,
  0x6e
];

const SUBSCRIPTION_DETAILS = {
  userVisibleOnly: true,
  applicationServerKey: new Uint8Array(FCM_APPLICATION_SERVER_KEY)
};

export default {
  ENDPOINT: 'https://fcm.googleapis.com',
  APPLICATION_SERVER_KEY: FCM_APPLICATION_SERVER_KEY,
  SUBSCRIPTION_OPTIONS: SUBSCRIPTION_DETAILS
};
