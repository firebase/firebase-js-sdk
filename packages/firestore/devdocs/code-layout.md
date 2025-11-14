# SDK Code Layout

This document explains the code layout in this repository. It is closely related to the [architecture](./architecture.md).

*   `src/`: Contains the source code for the main `@firebase/firestore` package.
    *   `api/`: Implements the **API Layer** for the main SDK.
    *   `lite-api/`: Contains the entry point of for the lite SDK.
    *   `core/`: Contains logic for the **Sync Engine** and **Event Manager**.
    *   `local/`: Contains the logic the **Local Store**, which includes the **Mutation Queue**, **Remote Table**, **Local View**, **Overlays**, and the **Persistence Layer**.
    *   `remote/`: Contains the logic for the **Remote Store**, handling all network communication.
    *   `model/`: Defines the internal data models used throughout the SDK, such as `Document`, `DocumentKey`, and `Mutation`. These models are used to represent Firestore data and operations in a structured way.
    *   `platform/`: Contains platform-specific code to abstract away the differences between the Node.js and browser environments. This includes things like networking, storage, and timers. This allows the core logic of the SDK to be platform-agnostic.
    *   `protos/`: Contains the Protocol Buffer (`.proto`) definitions that describe the gRPC API surface of the Firestore backend. These files are used to generate the client-side networking code.
*   `lite/`: Defines the entrypoint code for the `@firebase/firestore/lite` package.
*   `test/`: Contains all unit and integration tests for the SDK. The tests are organized by component and feature, and they are essential for ensuring the quality and correctness of the code.
*   `scripts/`: Contains a collection of build and maintenance scripts used for tasks such as bundling the code, running tests, and generating documentation.

TODO: Add more detailed information as appropriate on each folder

TODO: Mention critical entry points
    - `package.json` for packages and common commands. Go to [build.md](./build.md) for details
    - rollup configs for main and lite sdks. Go to [build.md](./build.md) for details
    - tests entry points. Go to [testing.md](./testing.md) for details