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
import { DocumentData } from '@firebase/firestore-types';
import { Value as ProtoValue } from '../protos/firestore_proto_api';
import { _DocumentKeyReference } from './user_data_reader';
import { DatabaseId } from '../core/database_info';
import { DocumentKey } from '../model/document_key';
import { ByteString } from '../util/byte_string';
import { Bytes } from '../../lite/src/api/bytes';
export declare type ServerTimestampBehavior = 'estimate' | 'previous' | 'none';
/**
 * Converts Firestore's internal types to the JavaScript types that we expose
 * to the user.
 */
export declare class UserDataWriter {
    private readonly databaseId;
    private readonly serverTimestampBehavior;
    private readonly referenceFactory;
    private readonly bytesFactory;
    constructor(databaseId: DatabaseId, serverTimestampBehavior: ServerTimestampBehavior, referenceFactory: (key: DocumentKey) => _DocumentKeyReference<DocumentData>, bytesFactory: (bytes: ByteString) => Bytes);
    convertValue(value: ProtoValue): unknown;
    private convertObject;
    private convertGeoPoint;
    private convertArray;
    private convertServerTimestamp;
    private convertTimestamp;
    private convertReference;
}
