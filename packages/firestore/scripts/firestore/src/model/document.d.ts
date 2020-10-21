/**
 * @license
 * Copyright 2017 Google LLC
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
import { Value as ProtoValue, MapValue as ProtoMapValue } from '../protos/firestore_proto_api';
import { SnapshotVersion } from '../core/snapshot_version';
import { DocumentKey } from './document_key';
import { ObjectValue } from './object_value';
import { FieldPath } from './path';
export interface DocumentOptions {
    hasLocalMutations?: boolean;
    hasCommittedMutations?: boolean;
}
/**
 * The result of a lookup for a given path may be an existing document or a
 * marker that this document does not exist at a given version.
 */
export declare abstract class MaybeDocument {
    readonly key: DocumentKey;
    readonly version: SnapshotVersion;
    constructor(key: DocumentKey, version: SnapshotVersion);
    /**
     * Whether this document had a local mutation applied that has not yet been
     * acknowledged by Watch.
     */
    abstract get hasPendingWrites(): boolean;
    abstract isEqual(other: MaybeDocument | null | undefined): boolean;
    abstract toString(): string;
}
/**
 * Represents a document in Firestore with a key, version, data and whether the
 * data has local mutations applied to it.
 */
export declare class Document extends MaybeDocument {
    private readonly objectValue;
    readonly hasLocalMutations: boolean;
    readonly hasCommittedMutations: boolean;
    constructor(key: DocumentKey, version: SnapshotVersion, objectValue: ObjectValue, options: DocumentOptions);
    field(path: FieldPath): ProtoValue | null;
    data(): ObjectValue;
    toProto(): {
        mapValue: ProtoMapValue;
    };
    isEqual(other: MaybeDocument | null | undefined): boolean;
    toString(): string;
    get hasPendingWrites(): boolean;
}
/**
 * Compares the value for field `field` in the provided documents. Throws if
 * the field does not exist in both documents.
 */
export declare function compareDocumentsByField(field: FieldPath, d1: Document, d2: Document): number;
/**
 * A class representing a deleted document.
 * Version is set to 0 if we don't point to any specific time, otherwise it
 * denotes time we know it didn't exist at.
 */
export declare class NoDocument extends MaybeDocument {
    readonly hasCommittedMutations: boolean;
    constructor(key: DocumentKey, version: SnapshotVersion, options?: DocumentOptions);
    toString(): string;
    get hasPendingWrites(): boolean;
    isEqual(other: MaybeDocument | null | undefined): boolean;
}
/**
 * A class representing an existing document whose data is unknown (e.g. a
 * document that was updated without a known base document).
 */
export declare class UnknownDocument extends MaybeDocument {
    toString(): string;
    get hasPendingWrites(): boolean;
    isEqual(other: MaybeDocument | null | undefined): boolean;
}
