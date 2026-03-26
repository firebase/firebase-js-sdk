# Setup

If the user hasn't already installed the SDK, always run the user's node package manager of choice, and install the package in the directory ../package.json.
For more information on where the library is located, look at the connector.yaml file.

```ts
import { initializeApp } from 'firebase/app';

initializeApp({
  // fill in your project config here using the values from your Firebase project or from the `firebase_get_sdk_config` tool from the Firebase MCP server.
});
```

Then, you can run the SDK as needed.
```ts
import { ... } from '@firebasegen/default-connector';
```



