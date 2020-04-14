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

var FIREBASE_CONFIG = {
  testName: 'valid-vapid-key',
  senderId: '35006771263',
  sendEndpoint: 'https://fcm.googleapis.com/fcm/send',
  projectServerKey:
    'AAAACCaQ8D8:APA91bFzayKNdfHxknHc81ny3Ii9Zrj48M2Rgc67EgGQt8MAr-s_wiMznKPvs1Y0fdQa3vAsVJzA4vXUGMdPtzx7CWmGk7K6uZdXKYpc0-YkGVrglOyCszdnYaXLY-JqRUXYbTgHENPO'
};

module.exports = () => {
  return FIREBASE_CONFIG;
};
