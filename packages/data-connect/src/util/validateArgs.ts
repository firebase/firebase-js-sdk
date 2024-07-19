import { ConnectorConfig, DataConnect, getDataConnect } from "../api/DataConnect";
import { Code, DataConnectError } from "../core/error";
interface ParsedArgs<Variables> {
    dc: DataConnect;
    vars: Variables;
}

/**
 * The generated SDK will allow the user to pass in either the variable or the data connect instance with the variable, 
 * and this function validates the variables and returns back the DataConnect instance and variables based on the arguments passed in.
 * @param connectorConfig 
 * @param dcOrVars 
 * @param vars 
 * @param validateVars 
 * @returns {DataConnect} and {Variables} instance
 * @internal
 */
export function validateArgs<Variables extends Object>(connectorConfig: ConnectorConfig, dcOrVars?: DataConnect | Variables, vars?: Variables, validateVars?: boolean): ParsedArgs<Variables> {
    let dcInstance: DataConnect;
    let realVars: Variables;
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