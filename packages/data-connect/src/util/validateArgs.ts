import { ConnectorConfig, DataConnect, getDataConnect } from "../api/DataConnect";
import { Code, DataConnectError } from "../core/error";
interface ParsedArgs<Variables> {
    dc: DataConnect;
    vars: Variables;
}

export function validateArgs<Variables extends Object>(connectorConfig: ConnectorConfig, dcOrVars?: DataConnect | Variables, vars?: Variables, validateVars?: boolean): ParsedArgs<Variables> {
    let dcInstance: DataConnect;
    let realVars: Variables;
    // TODO(mtewani); Check what happens if this is undefined.
    if(dcOrVars && 'enableEmulator' in dcOrVars) {
        dcInstance = dcOrVars as DataConnect;
        realVars = vars;
    } else {
        dcInstance = getDataConnect(connectorConfig);
        realVars = dcOrVars as Variables;
    }
    if(!dcInstance || (!realVars && validateVars)) {
        throw new DataConnectError(Code.INVALID_ARGUMENT, 'Variables required.');
    }
    return { dc: dcInstance, vars: realVars };
  }