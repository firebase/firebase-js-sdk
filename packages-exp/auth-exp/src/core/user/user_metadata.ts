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

import { UserMetadata as UserMetadataType } from '../../model/public_types';

import { utcTimestampToDateString } from '../util/time';

export class UserMetadata implements UserMetadataType {
  creationTime?: string;
  lastSignInTime?: string;

  constructor(
    private createdAt?: string | number,
    private lastLoginAt?: string | number
  ) {
    this._initializeTime();
  }

  private _initializeTime(): void {
    this.lastSignInTime = utcTimestampToDateString(this.lastLoginAt);
    this.creationTime = utcTimestampToDateString(this.createdAt);
  }

  _copy(metadata: UserMetadata): void {
    this.createdAt = metadata.createdAt;
    this.lastLoginAt = metadata.lastLoginAt;
    this._initializeTime();
  }

  toJSON(): object {
    return {
      createdAt: this.createdAt,
      lastLoginAt: this.lastLoginAt
    };
  }
}
