# Firestore Spec Tests

The Firestore Spec Tests are a suite of unit tests that fake out the external
sources of events so that they can be completely controlled from the tests
themselves and verify the correct handling of these events.

There are three sources of external events in the SDK: user writes, input from
the persistence layer, and input from the watch stream. The spec tests fake all
of these. Since these external events are asynchronous in nature, in the real
world there is some non-determinism in the ordering of events. The spec tests
allow these orderings to be specified explicitly, enabling orderings that are
difficult or impossible to force when connected to a real backend.

The Firestore Spec Tests are portable and must be kept in sync between the Web
SDK (this SDK), Android SDK, and iOS SDK. The Web SDK contains the authoritative
test definitions and they must be manually "exported" to the Android SDK and iOS
SDK when they change.

## Running the Tests

The spec tests are part of the unit test suite of each SDK. Therefore, to run
the spec tests simply run the entire unit test suite and the spec tests will be
executed as a part of it.

For example, in the Web SDK (this SDK), the best way to run the spec tests is
via the Intellij IDEA IDE. After following the instructions to set up IntelliJ
in [CONTRIBUTING.md](../../../CONTRIBUTING.md), run the "Unit Tests" Run
Configuration, which will include the spec tests.

## Exporting the Tests

To export the tests use the [generate_spec_json.sh](../generate_spec_json.sh)
script, specifying a single argument whose value is the destination directory
into which to place the generated files.

#### Exporting the Tests to the Android SDK

To export the spec tests to the Android SDK, run the following command:

```
cd ~/firebase-js-sdk/packages/firestore/test/unit &&
./generate_spec_json.sh ~/firebase-android-sdk/firebase-firestore/src/test/resources/json
```

This command assumes that this Git repository is cloned into `~/firebase-js-sdk`
and the Android SDK is cloned into `~/firebase-android-sdk`.

#### Exporting the Tests to the iOS SDK

To export the spec tests to the iOS SDK, run the following command:

```
cd ~/firebase-js-sdk/packages/firestore/test/unit &&
./generate_spec_json.sh ~/firebase-ios-sdk/Firestore/Example/Tests/SpecTests/json
```

This command assumes that this Git repository is cloned into `~/firebase-js-sdk`
and the iOS SDK is cloned into `~/firebase-ios-sdk`.
