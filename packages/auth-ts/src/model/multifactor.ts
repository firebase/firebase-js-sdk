import { Auth } from './auth';
import { UserCredential } from './user_credential';

export class MultiFactorResolver {
  private constructor(
    readonly auth: Auth,
    readonly session: MultiFactorSession,
    readonly multiFactorInfo: MultiFactorInfo[]
  ) {}
  resolveSignIn(assertion: MultiFactorAssertion): Promise<UserCredential> {
    throw new Error('not implemented');
  }
}

export interface MultiFactorGenerator {
  readonly factorId: string;
}

export interface MultiFactorSession {}

export interface MultiFactorUser {
  readonly enrolledFactors: MultiFactorInfo[];
  getSession(): Promise<MultiFactorSession>;
  enroll(
    assertion: MultiFactorAssertion,
    displayName?: string | null
  ): Promise<void>;
  unenroll(option: MultiFactorInfo | string): Promise<void>;
}

export interface MultiFactorAssertion {
  readonly factorId: string;
}

export interface PhoneMultiFactorAssertion extends MultiFactorAssertion {
  readonly factorId: string;
}

export interface MultiFactorInfo {
  readonly uid: string;
  readonly displayName?: string | null;
  readonly enrollmentTime: string;
  readonly factorId: string;
}

export interface PhoneMultiFactorInfo extends MultiFactorInfo {
  readonly phoneNumber: string;
}
