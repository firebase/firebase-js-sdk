const { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } = require('firebase/data-connect');

const connectorConfig = {
  connector: 'default',
  service: 'fdc-test',
  location: 'us-central1'
};
exports.connectorConfig = connectorConfig;

const createMovieRef = (dcOrVars, varsOrOptions, options) => {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, varsOrOptions, options, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateMovie', inputVars);
}
createMovieRef.operationName = 'CreateMovie';
exports.createMovieRef = createMovieRef;

exports.createMovie = function createMovie(dcOrVars, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgs(connectorConfig, dcOrVars, varsOrOptions, options, true);
  return executeMutation(createMovieRef(dcInstance, inputVars));
}
;

const listMoviesRef = (dc, options) => {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, varsOrOptions, options);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListMovies');
}
listMoviesRef.operationName = 'ListMovies';
exports.listMoviesRef = listMoviesRef;

exports.listMovies = function listMovies(dc, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgs(connectorConfig, dcOrVars, varsOrOptions, options);
  return executeQuery(listMoviesRef(dcInstance, inputVars), inputOpts && inputOpts.fetchPolicy);
}
;
