/**
 * @license
 * Copyright 2024 Google LLC
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

import { ExecuteQueryOptions } from '../api';
import {
  ConnectorConfig,
  DataConnect,
  getDataConnect
} from '../api/DataConnect';
import { Code, DataConnectError } from '../core/error';

interface ParsedArgs<Variables> {
  dc: DataConnect;
  vars: Variables;
  options?: ExecuteQueryOptions;
}

/**
 * The generated SDK will allow the user to pass in either the variables or the data connect instance
 * with the variables, and/or options. This function validates the variables and returns back the
 * DataConnect instance and variables, and potentially options, based on the arguments passed in.
 *
 * Generated SDKs generated from versions 3.2.0 and lower of the Data Connect emulator binary are not
 * concerned with any options, and they will never provide the {hasVars} parameter.
 *
 * @param connectorConfig
 * @param dcOrVarsOrOptions
 * @param varsOrOptions
 * @param variablesRequired
 * @param hasVars - only provided by generated SDKs using Data Connect emulator binary version higher than 3.2.0
 * @param options - only provided by generated SDKs using Data Connect emulator binary version higher than 3.2.0
 * @returns {DataConnect} and {Variables} instance, and optionally {ExecuteQueryOptions}
 * @internal
 */
export function validateArgs<Variables extends object>(
  connectorConfig: ConnectorConfig,
  dcOrVarsOrOptions?: DataConnect | Variables | ExecuteQueryOptions,
  varsOrOptions?: Variables | ExecuteQueryOptions,
  variablesRequired?: boolean,
  hasVars?: boolean,
  options?: ExecuteQueryOptions
): ParsedArgs<Variables> {
  let dcInstance: DataConnect;
  let realVars: Variables;
  let realOptions: ExecuteQueryOptions;

  const legacyNoOptions = typeof hasVars === 'undefined';

  const dcFirstArg = dcOrVarsOrOptions && 'enableEmulator' in dcOrVarsOrOptions;

  if (legacyNoOptions) {
    // legacy gen SDKs are not concerned with options - just dc and variables
    if (dcFirstArg) {
      dcInstance = dcOrVarsOrOptions as DataConnect;
      realVars = varsOrOptions as Variables;
    } else {
      dcInstance = getDataConnect(connectorConfig);
      realVars = dcOrVarsOrOptions as Variables;
    }
    if (!dcInstance || (!realVars && variablesRequired)) {
      throw new DataConnectError(Code.INVALID_ARGUMENT, 'Variables required.');
    }
    return { dc: dcInstance, vars: realVars };
  } else {
    if (dcFirstArg) {
      dcInstance = dcOrVarsOrOptions as DataConnect;
      if (hasVars) {
        realVars = varsOrOptions as Variables;
        realOptions = options as ExecuteQueryOptions;
      } else {
        realVars = undefined as unknown as Variables;
        realOptions = varsOrOptions as ExecuteQueryOptions;
      }
    } else {
      dcInstance = getDataConnect(connectorConfig);
      if (hasVars) {
        realVars = dcOrVarsOrOptions as Variables;
        realOptions = varsOrOptions as ExecuteQueryOptions;
      } else {
        realVars = undefined as unknown as Variables;
        realOptions = dcOrVarsOrOptions as ExecuteQueryOptions;
      }
    }
    if (!dcInstance || (!realVars && variablesRequired)) {
      throw new DataConnectError(Code.INVALID_ARGUMENT, 'Variables required.');
    }
    return { dc: dcInstance, vars: realVars, options: realOptions };
  }
}
