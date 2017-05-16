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

const FCM_APPLICATION_SERVER_KEY = [0x04, 0x33, 0x94, 0xF7, 0xDF,
  0xA1, 0xEB, 0xB1, 0xDC, 0x03, 0xA2, 0x5E, 0x15, 0x71, 0xDB, 0x48,
  0xD3, 0x2E, 0xED, 0xED, 0xB2, 0x34, 0xDB, 0xB7, 0x47, 0x3A, 0x0C,
  0x8F, 0xC4, 0xCC, 0xE1, 0x6F, 0x3C, 0x8C, 0x84, 0xDF, 0xAB, 0xB6,
  0x66, 0x3E, 0xF2, 0x0C, 0xD4, 0x8B, 0xFE, 0xE3, 0xF9, 0x76, 0x2F,
  0x14, 0x1C, 0x63, 0x08, 0x6A, 0x6F, 0x2D, 0xB1, 0x1A, 0x95, 0xB0,
  0xCE, 0x37, 0xC0, 0x9C, 0x6E];

const SUBSCRIPTION_DETAILS = {
  'userVisibleOnly': true,
  'applicationServerKey': new Uint8Array(FCM_APPLICATION_SERVER_KEY)
};

export default {
  ENDPOINT: 'https://fcm.googleapis.com',
  APPLICATION_SERVER_KEY: FCM_APPLICATION_SERVER_KEY,
  SUBSCRIPTION_OPTIONS: SUBSCRIPTION_DETAILS
};