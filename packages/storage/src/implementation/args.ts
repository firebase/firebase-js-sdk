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
import * as errorsExports from './error';
import * as MetadataUtils from './metadata';
import * as ListOptionsUtils from './list';
import * as type from './type';

/**
 * @param name Name of the function.
 * @param specs Argument specs.
 * @param passed The actual arguments passed to the function.
 * @throws {fbs.Error} If the arguments are invalid.
 */
export function validate(
  name: string,
  specs: ArgSpec[],
  passed: IArguments
): void {
  let minArgs = specs.length;
  const maxArgs = specs.length;
  for (let i = 0; i < specs.length; i++) {
    if (specs[i].optional) {
      minArgs = i;
      break;
    }
  }
  const validLength = minArgs <= passed.length && passed.length <= maxArgs;
  if (!validLength) {
    throw errorsExports.invalidArgumentCount(
      minArgs,
      maxArgs,
      name,
      passed.length
    );
  }
  for (let i = 0; i < passed.length; i++) {
    try {
      specs[i].validator(passed[i]);
    } catch (e) {
      if (e instanceof Error) {
        throw errorsExports.invalidArgument(i, name, e.message);
      } else {
        throw errorsExports.invalidArgument(i, name, e);
      }
    }
  }
}

/**
 * @struct
 */
export class ArgSpec {
  validator: (p1: unknown) => void;
  optional: boolean;

  constructor(validator: (p1: unknown) => void, optional?: boolean) {
    const self = this;
    this.validator = function(p: unknown) {
      if (self.optional && !type.isJustDef(p)) {
        return;
      }
      validator(p);
    };
    this.optional = !!optional;
  }
}

export function and_(
  v1: (p1: unknown) => void,
  v2: (p1: unknown) => void
): (p1: unknown) => void {
  return function(p) {
    v1(p);
    v2(p);
  };
}

export function stringSpec(
  validator?: (p1: unknown) => void | null,
  optional?: boolean
): ArgSpec {
  function stringValidator(p: unknown): void {
    if (!type.isString(p)) {
      throw 'Expected string.';
    }
  }
  let chainedValidator;
  if (validator) {
    chainedValidator = and_(stringValidator, validator);
  } else {
    chainedValidator = stringValidator;
  }
  return new ArgSpec(chainedValidator, optional);
}

export function uploadDataSpec(): ArgSpec {
  function validator(p: unknown): void {
    const valid =
      p instanceof Uint8Array ||
      p instanceof ArrayBuffer ||
      (type.isNativeBlobDefined() && p instanceof Blob);
    if (!valid) {
      throw 'Expected Blob or File.';
    }
  }
  return new ArgSpec(validator);
}

export function metadataSpec(optional?: boolean): ArgSpec {
  return new ArgSpec(MetadataUtils.metadataValidator, optional);
}

export function listOptionSpec(optional?: boolean): ArgSpec {
  return new ArgSpec(ListOptionsUtils.listOptionsValidator, optional);
}

export function nonNegativeNumberSpec(): ArgSpec {
  function validator(p: unknown): void {
    const valid = type.isNumber(p) && p >= 0;
    if (!valid) {
      throw 'Expected a number 0 or greater.';
    }
  }
  return new ArgSpec(validator);
}

export function looseObjectSpec(
  validator?: ((p1: unknown) => void) | null,
  optional?: boolean
): ArgSpec {
  function isLooseObjectValidator(p: unknown): void {
    const isLooseObject = p === null || (type.isDef(p) && p instanceof Object);
    if (!isLooseObject) {
      throw 'Expected an Object.';
    }
    if (validator !== undefined && validator !== null) {
      validator(p);
    }
  }
  return new ArgSpec(isLooseObjectValidator, optional);
}

export function nullFunctionSpec(optional?: boolean): ArgSpec {
  function validator(p: unknown): void {
    const valid = p === null || type.isFunction(p);
    if (!valid) {
      throw 'Expected a Function.';
    }
  }
  return new ArgSpec(validator, optional);
}
