/**
 * @license
 * Copyright 2020 Google LLC
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

export enum Operation {
  PASSWORD_RESET = 'PASSWORD_RESET',
  RECOVER_EMAIL = 'RECOVER_EMAIL',
  EMAIL_SIGNIN = 'EMAIL_SIGNIN',
  VERIFY_EMAIL = 'VERIFY_EMAIL',
  VERIFY_AND_CHANGE_EMAIL = 'VERIFY_AND_CHANGE_EMAIL',
  REVERT_SECOND_FACTOR_ADDITION = 'REVERT_SECOND_FACTOR_ADDITION'
}

export interface ActionCodeInfo {
  data: {
    email: string | null;
    fromEmail: string | null;
  };
  operation: string;
}
