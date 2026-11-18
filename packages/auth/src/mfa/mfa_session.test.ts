/**
 * @license
 * Copyright 2026 Google LLC
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

import { MultiFactorSessionImpl, MultiFactorSessionType } from './mfa_session';
describe('core/mfa/mfa_session/MultiFactorSession', () => {
  describe('toJSON', () => {
    describe('ENROLL', () => {
      it('should serialize correctly', () => {
        const mfaSession = MultiFactorSessionImpl._fromIdtoken('id-token');
        expect(mfaSession.toJSON()).toEqual({
          multiFactorSession: { idToken: 'id-token' }
        });
      });
    });

    describe('SIGN_IN', () => {
      it('should serialize correctly', () => {
        const mfaSession = MultiFactorSessionImpl._fromMfaPendingCredential(
          'mfa-pending-credential'
        );
        expect(mfaSession.toJSON()).toEqual({
          multiFactorSession: { pendingCredential: 'mfa-pending-credential' }
        });
      });
    });
  });

  describe('.fromJSON', () => {
    describe('ENROLL', () => {
      it('should deserialize correctly', () => {
        const mfaSession = MultiFactorSessionImpl.fromJSON({
          multiFactorSession: { idToken: 'id-token' }
        });
        expect(mfaSession).toBeInstanceOf(MultiFactorSessionImpl);
        expect(mfaSession!.type).toBe(MultiFactorSessionType.ENROLL);
        expect(mfaSession!.credential).toBe('id-token');
      });
    });

    describe('SIGN_IN', () => {
      it('should deserialize correctly', () => {
        const mfaSession = MultiFactorSessionImpl.fromJSON({
          multiFactorSession: { pendingCredential: 'mfa-pending-credential' }
        });
        expect(mfaSession).toBeInstanceOf(MultiFactorSessionImpl);
        expect(mfaSession!.type).toBe(MultiFactorSessionType.SIGN_IN);
        expect(mfaSession!.credential).toBe('mfa-pending-credential');
      });
    });

    describe('invalid', () => {
      it('should return null', () => {
        expect(
          MultiFactorSessionImpl.fromJSON({ multiFactorSession: {} })
        ).toBeNull();
      });
    });
  });
});
