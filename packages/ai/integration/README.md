## AI Logic integration tests

These are AI Logic SDK integration tests against a live backend intended to be run locally during development and testing of the AI Logic SDK.

### Setup

You must have your own Firebase project with AI Logic enabled and App Check enabled with an App Check debug token created. Insert the project config into `FIREBASE_CONFIG` in `firebase-config.ts` and replace `INSERT_APP_CHECK_DEBUG_TOKEN_HERE` with your App Check debug token for that same project.

### Running tests

To run browser tests: `yarn test:integration`
To run node tests: `yarn test:integration:node`

Since this runs many tests on serveral models and may take a long time, you may want to run selected tests where the test description contains a specific string. An example:

```
yarn test:integration:node --reporter list --grep "gemini-3.1-flash-lite generateContent: google search grounding"
```

Note that the string here is a concatenation of the model, the "describe" block description, and the "it" block description. You may have to do a full test run first in order to find the exact string format you want to provide.