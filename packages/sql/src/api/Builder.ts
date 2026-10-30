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

import type { FirebaseSqlError } from '../core/error';

export interface OperationBase {
  status: number;
  statusText: string;
}

export interface OperationSuccess<T> extends OperationBase {
  success: true;
  error: null;
  data: T;
  count: number | null;
}

export interface OperationFailure extends OperationBase {
  success: false;
  error: FirebaseSqlError;
  data: null;
  count: null;
}

export type OperationResult<T> = OperationSuccess<T> | OperationFailure;

export type ContainsNull<T> = unknown extends T
  ? false
  : null extends T
    ? true
    : false;

export type SelectQueryError<Message extends string> = {
  error: true;
} & Message;

export type IsValidResultOverride<T, NewResult, ErrorResult, ErrorNewResult> =
  unknown extends T
    ? true
    : T extends unknown[]
      ? NewResult extends unknown[]
        ? true
        : ErrorResult
      : NewResult extends unknown[]
        ? ErrorNewResult
        : true;

export type CheckMatchingArrayTypes<T, NewResult> =
  T extends SelectQueryError<string>
    ? NewResult
    : IsValidResultOverride<
          T,
          NewResult,
          {
            Error: 'Type mismatch: Cannot cast array result to a single object. Use .overrideTypes<Array<YourType>> or .returns<Array<YourType>> (deprecated) for array results or .single() to convert the result to a single object';
          },
          {
            Error: 'Type mismatch: Cannot cast single object to array type. Remove Array wrapper from return type or make sure you are not using .single() up in the calling chain';
          }
        > extends infer ValidationResult
      ? ValidationResult extends true
        ? ContainsNull<T> extends true
          ? NewResult | null
          : NewResult
        : ValidationResult
      : never;

export type Simplify<T> = T extends object
  ? {
      [K in keyof T]: T[K];
    }
  : T;

export type ExplicitKeys<T> = {
  [K in keyof T]: string extends K ? never : K;
}[keyof T];

export type IsPlainObject<T> = T extends unknown[]
  ? false
  : T extends object
    ? true
    : false;

export type MergeExplicit<New, Row> = {
  [K in ExplicitKeys<New> | ExplicitKeys<Row>]: K extends keyof New
    ? K extends keyof Row
      ? Row[K] extends SelectQueryError<string>
        ? New[K]
        : New[K] extends unknown[]
          ? Row[K] extends unknown[]
            ? Array<
                Simplify<
                  MergeDeep<
                    NonNullable<New[K][number]>,
                    NonNullable<Row[K][number]>
                  >
                >
              >
            : New[K]
          : IsPlainObject<NonNullable<New[K]>> extends true
            ? IsPlainObject<NonNullable<Row[K]>> extends true
              ? ContainsNull<New[K]> extends true
                ? Simplify<
                    MergeDeep<NonNullable<New[K]>, NonNullable<Row[K]>>
                  > | null
                : Simplify<MergeDeep<New[K], NonNullable<Row[K]>>>
              : New[K]
            : New[K]
      : New[K]
    : K extends keyof Row
      ? Row[K]
      : never;
};

export type MergeDeep<New, Row> = Simplify<
  MergeExplicit<New, Row> &
    (string extends keyof Row
      ? {
          [K: string]: Row[string];
        }
      : {})
>;

export type MergePartialResult<NewResult, Result$1, Options> = Options extends {
  merge: true;
}
  ? Result$1 extends unknown[]
    ? NewResult extends unknown[]
      ? Array<Simplify<MergeDeep<NewResult[number], Result$1[number]>>>
      : never
    : Simplify<MergeDeep<NewResult, Result$1>>
  : NewResult;

export interface Builder<
  T,
  ThrowOnError extends boolean = false
> extends PromiseLike<
  ThrowOnError extends true ? OperationSuccess<T> : OperationResult<T>
> {
  throwOnError(): Builder<T, true>;

  stripNulls(): this;

  setHeader(name: string, value: string): this;

  retry(enabled: boolean): this;

  returns<NewResult>(): Builder<
    CheckMatchingArrayTypes<T, NewResult>,
    ThrowOnError
  >;

  overrideTypes<
    NewResult,
    Options extends {
      merge?: boolean | undefined;
    } = {
      merge: true;
    }
  >(): Builder<
    IsValidResultOverride<T, NewResult, false, false> extends true
      ? ContainsNull<T> extends true
        ? MergePartialResult<NewResult, NonNullable<T>, Options> | null
        : MergePartialResult<NewResult, T, Options>
      : CheckMatchingArrayTypes<T, NewResult>,
    ThrowOnError
  >;
}
