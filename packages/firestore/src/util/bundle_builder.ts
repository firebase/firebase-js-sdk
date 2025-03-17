/**
 * @license
 * Copyright 2025 Google LLC
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
  BundleMetadata
} from '../protos/firestore_bundle_proto';
import { JsonProtoSerializer } from '../remote/serializer';
import { SizedBundleElement } from '../util/bundle_reader';


/**
 * A class that can serialize Firestore results into a Firestore bundle.
 *
 */
export interface BundleBuilder {
  serializer: JsonProtoSerializer;

  close(): Promise<void>;

  getMetadata(): Promise<BundleMetadata>;

  nextElement(): Promise<SizedBundleElement | null>;
}
