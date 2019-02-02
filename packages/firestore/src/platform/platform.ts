/**
 * @license
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

import { DatabaseId, DatabaseInfo } from '../core/database_info';
import { ProtoByteString } from '../core/types';
import { Connection } from '../remote/connection';
import { JsonProtoSerializer } from '../remote/serializer';
import { fail } from '../util/assert';
import { AnyJs } from '../util/misc';

/**
 * Provides a common interface to load anything platform dependent, e.g.
 * the connection implementation.
 *
 * An implementation of this must be provided at compile time for the platform.
 */
// TODO: Consider only exposing the APIs of 'document' and 'window' that we
// use in our client.
export interface Platform {
  loadConnection(databaseInfo: DatabaseInfo): Promise<Connection>;
  newSerializer(databaseId: DatabaseId): JsonProtoSerializer;

  /** Formats an object as a JSON string, suitable for logging. */
  formatJSON(value: AnyJs): string;

  /** Converts a Base64 encoded string to a binary string. */
  atob(encoded: string): string;

  /** Converts a binary string to a Base64 encoded string. */
  btoa(raw: string): string;

  /** The Platform's 'window' implementation or null if not available. */
  readonly window: Window | null;

  /** The Platform's 'document' implementation or null if not available. */
  readonly document: Document | null;

  /** True if and only if the Base64 conversion functions are available. */
  readonly base64Available: boolean;

  readonly emptyByteString: ProtoByteString;
}

/**
 * Provides singleton helpers where setup code can inject a platform at runtime.
 * setPlatform needs to be set before Firestore is used and must be set exactly
 * once.
 */
export class PlatformSupport {
  private static platform: Platform;
  static setPlatform(platform: Platform): void {
    if (PlatformSupport.platform) {
      fail('Platform already defined');
    }
    PlatformSupport.platform = platform;
  }

  static getPlatform(): Platform {
    if (!PlatformSupport.platform) {
      fail('Platform not set');
    }
    return PlatformSupport.platform;
  }
}

/**
 * Returns the representation of an empty "proto" byte string for the
 * platform.
 */
export function emptyByteString(): ProtoByteString {
  return PlatformSupport.getPlatform().emptyByteString;
}
