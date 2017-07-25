/**
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
import { errors } from './error';
import * as MetadataUtils from './metadata';
import * as type from './type';

/**
 * @param name Name of the function.
 * @param specs Argument specs.
 * @param passed The actual arguments passed to the function.
 * @throws {fbs.Error} If the arguments are invalid.
 */
export function validate(name: string, specs: ArgSpec[], passed: IArguments) {
  let minArgs = specs.length;
  let maxArgs = specs.length;
  for (let i = 0; i < specs.length; i++) {
    if (specs[i].optional) {
      minArgs = i;
      break;
    }
  }
  let validLength = minArgs <= passed.length && passed.length <= maxArgs;
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
  validator: (p1: any) => void;
  optional: boolean;

  constructor(validator: (p1: any) => void, opt_optional?: boolean) {
    let self = this;
    this.validator = function(p: any) {
      if (self.optional && !type.isJustDef(p)) {
        return;
      }
      validator(p);
    };
    this.optional = !!opt_optional;
  }
}

export function and_(v1: (p1: any) => void, v2: Function): (p1: any) => void {
  return function(p) {
    v1(p);
    v2(p);
  };
}

export function stringSpec(
  opt_validator?: (p1: any) => void | null,
  opt_optional?: boolean
): ArgSpec {
  function stringValidator(p: any) {
    if (!type.isString(p)) {
      throw 'Expected string.';
    }
  }
  let validator;
  if (opt_validator) {
    validator = and_(stringValidator, opt_validator);
  } else {
    validator = stringValidator;
  }
  return new ArgSpec(validator, opt_optional);
}

export function uploadDataSpec(): ArgSpec {
  function validator(p: any) {
    let valid =
      p instanceof Uint8Array ||
      p instanceof ArrayBuffer ||
      (type.isNativeBlobDefined() && p instanceof Blob);
    if (!valid) {
      throw 'Expected Blob or File.';
    }
  }
  return new ArgSpec(validator);
}

export function metadataSpec(opt_optional?: boolean): ArgSpec {
  return new ArgSpec(MetadataUtils.metadataValidator, opt_optional);
}

export function nonNegativeNumberSpec(): ArgSpec {
  function validator(p: any) {
    let valid = type.isNumber(p) && p >= 0;
    if (!valid) {
      throw 'Expected a number 0 or greater.';
    }
  }
  return new ArgSpec(validator);
}

export function looseObjectSpec(
  opt_validator?: ((p1: any) => void) | null,
  opt_optional?: boolean
): ArgSpec {
  function validator(p: any) {
    let isLooseObject = p === null || (type.isDef(p) && p instanceof Object);
    if (!isLooseObject) {
      throw 'Expected an Object.';
    }
    if (opt_validator !== undefined && opt_validator !== null) {
      opt_validator(p);
    }
  }
  return new ArgSpec(validator, opt_optional);
}

export function nullFunctionSpec(opt_optional?: boolean): ArgSpec {
  function validator(p: any) {
    let valid = p === null || type.isFunction(p);
    if (!valid) {
      throw 'Expected a Function.';
    }
  }
  return new ArgSpec(validator, opt_optional);
}
