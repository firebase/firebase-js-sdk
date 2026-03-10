import { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } from 'firebase/data-connect';

export const connectorConfig = {
  connector: 'default',
  service: 'fdc-test',
  location: 'us-central1'
};

export const createMovieRef = (dcOrVars, varsOrOptions, options) => {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, varsOrOptions, options, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateMovie', inputVars);
}
createMovieRef.operationName = 'CreateMovie';

export function createMovie(dcOrVars, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgs(connectorConfig, dcOrVars, varsOrOptions, options, true);
  return executeMutation(createMovieRef(dcInstance, inputVars));
}

export const listMoviesRef = (dc, options) => {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, varsOrOptions, options);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListMovies');
}
listMoviesRef.operationName = 'ListMovies';

export function listMovies(dc, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgs(connectorConfig, dcOrVars, varsOrOptions, options);
  return executeQuery(listMoviesRef(dcInstance, inputVars), inputOpts && inputOpts.fetchPolicy);
}

