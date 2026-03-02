import { expect } from 'chai';
import * as sinon from 'sinon';

import * as dataConnectIndex from '../../src/api/DataConnect';
import { DataConnect, ConnectorConfig } from '../../src/api/DataConnect';
import { Code, DataConnectError } from '../../src/core/error';
import { QueryFetchPolicy } from '../../src/core/query/queryOptions';
import { validateArgs } from '../../src/util/validateArgs';

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

  describe('legacy mode (hasVars undefined)', () => {
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

    describe('should not throw when vars are optional and missing', () => {
      it('and dc is provided', () => {
        const { dc: dcInstance, vars: inputVars } = validateArgs(
          connectorConfig,
          providedDcInstance,
          undefined,
          /** variablesRequired = */ false
        );
        expect(dcInstance).to.deep.equal(providedDcInstance);
        expect(inputVars).to.be.undefined;
      });
      it('and dc is NOT provided', () => {
        const { dc: dcInstance, vars: inputVars } = validateArgs(
          connectorConfig,
          undefined,
          undefined,
          /** variablesRequired = */ false
        );
        expect(getDataConnectStub.calledOnce).to.be.true;
        expect(dcInstance).to.deep.equal(stubDcInstance);
        expect(inputVars).to.be.undefined;
      });
    });
  });

  describe('modern mode (version > 3.2.0, hasVars defined)', () => {
    describe('should parse arguments properly', () => {
      it('when dc, vars, and options are provided', () => {
        const {
          dc: dcInstance,
          vars: inputVars,
          options: inputOpts
        } = validateArgs(
          connectorConfig,
          providedDcInstance,
          variables,
          /** variablesRequired = */ true,
          /** hasVars = */ true,
          options
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
        } = validateArgs(
          connectorConfig,
          variables,
          options,
          /** variablesRequired = */ true,
          /** hasVars = */ true
        );
        expect(getDataConnectStub.calledOnce).to.be.true;
        expect(dcInstance).to.deep.equal(stubDcInstance);
        expect(inputVars).to.deep.equal(variables);
        expect(inputOpts).to.deep.equal(options);
      });

      it('when dc and vars are provided (no options)', () => {
        const { dc: dcInstance, vars: inputVars } = validateArgs(
          connectorConfig,
          providedDcInstance,
          variables,
          /** variablesRequired = */ true,
          /** hasVars = */ true
        );
        expect(dcInstance).to.deep.equal(providedDcInstance);
        expect(inputVars).to.deep.equal(variables);
      });

      it('when only vars are provided (no options, infer dc)', () => {
        const { dc: dcInstance, vars: inputVars } = validateArgs(
          connectorConfig,
          variables,
          undefined,
          /** variablesRequired = */ true,
          /** hasVars = */ true
        );
        expect(getDataConnectStub.calledOnce).to.be.true;
        expect(dcInstance).to.deep.equal(stubDcInstance);
        expect(inputVars).to.deep.equal(variables);
      });

      it('when dc and options are provided (no vars)', () => {
        const {
          dc: dcInstance,
          vars: inputVars,
          options: inputOpts
        } = validateArgs(
          connectorConfig,
          providedDcInstance,
          options,
          /** variablesRequired = */ false,
          /** hasVars = */ false
        );
        expect(dcInstance).to.deep.equal(providedDcInstance);
        expect(inputVars).to.be.undefined;
        expect(inputOpts).to.deep.equal(options);
      });

      it('when only options are provided (no vars, infer dc)', () => {
        const {
          dc: dcInstance,
          vars: inputVars,
          options: inputOpts
        } = validateArgs(
          connectorConfig,
          options,
          undefined,
          /** variablesRequired = */ false,
          /** hasVars = */ false
        );
        expect(getDataConnectStub.calledOnce).to.be.true;
        expect(dcInstance).to.deep.equal(stubDcInstance);
        expect(inputVars).to.be.undefined;
        expect(inputOpts).to.deep.equal(options);
      });

      it('when no args are provided (infer dc)', () => {
        const { dc: dcInstance, vars: inputVars } = validateArgs(
          connectorConfig,
          undefined,
          undefined,
          /** variablesRequired = */ false,
          /** hasVars = */ true
        );
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
            /** variablesRequired = */ true,
            /** hasVars =  */ true
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
            /** variablesRequired = */ true,
            /** hasVars =  */ true
          );
        })
          .to.throw(DataConnectError, 'Variables required')
          .with.property('code', Code.INVALID_ARGUMENT);
      });
    });

    describe('should not throw when vars are optional and missing', () => {
      it('and dc is provided', () => {
        const { dc: dcInstance, vars: inputVars } = validateArgs(
          connectorConfig,
          providedDcInstance,
          undefined,
          /** variablesRequired = */ false,
          /** hasVars =  */ true
        );
        expect(dcInstance).to.deep.equal(providedDcInstance);
        expect(inputVars).to.be.undefined;
      });
      it('and dc is NOT provided', () => {
        const { dc: dcInstance, vars: inputVars } = validateArgs(
          connectorConfig,
          undefined,
          undefined,
          /** variablesRequired = */ false,
          /** hasVars =  */ true
        );
        expect(getDataConnectStub.calledOnce).to.be.true;
        expect(dcInstance).to.deep.equal(stubDcInstance);
        expect(inputVars).to.be.undefined;
      });
    });
  });
});
