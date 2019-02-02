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

const DEMO_LIST = [
  {
    name: 'valid-no-vapid-key',
    senderId: '660737059320',
    apiKey:
      'AAAAmdb_afg:APA91bEa0scOaRxp1G-Rg5DGML1fm34LNm97hjAIT-KETrpm33B8Q3HK5xlqheX6l2i7CPHxAMxy06WK9pQIy-jl5UGVpl66b8ZnDc_2qzs8b7jmCnBIjqr7m35-NoGXI9WvAtFgoOVA'
  },
  {
    name: 'valid-vapid-key',
    senderId: '650229866790',
    apiKey:
      'AAAAl2S4YSY:APA91bGQCJMhV3G_eiSGep0z0yb9hLs7TDNx8W3ZXyztSPRSnmVys_D_yQ5FwDpRY-THKqufyUmI3PGN7XpvaXIUl-logEJpxyO8A1_5CMTF1-AR9vNt0qeWZbv8SJqte0MwMxcVebNJ'
  }
];

module.exports = {
  DEMOS: DEMO_LIST
};
