/**
 * @license
 * Copyright 2024 Google LLC
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

import { Pipeline as LitePipeline } from '../lite-api/pipeline';
import { Stage } from '../lite-api/stage';
import { UserDataReader } from '../lite-api/user_data_reader';
import { AbstractUserDataWriter } from '../lite-api/user_data_writer';

import { Firestore } from './database';

export class Pipeline extends LitePipeline {
  /**
   * @internal
   * @private
   * @param db
   * @param userDataReader
   * @param userDataWriter
   * @param stages
   * @param converter
   * @protected
   */
  protected newPipeline(
    db: Firestore,
    userDataReader: UserDataReader,
    userDataWriter: AbstractUserDataWriter,
    stages: Stage[]
  ): Pipeline {
    return new Pipeline(db, userDataReader, userDataWriter, stages);
  }
}
