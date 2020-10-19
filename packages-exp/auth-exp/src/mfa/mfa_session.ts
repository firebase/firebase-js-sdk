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
import * as externs from '@firebase/auth-types-exp';

export enum MultiFactorSessionType {
  ENROLL = 'enroll',
  SIGN_IN = 'signin'
}

interface SerializedMultiFactorSession {
  multiFactorSession: {
    idToken?: string;
    pendingCredential?: string;
  };
}

export class MultiFactorSession implements externs.MultiFactorSession {
  private constructor(
    readonly type: MultiFactorSessionType,
    readonly credential: string
  ) {}

  static _fromIdtoken(idToken: string): MultiFactorSession {
    return new MultiFactorSession(MultiFactorSessionType.ENROLL, idToken);
  }

  static _fromMfaPendingCredential(
    mfaPendingCredential: string
  ): MultiFactorSession {
    return new MultiFactorSession(
      MultiFactorSessionType.SIGN_IN,
      mfaPendingCredential
    );
  }

  toJSON(): SerializedMultiFactorSession {
    const key =
      this.type === MultiFactorSessionType.ENROLL
        ? 'idToken'
        : 'pendingCredential';
    return {
      multiFactorSession: {
        [key]: this.credential
      }
    };
  }

  static fromJSON(
    obj: Partial<SerializedMultiFactorSession>
  ): MultiFactorSession | null {
    if (obj?.multiFactorSession) {
      if (obj.multiFactorSession?.pendingCredential) {
        return MultiFactorSession._fromMfaPendingCredential(
          obj.multiFactorSession.pendingCredential
        );
      } else if (obj.multiFactorSession?.idToken) {
        return MultiFactorSession._fromIdtoken(obj.multiFactorSession.idToken);
      }
    }
    return null;
  }
}
