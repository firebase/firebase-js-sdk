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

import { expect, use } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { MultiFactorSession, MultiFactorSessionType } from './mfa_session';

use(chaiAsPromised);

describe('core/mfa/mfa_session/MultiFactorSession', () => {
  describe('toJSON', () => {
    context('ENROLL', () => {
      it('should serialize correctly', () => {
        const mfaSession = MultiFactorSession._fromIdtoken('id-token');
        expect(mfaSession.toJSON()).to.eql({
          multiFactorSession: { idToken: 'id-token' }
        });
      });
    });

    context('SIGN_IN', () => {
      it('should serialize correctly', () => {
        const mfaSession = MultiFactorSession._fromMfaPendingCredential(
          'mfa-pending-credential'
        );
        expect(mfaSession.toJSON()).to.eql({
          multiFactorSession: { pendingCredential: 'mfa-pending-credential' }
        });
      });
    });
  });

  describe('.fromJSON', () => {
    context('ENROLL', () => {
      it('should deserialize correctly', () => {
        const mfaSession = MultiFactorSession.fromJSON({
          multiFactorSession: { idToken: 'id-token' }
        });
        expect(mfaSession).to.be.instanceOf(MultiFactorSession);
        expect(mfaSession!.type).to.eq(MultiFactorSessionType.ENROLL);
        expect(mfaSession!.credential).to.eq('id-token');
      });
    });

    context('SIGN_IN', () => {
      it('should deserialize correctly', () => {
        const mfaSession = MultiFactorSession.fromJSON({
          multiFactorSession: { pendingCredential: 'mfa-pending-credential' }
        });
        expect(mfaSession).to.be.instanceOf(MultiFactorSession);
        expect(mfaSession!.type).to.eq(MultiFactorSessionType.SIGN_IN);
        expect(mfaSession!.credential).to.eq('mfa-pending-credential');
      });
    });

    context('invalid', () => {
      it('should return null', () => {
        expect(MultiFactorSession.fromJSON({ multiFactorSession: {} })).to.be
          .null;
      });
    });
  });
});
