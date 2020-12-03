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
import {
  BundleElement,
  LimitType as BundleLimitType
} from '../../../src/protos/firestore_bundle_proto';
import { DatabaseId } from '../../../src/core/database_info';
import * as api from '../../../src/protos/firestore_proto_api';
import { Value } from '../../../src/protos/firestore_proto_api';
import {
  JsonProtoSerializer,
  toName,
  toQueryTarget
} from '../../../src/remote/serializer';
import {
  newSerializer,
  newTextEncoder
} from '../../../src/platform/serializer';
import {
  LimitType,
  Query,
  queryToTarget,
  queryWithLimit
} from '../../../src/core/query';
import { DocumentKey } from '../../../src/model/path';

export const encoder = newTextEncoder();

function lengthPrefixedString(o: {}): string {
  const str = JSON.stringify(o);
  const l = encoder.encode(str).byteLength;
  return `${l}${str}`;
}

export class TestBundleBuilder {
  readonly elements: BundleElement[] = [];
  private serializer: JsonProtoSerializer;
  constructor(private databaseId: DatabaseId) {
    this.serializer = newSerializer(databaseId);
  }

  addDocumentMetadata(
    docKey: DocumentKey,
    readTime: api.Timestamp,
    exists: boolean
  ): TestBundleBuilder {
    this.elements.push({
      documentMetadata: {
        name: toName(this.serializer, docKey),
        readTime,
        exists
      }
    });
    return this;
  }
  addDocument(
    docKey: DocumentKey,
    createTime: api.Timestamp,
    updateTime: api.Timestamp,
    fields: api.ApiClientObjectMap<Value>
  ): TestBundleBuilder {
    this.elements.push({
      document: {
        name: toName(this.serializer, docKey),
        createTime,
        updateTime,
        fields
      }
    });
    return this;
  }

  addNamedQuery(
    name: string,
    readTime: api.Timestamp,
    query: Query
  ): TestBundleBuilder {
    let bundledLimitType: BundleLimitType | undefined = !!query.limit
      ? 'FIRST'
      : undefined;
    if (query.limitType === LimitType.Last) {
      query = queryWithLimit(query, query.limit!, LimitType.First);
      bundledLimitType = 'LAST';
    }
    const queryTarget = toQueryTarget(this.serializer, queryToTarget(query));
    this.elements.push({
      namedQuery: {
        name,
        readTime,
        bundledQuery: {
          parent: queryTarget.parent,
          structuredQuery: queryTarget.structuredQuery,
          limitType: bundledLimitType
        }
      }
    });
    return this;
  }

  getMetadataElement(
    id: string,
    createTime: api.Timestamp,
    version = 1
  ): BundleElement {
    let totalDocuments = 0;
    let totalBytes = 0;
    for (const element of this.elements) {
      if (element.documentMetadata && !element.documentMetadata.exists) {
        totalDocuments += 1;
      }
      if (element.document) {
        totalDocuments += 1;
      }
      totalBytes += encoder.encode(lengthPrefixedString(element)).byteLength;
    }

    return {
      metadata: {
        id,
        createTime,
        version,
        totalDocuments,
        totalBytes
      }
    };
  }

  build(id: string, createTime: api.Timestamp, version = 1): string {
    let result = '';
    for (const element of this.elements) {
      result += lengthPrefixedString(element);
    }
    return (
      lengthPrefixedString(this.getMetadataElement(id, createTime, version)) +
      result
    );
  }
}

// TODO(wuandy): Ideally, these should use `TestBundleBuilder` above.
export const meta: BundleElement = {
  metadata: {
    id: 'test-bundle',
    createTime: { seconds: 1577836805, nanos: 6 },
    version: 1,
    totalDocuments: 1,
    totalBytes: 416
  }
};
export const metaString = lengthPrefixedString(meta);

export const doc1Meta: BundleElement = {
  documentMetadata: {
    name:
      'projects/test-project/databases/(default)/documents/collectionId/doc1',
    readTime: { seconds: 5, nanos: 6 },
    exists: true
  }
};
export const doc1MetaString = lengthPrefixedString(doc1Meta);
export const doc1: BundleElement = {
  document: {
    name:
      'projects/test-project/databases/(default)/documents/collectionId/doc1',
    createTime: { seconds: 1, nanos: 2000000 },
    updateTime: { seconds: 3, nanos: 4000 },
    fields: { foo: { stringValue: 'value' }, bar: { integerValue: -42 } }
  }
};
export const doc1String = lengthPrefixedString(doc1);

export const doc2Meta: BundleElement = {
  documentMetadata: {
    name:
      'projects/test-project/databases/(default)/documents/collectionId/doc2',
    readTime: { seconds: 5, nanos: 6 },
    exists: true
  }
};
export const doc2MetaString = lengthPrefixedString(doc2Meta);
export const doc2: BundleElement = {
  document: {
    name:
      'projects/test-project/databases/(default)/documents/collectionId/doc2',
    createTime: { seconds: 1, nanos: 2000000 },
    updateTime: { seconds: 3, nanos: 4000 },
    fields: { foo: { stringValue: 'value1' }, bar: { integerValue: 42 } }
  }
};
export const doc2String = lengthPrefixedString(doc2);

export const noDocMeta: BundleElement = {
  documentMetadata: {
    name:
      'projects/test-project/databases/(default)/documents/collectionId/nodoc',
    readTime: { seconds: 5, nanos: 6 },
    exists: false
  }
};
export const noDocMetaString = lengthPrefixedString(noDocMeta);

export const limitQuery: BundleElement = {
  namedQuery: {
    name: 'limitQuery',
    bundledQuery: {
      parent: 'projects/fireeats-97d5e/databases/(default)/documents',
      structuredQuery: {
        from: [{ collectionId: 'node_3.7.5_7Li7XoCjutvNxwD0tpo9' }],
        orderBy: [{ field: { fieldPath: 'sort' }, direction: 'DESCENDING' }],
        limit: { 'value': 1 }
      },
      limitType: 'FIRST'
    },
    readTime: { 'seconds': 1590011379, 'nanos': 191164000 }
  }
};
export const limitQueryString = lengthPrefixedString(limitQuery);
export const limitToLastQuery: BundleElement = {
  namedQuery: {
    name: 'limitToLastQuery',
    bundledQuery: {
      parent: 'projects/fireeats-97d5e/databases/(default)/documents',
      structuredQuery: {
        from: [{ collectionId: 'node_3.7.5_7Li7XoCjutvNxwD0tpo9' }],
        orderBy: [{ field: { fieldPath: 'sort' }, direction: 'ASCENDING' }],
        limit: { 'value': 1 }
      },
      limitType: 'LAST'
    },
    readTime: { 'seconds': 1590011379, 'nanos': 543063000 }
  }
};
export const limitToLastQueryString = lengthPrefixedString(limitToLastQuery);
