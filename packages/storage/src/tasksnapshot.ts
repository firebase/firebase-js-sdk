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
import { TaskState } from './implementation/taskenums';
import * as type from './implementation/type';
import { Metadata } from './metadata';
import { Reference } from './reference';
import { UploadTask } from './task';

export class UploadTaskSnapshot {
  constructor(
    readonly bytesTransferred: number,
    readonly totalBytes: number,
    readonly state: TaskState,
    readonly metadata: Metadata | null,
    readonly task: UploadTask,
    readonly ref: Reference
  ) {}

  get downloadURL(): string | null {
    if (this.metadata !== null) {
      let urls = this.metadata['downloadURLs'];
      if (urls != null && urls[0] != null) {
        return urls[0];
      } else {
        return null;
      }
    } else {
      return null;
    }
  }
}
