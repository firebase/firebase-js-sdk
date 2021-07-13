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

import { UploadTaskSnapshot } from '../exp/api';
import { ReferenceCompat } from './reference';
import { UploadTaskCompat } from './task';
import * as types from '@firebase/storage-types';
import { Compat } from '@firebase/util';

export class UploadTaskSnapshotCompat
  implements types.UploadTaskSnapshot, Compat<UploadTaskSnapshot> {
  constructor(
    readonly _delegate: UploadTaskSnapshot,
    readonly task: UploadTaskCompat,
    readonly ref: ReferenceCompat
  ) {}

  get bytesTransferred(): number {
    return this._delegate.bytesTransferred;
  }
  get metadata(): types.FullMetadata {
    return this._delegate.metadata as types.FullMetadata;
  }
  get state(): string {
    return this._delegate.state;
  }
  get totalBytes(): number {
    return this._delegate.totalBytes;
  }
}
