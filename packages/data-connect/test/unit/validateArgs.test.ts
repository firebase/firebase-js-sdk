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

import type { MockInstance } from 'vitest';

import * as dataConnectIndex from '../../src/api/DataConnect';
import { DataConnect, ConnectorConfig } from '../../src/api/DataConnect';
import { Code, DataConnectError } from '../../src/core/error';
import { QueryFetchPolicy } from '../../src/core/query/queryOptions';
import {
  validateArgs,
  validateArgsWithOptions
} from '../../src/util/validateArgs';

// `vi.spyOn` cannot replace an ESM named export in browser mode, so mock the
// module (keeping its real implementation) to make `getDataConnect` spyable.
vi.mock('../../src/api/DataConnect', { spy: true });

interface IdVars {
  id: string;
}

/**
 * Asserts that `fn` throws a `DataConnectError` whose message contains
 * 'Variables required' and whose `code` is `INVALID_ARGUMENT`. Replaces the
 * chai `expect(fn).to.throw(DataConnectError, 'Variables required').with
 * .property('code', ...)` chain.
 */
function expectVariablesRequiredError(fn: () => unknown): void {
  let error: unknown;
  try {
    fn();
  } catch (e) {
    error = e;
  }
  expect(error).toBeInstanceOf(DataConnectError);
  expect((error as DataConnectError).message).toContain('Variables required');
  expect((error as DataConnectError).code).toBe(Code.INVALID_ARGUMENT);
}

