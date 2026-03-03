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

import { expect } from 'chai';
import * as sinon from 'sinon';

import * as dataConnectIndex from '../../src/api/DataConnect';
import { DataConnect, ConnectorConfig } from '../../src/api/DataConnect';
import { Code, DataConnectError } from '../../src/core/error';
import { QueryFetchPolicy } from '../../src/core/query/queryOptions';
import {
  validateArgs,
  validateArgsWithOptions
} from '../../src/util/validateArgs';

interface IdVars {
  id: string;
}

describe('validateArgs()', () => {
  let getDataConnectStub: sinon.SinonStub;

  const connectorConfig: ConnectorConfig = {
    location: 'us-west2',
    service: 'my-service',
    connector: 'my-connector'
  };

  const providedDcInstance = {
    app: { options: { projectId: 'my-project' } },
    dataConnectOptions: connectorConfig,
    source: 'PROVIDED',
    enableEmulator: sinon.stub()
  } as unknown as DataConnect;

  const variables: IdVars = { id: 'stephenarosaj' };
  const options = { fetchPolicy: QueryFetchPolicy.SERVER_ONLY };

  const stubDcInstance = {
    app: { options: { projectId: 'my-project' } },
    dataConnectOptions: connectorConfig,
    source: 'STUB'
  } as unknown as DataConnect;

  beforeEach(() => {
    getDataConnectStub = sinon
      .stub(dataConnectIndex, 'getDataConnect')
      .returns(stubDcInstance);
  });

  afterEach(() => {
    getDataConnectStub.restore();
  });

  describe('validateArgs', () => {
    describe('should parse arguments properly', () => {
      it('when dc and vars are provided', () => {
        const { dc: dcInstance, vars: inputVars } = validateArgs(
          connectorConfig,
          providedDcInstance,
          variables
        );
        expect(dcInstance).to.deep.equal(providedDcInstance);
        expect(inputVars).to.deep.equal(variables);
      });

      it('when only vars are provided (infer dc)', () => {
        const { dc: dcInstance, vars: inputVars } = validateArgs(
          connectorConfig,
          variables
        );
        expect(getDataConnectStub.calledOnce).to.be.true;
        expect(dcInstance).to.deep.equal(stubDcInstance);
        expect(inputVars).to.deep.equal(variables);
      });

      it('when no args are provided (infer dc)', () => {
        const { dc: dcInstance, vars: inputVars } =
          validateArgs(connectorConfig);
        expect(getDataConnectStub.calledOnce).to.be.true;
        expect(dcInstance).to.deep.equal(stubDcInstance);
        expect(inputVars).to.be.undefined;
      });
    });

    describe('should throw when vars are required but missing', () => {
      it('and dc is provided', () => {
        expect(() => {
          validateArgs(
            connectorConfig,
            providedDcInstance,
            undefined,
            /** variablesRequired = */ true
          );
        })
          .to.throw(DataConnectError, 'Variables required')
          .with.property('code', Code.INVALID_ARGUMENT);
      });
      it('and dc is NOT provided', () => {
        expect(() => {
          validateArgs(
            connectorConfig,
            undefined,
            undefined,
            /** variablesRequired = */ true
          );
        })
          .to.throw(DataConnectError, 'Variables required')
          .with.property('code', Code.INVALID_ARGUMENT);
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
          expect(dcInstance).to.deep.equal(providedDcInstance);
          expect(inputVars).to.deep.equal(variables);
          expect(inputOpts).to.deep.equal(options);
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
          expect(getDataConnectStub.calledOnce).to.be.true;
          expect(dcInstance).to.deep.equal(stubDcInstance);
          expect(inputVars).to.deep.equal(variables);
          expect(inputOpts).to.deep.equal(options);
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
          expect(dcInstance).to.deep.equal(providedDcInstance);
          expect(inputVars).to.deep.equal(variables);
          expect(inputOpts).to.be.undefined;
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
          expect(getDataConnectStub.calledOnce).to.be.true;
          expect(dcInstance).to.deep.equal(stubDcInstance);
          expect(inputVars).to.deep.equal(variables);
          expect(inputOpts).to.be.undefined;
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
          expect(dcInstance).to.deep.equal(providedDcInstance);
          expect(inputVars).to.be.undefined;
          expect(inputOpts).to.deep.equal(options);
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
          expect(dcInstance).to.deep.equal(stubDcInstance);
          expect(inputVars).to.be.undefined;
          expect(inputOpts).to.deep.equal(options);
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
          expect(getDataConnectStub.calledOnce).to.be.true;
          expect(dcInstance).to.deep.equal(stubDcInstance);
          expect(inputVars).to.be.undefined;
          expect(inputOpts).to.be.undefined;
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
          expect(dcInstance).to.deep.equal(providedDcInstance);
          expect(inputVars).to.deep.equal(undefined);
          expect(inputOpts).to.deep.equal(options);
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
          expect(dcInstance).to.deep.equal(providedDcInstance);
          expect(inputVars).to.deep.equal(undefined);
          expect(inputOpts).to.be.undefined;
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
          expect(getDataConnectStub.calledOnce).to.be.true;
          expect(dcInstance).to.deep.equal(stubDcInstance);
          expect(inputVars).to.deep.equal(undefined);
          expect(inputOpts).to.deep.equal(options);
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
          expect(getDataConnectStub.calledOnce).to.be.true;
          expect(dcInstance).to.deep.equal(stubDcInstance);
          expect(inputVars).to.be.undefined;
          expect(inputOpts).to.be.undefined;
        });
      });
    });

    describe('should throw when vars are required but missing', () => {
      it('and only dc is provided', () => {
        expect(() => {
          validateArgsWithOptions(
            connectorConfig,
            providedDcInstance,
            undefined,
            undefined,
            /** hasVars = */ true,
            /** variablesRequired = */ true
          );
        })
          .to.throw(DataConnectError, 'Variables required')
          .with.property('code', Code.INVALID_ARGUMENT);
      });

      it('and only options is provided', () => {
        expect(() => {
          validateArgsWithOptions(
            connectorConfig,
            undefined,
            options,
            undefined,
            /** hasVars = */ true,
            /** variablesRequired = */ true
          );
        })
          .to.throw(DataConnectError, 'Variables required')
          .with.property('code', Code.INVALID_ARGUMENT);
      });

      it('and dc and options is provided', () => {
        expect(() => {
          validateArgsWithOptions(
            connectorConfig,
            providedDcInstance,
            undefined,
            options,
            /** hasVars = */ true,
            /** variablesRequired = */ true
          );
        })
          .to.throw(DataConnectError, 'Variables required')
          .with.property('code', Code.INVALID_ARGUMENT);
      });

      it('and nothing is provided', () => {
        expect(() => {
          validateArgsWithOptions(
            connectorConfig,
            undefined,
            undefined,
            undefined,
            /** hasVars = */ true,
            /** variablesRequired = */ true
          );
        })
          .to.throw(DataConnectError, 'Variables required')
          .with.property('code', Code.INVALID_ARGUMENT);
      });
    });
  });
});
