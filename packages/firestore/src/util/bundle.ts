/**
 * @license
 * Copyright 2020 Google Inc.
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

import * as api from '../protos/firestore_proto_api';
import {
  BundledDocumentMetadata,
  BundleMetadata,
  NamedBundleQuery
} from "../protos/firestore_bundle_proto";

// Provides a high level API to read bundles.
export class Bundle {
  private bundleMetadata: BundleMetadata | null = null;
  private namedQueries: Array<NamedBundleQuery> | null = null;
  private documents: Array<
    [BundledDocumentMetadata, api.Document]
  > | null = null;
  private elementCursor: BundleElementCursor | null = null;

  constructor(private bundleBuffer: Uint8Array) {
    this.elementCursor = new BundleElementCursor(bundleBuffer.buffer);
  }

  getBundleMetadata(): BundleMetadata {
    if (this.elementCursor!.position > 0 && this.bundleMetadata === null) {
      // Throws
    }

    if (this.elementCursor!.position === 0) {
      this.bundleMetadata = this.elementCursor!.readAsBundleMetadata();
      this.elementCursor!.next();
    }
    return this.bundleMetadata!;
  }

  getNamedQueries(): Array<NamedBundleQuery> {
    this.getBundleMetadata();

    if (this.namedQueries !== null) {
      return this.namedQueries!;
    }

    this.namedQueries = [];
    let namedQuery = this.elementCursor!.readAsNamedQuery();
    while (!!namedQuery) {
      this.namedQueries.push(namedQuery);
      this.elementCursor!.next();
      namedQuery = this.elementCursor!.readAsNamedQuery();
    }

    return this.namedQueries!;
  }

  getDocuments(): Array<[BundledDocumentMetadata, api.Document]> {
    // TODO(): This should be cursor based as well.
    this.getNamedQueries();

    if (this.documents !== null) {
      return this.documents!;
    }

    this.documents = [];
    let docMetadata = this.elementCursor!.readAsDocumentMetadata();
    while (docMetadata !== null && this.elementCursor!.hasMore()) {
      this.elementCursor!.next();
      const doc = this.elementCursor!.readAsDocument();
      this.documents.push([docMetadata, doc!]);
      this.elementCursor!.next();
      if (this.elementCursor!.hasMore()) {
        docMetadata = this.elementCursor!.readAsDocumentMetadata();
      } else {
        docMetadata = null;
      }
    }

    return this.documents!;
  }
}

class BundleElementCursor {
  private readFrom = 0;
  private textDecoder = new TextDecoder('utf-8');

  constructor(private data: ArrayBuffer) {
    console.log(`Read buffer ${this.buf2hex(data.slice(0, 100))}`);
  }

  // Returns a Blob representing the next bundle element.
  public readElement(): ArrayBuffer {
    const length = this.readLength();
    const result = this.data.slice(
      this.readFrom + 4,
      this.readFrom + 4 + length
    );
    return result;
  }

  public readAsBundleMetadata(): BundleMetadata | null {
    const stringValue = this.textDecoder.decode(
      new DataView(this.readElement())
    );
    return JSON.parse(stringValue).metadata || null;
  }

  public readAsNamedQuery(): NamedBundleQuery | null {
    const stringValue = this.textDecoder.decode(
      new DataView(this.readElement())
    );
    const result = JSON.parse(stringValue);
    return result.namedQuery || null;
  }

  public readAsDocumentMetadata(): BundledDocumentMetadata | null {
    const stringValue = this.textDecoder.decode(
      new DataView(this.readElement())
    );
    // TODO: Why is this required??
    return JSON.parse(stringValue)["documentMetadata"] || null;
  }

  public readAsDocument(): api.Document | null {
    const stringValue = this.textDecoder.decode(
      new DataView(this.readElement())
    );
    return JSON.parse(stringValue) || null;
  }

  public next(): void {
    const length = this.readLength();
    this.readFrom = this.readFrom + 4 + length;
  }

  private buf2hex(buffer:ArrayBuffer) { // buffer is an ArrayBuffer
    return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
  }

  private readLength(): number {
    const lengthBlob = this.data.slice(this.readFrom, this.readFrom + 4);
    return this.toUInt32LE(lengthBlob);
  }

  private toUInt32LE(buffer: ArrayBuffer): number {
    return new DataView(buffer).getUint32(0, true);
  }

  public hasMore(): boolean {
    return this.data.byteLength > this.readFrom;
  }

  public get position() {
    return this.readFrom;
  }
}