describe('validateArgs()', () => {
  let getDataConnectStub: MockInstance;

  const connectorConfig: ConnectorConfig = {
    location: 'us-west2',
    service: 'my-service',
    connector: 'my-connector'
  };

  const providedDcInstance = {
    app: { options: { projectId: 'my-project' } },
    dataConnectOptions: connectorConfig,
    source: 'PROVIDED',
    enableEmulator: vi.fn()
  } as unknown as DataConnect;

  const variables: IdVars = { id: 'stephenarosaj' };
  const options = { fetchPolicy: QueryFetchPolicy.SERVER_ONLY };

  const stubDcInstance = {
    app: { options: { projectId: 'my-project' } },
    dataConnectOptions: connectorConfig,
    source: 'STUB'
  } as unknown as DataConnect;

  beforeEach(() => {
    getDataConnectStub = vi.mocked(dataConnectIndex.getDataConnect);
    getDataConnectStub.mockReset();
    getDataConnectStub.mockReturnValue(stubDcInstance);
  });

  afterEach(() => {
    getDataConnectStub.mockReset();
  });

  describe('validateArgs', () => {
    describe('should parse arguments properly', () => {
      it('when dc and vars are provided', () => {
        const { dc: dcInstance, vars: inputVars } = validateArgs(
          connectorConfig,
          providedDcInstance,
          variables
        );
        expect(dcInstance).toEqual(providedDcInstance);
        expect(inputVars).toEqual(variables);
      });

      it('when only vars are provided (infer dc)', () => {
        const { dc: dcInstance, vars: inputVars } = validateArgs(
          connectorConfig,
          variables
        );
        expect(getDataConnectStub).toHaveBeenCalledOnce();
        expect(dcInstance).toEqual(stubDcInstance);
        expect(inputVars).toEqual(variables);
      });

      it('when no args are provided (infer dc)', () => {
        const { dc: dcInstance, vars: inputVars } =
          validateArgs(connectorConfig);
        expect(getDataConnectStub).toHaveBeenCalledOnce();
        expect(dcInstance).toEqual(stubDcInstance);
        expect(inputVars).toBeUndefined();
      });
    });

    describe('should throw when vars are required but missing', () => {
      it('and dc is provided', () => {
        expectVariablesRequiredError(() => {
          validateArgs(
            connectorConfig,
            providedDcInstance,
            undefined,
            /** variablesRequired = */ true
          );
        });
      });
      it('and dc is NOT provided', () => {
        expectVariablesRequiredError(() => {
          validateArgs(
            connectorConfig,
            undefined,
            undefined,
            /** variablesRequired = */ true
          );
        });
      });
    });
  });

  describe('validateArgsWithOptions', () => {
    describe('should parse arguments properly', () => {
      describe('with hasVars = true', () => {
        it('when dc, vars, and options are provided', () => {
          const {
            dc: dcInstance,
            vars: inputVars,
            options: inputOpts
          } = validateArgsWithOptions(
            connectorConfig,
            providedDcInstance,
            variables,
            options,
            /** hasVars = */ true,
            /** variablesRequired = */ false
          );
          expect(dcInstance).toEqual(providedDcInstance);
          expect(inputVars).toEqual(variables);
          expect(inputOpts).toEqual(options);
        });

        it('when vars and options are provided (infer dc)', () => {
          const {
            dc: dcInstance,
            vars: inputVars,
            options: inputOpts
          } = validateArgsWithOptions(
            connectorConfig,
            variables,
            options,
            undefined,
            /** hasVars = */ true,
            /** variablesRequired = */ false
          );
          expect(getDataConnectStub).toHaveBeenCalledOnce();
          expect(dcInstance).toEqual(stubDcInstance);
          expect(inputVars).toEqual(variables);
          expect(inputOpts).toEqual(options);
        });

        it('when dc and vars are provided (no options)', () => {
          const {
            dc: dcInstance,
            vars: inputVars,
            options: inputOpts
          } = validateArgsWithOptions(
            connectorConfig,
            providedDcInstance,
            variables,
            undefined,
            /** hasVars = */ true,
            /** variablesRequired = */ false
          );
          expect(dcInstance).toEqual(providedDcInstance);
          expect(inputVars).toEqual(variables);
          expect(inputOpts).toBeUndefined();
        });

        it('when only vars are provided (no options, infer dc)', () => {
          const {
            dc: dcInstance,
            vars: inputVars,
            options: inputOpts
          } = validateArgsWithOptions(
            connectorConfig,
            variables,
            undefined,
            undefined,
            /** hasVars = */ true,
            /** variablesRequired = */ false
          );
          expect(getDataConnectStub).toHaveBeenCalledOnce();
          expect(dcInstance).toEqual(stubDcInstance);
          expect(inputVars).toEqual(variables);
          expect(inputOpts).toBeUndefined();
        });

        it('when dc and options are provided (optional vars are undefined)', () => {
          const {
            dc: dcInstance,
            vars: inputVars,
            options: inputOpts
          } = validateArgsWithOptions(
            connectorConfig,
            providedDcInstance,
            undefined,
            options,
            /** hasVars = */ true,
            /** variablesRequired = */ false
          );
          expect(dcInstance).toEqual(providedDcInstance);
          expect(inputVars).toBeUndefined();
          expect(inputOpts).toEqual(options);
        });

        it('when only options is provided (infer dc, optional vars are undefined)', () => {
          const {
            dc: dcInstance,
            vars: inputVars,
            options: inputOpts
          } = validateArgsWithOptions(
            connectorConfig,
            undefined,
            options,
            undefined,
            /** hasVars = */ true,
            /** variablesRequired = */ false
          );
          expect(dcInstance).toEqual(stubDcInstance);
          expect(inputVars).toBeUndefined();
          expect(inputOpts).toEqual(options);
        });

        it('when no args are provided (infer dc, optional vars are undefined)', () => {
          const {
            dc: dcInstance,
            vars: inputVars,
            options: inputOpts
          } = validateArgsWithOptions(
            connectorConfig,
            undefined,
            undefined,
            undefined,
            /** hasVars = */ true,
            /** variablesRequired = */ false
          );
          expect(getDataConnectStub).toHaveBeenCalledOnce();
          expect(dcInstance).toEqual(stubDcInstance);
          expect(inputVars).toBeUndefined();
          expect(inputOpts).toBeUndefined();
        });
      });

      describe('with hasVars = false', () => {
        it('when dc and options are provided', () => {
          const {
            dc: dcInstance,
            vars: inputVars,
            options: inputOpts
          } = validateArgsWithOptions(
            connectorConfig,
            providedDcInstance,
            options,
            undefined,
            /** hasVars = */ false,
            /** variablesRequired = */ false
          );
          expect(dcInstance).toEqual(providedDcInstance);
          expect(inputVars).toEqual(undefined);
          expect(inputOpts).toEqual(options);
        });

        it('when only dc is provided (no options)', () => {
          const {
            dc: dcInstance,
            vars: inputVars,
            options: inputOpts
          } = validateArgsWithOptions(
            connectorConfig,
            providedDcInstance,
            undefined,
            undefined,
            /** hasVars = */ false,
            /** variablesRequired = */ false
          );
          expect(dcInstance).toEqual(providedDcInstance);
          expect(inputVars).toEqual(undefined);
          expect(inputOpts).toBeUndefined();
        });

        it('when only options are provided (infer dc)', () => {
          const {
            dc: dcInstance,
            vars: inputVars,
            options: inputOpts
          } = validateArgsWithOptions(
            connectorConfig,
            options,
            undefined,
            undefined,
            /** hasVars = */ false,
            /** variablesRequired = */ false
          );
          expect(getDataConnectStub).toHaveBeenCalledOnce();
          expect(dcInstance).toEqual(stubDcInstance);
          expect(inputVars).toEqual(undefined);
          expect(inputOpts).toEqual(options);
        });

        it('when no args are provided (infer dc)', () => {
          const {
            dc: dcInstance,
            vars: inputVars,
            options: inputOpts
          } = validateArgsWithOptions(
            connectorConfig,
            undefined,
            undefined,
            undefined,
            /** hasVars = */ false,
            /** variablesRequired = */ false
          );
          expect(getDataConnectStub).toHaveBeenCalledOnce();
          expect(dcInstance).toEqual(stubDcInstance);
          expect(inputVars).toBeUndefined();
          expect(inputOpts).toBeUndefined();
        });
      });
    });

    describe('should throw when vars are required but missing', () => {
      it('and only dc is provided', () => {
        expectVariablesRequiredError(() => {
          validateArgsWithOptions(
            connectorConfig,
            providedDcInstance,
            undefined,
            undefined,
            /** hasVars = */ true,
            /** variablesRequired = */ true
          );
        });
      });

      it('and only options is provided', () => {
        expectVariablesRequiredError(() => {
          validateArgsWithOptions(
            connectorConfig,
            undefined,
            options,
            undefined,
            /** hasVars = */ true,
            /** variablesRequired = */ true
          );
        });
      });

      it('and dc and options is provided', () => {
        expectVariablesRequiredError(() => {
          validateArgsWithOptions(
            connectorConfig,
            providedDcInstance,
            undefined,
            options,
            /** hasVars = */ true,
            /** variablesRequired = */ true
          );
        });
      });

      it('and nothing is provided', () => {
        expectVariablesRequiredError(() => {
          validateArgsWithOptions(
            connectorConfig,
            undefined,
            undefined,
            undefined,
            /** hasVars = */ true,
            /** variablesRequired = */ true
          );
        });
      });
    });
  });
});
