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

import { getDocument } from '..';
import * as rollup from 'rollup';
import * as tmp from 'tmp';
import * as fs from 'fs';
import * as path from 'path';

// tslint:disable:no-floating-promises

import * as pkg from './../../package.json';
import { expect } from 'chai';

const dependencies =  Object.keys(
  Object.assign({}, pkg.peerDependencies, pkg.dependencies)
);

function resolveBrowserExterns(id:string) {
  return dependencies.some(dep => id === dep || id.startsWith(`${dep}/`));
}



describe.only('Dependencies', () => {

  it('getDocument', async () => {
    const input = tmp.fileSync().name;
    const output = tmp.fileSync().name;
    const content = `export { getDocument } from '${path.resolve(__dirname, '../dist/index.esm2017')}';`;
    console.log(content);
    fs.writeFileSync(input, content);
  const bundle = await  rollup.rollup({
      input: input,
      external: resolveBrowserExterns,
    });
    await bundle.write( { file: output, format: 'es'} );
 const result = fs.readFileSync(output, 'utf-8');
 
 const publicIdentifiers : string[] = [];
 for (const line of result.split("\n")) {
   const identifierRe = /^(?:async )?(?:function|class) ?([\w]*)/;
   
   
   const match = line.replace("","").match(identifierRe);
   
   if (match) {
     publicIdentifiers.push(match[1]);
   }
 }

    publicIdentifiers.sort();
 
 expect(publicIdentifiers).to.have.members([
   "AutoId",
   "BasePath",
   "Blob",
   "ByteString",
   "CollectionReference",
   "DatabaseId",
   "DatabaseInfo",
   "Datastore",
   "Document",
   "DocumentKey",
   "DocumentReference",
   "DocumentSnapshot",
   "EmptyCredentialsProvider",
   "FieldPath",
   "FirebaseCredentialsProvider",
   "Firestore",
   "FirestoreError",
   "FirestoreSettings",
   "GeoPoint",
   "MaybeDocument",
   "OAuthToken",
   "PlatformSupport",
   "ResourcePath",
   "Timestamp",
   "User",
   "UserDataWriter",
   "argToString",
   "assertBase64Available",
   "assertUint8ArrayAvailable",
   "binaryStringFromUint8Array",
   "debugAssert",
   "fail",
   "forEach",
   "formatPlural",
   "getDocument",
   "hardAssert",
   "invalidClassError",
   "isPlainObject",
   "isServerTimestamp",
   "isValidResourceName",
   "logError",
   "makeConstructorPrivate",
   "normalizeByteString",
   "normalizeNumber",
   "normalizeTimestamp",
   "ordinal",
   "primitiveComparator",
   "tryGetCustomObjectType",
   "typeOrder",
   "uint8ArrayFromBinaryString",
   "validateArgType",
   "validateExactNumberOfArgs",
   "validateType",
   "valueDescription"]);
  });
});
