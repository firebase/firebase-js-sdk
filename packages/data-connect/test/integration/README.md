# Integration Tests

## Creating a new test

1. Create a new folder
2. Create your `test.ts` file
3. Create your schema in `test/integration/schema/<test>.gql`
4. Create your queries in mutations in `test/integration/<test>/*.gql`
5. Add your path to `test/integration/dataconnect.yaml` in `connectorDirs`