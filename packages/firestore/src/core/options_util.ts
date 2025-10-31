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

import { ParseContext } from '../api/parse_context';
import { parseData } from '../lite-api/user_data_reader';
import { ObjectValue } from '../model/object_value';
import { FieldPath } from '../model/path';
import { ApiClientObjectMap, Value } from '../protos/firestore_proto_api';
import { isPlainObject } from '../util/input_validation';
import { mapToArray } from '../util/obj';
export type OptionsDefinitions = Record<string, OptionDefinition>;
export interface OptionDefinition {
  serverName: string;
  nestedOptions?: OptionsDefinitions;
}

export class OptionsUtil {
  constructor(private optionDefinitions: OptionsDefinitions) {}

  private _getKnownOptions(
    options: Record<string, unknown>,
    context: ParseContext
  ): ObjectValue {
    const knownOptions: ObjectValue = ObjectValue.empty();

    // SERIALIZE KNOWN OPTIONS
    for (const knownOptionKey in this.optionDefinitions) {
      if (this.optionDefinitions.hasOwnProperty(knownOptionKey)) {
        const optionDefinition: OptionDefinition =
          this.optionDefinitions[knownOptionKey];

        if (knownOptionKey in options) {
          const optionValue: unknown = options[knownOptionKey];
          let protoValue: Value | undefined = undefined;

          if (optionDefinition.nestedOptions && isPlainObject(optionValue)) {
            const nestedUtil = new OptionsUtil(optionDefinition.nestedOptions);
            protoValue = {
              mapValue: {
                fields: nestedUtil.getOptionsProto(context, optionValue)
              }
            };
          } else if (optionValue) {
            protoValue = parseData(optionValue, context) ?? undefined;
          }

          if (protoValue) {
            knownOptions.set(
              FieldPath.fromServerFormat(optionDefinition.serverName),
              protoValue
            );
          }
        }
      }
    }

    return knownOptions;
  }

  getOptionsProto(
    context: ParseContext,
    knownOptions: Record<string, unknown>,
    optionsOverride?: Record<string, unknown>
  ): ApiClientObjectMap<Value> | undefined {
    const result: ObjectValue = this._getKnownOptions(knownOptions, context);

    // APPLY OPTIONS OVERRIDES
    if (optionsOverride) {
      const optionsMap = new Map(
        mapToArray(optionsOverride, (value, key) => [
          FieldPath.fromServerFormat(key),
          value !== undefined ? parseData(value, context) : null
        ])
      );
      result.setAll(optionsMap);
    }

    // Return MapValue from `result` or empty map value
    return result.value.mapValue.fields ?? {};
  }
}
