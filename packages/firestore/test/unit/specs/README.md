# Firestore Spec Tests

The Firestore Spec Tests are a suite of unit tests that fake out external
sources of events so that they can be completely controlled from the tests
themselves and verify the correct handling of these events.

There are three sources of external events in the SDK: user writes, input from
the persistence layer, and input from the watch stream. The spec tests fake all
of these. Since these external events are asynchronous in nature, in the real
world there is some non-determinism in the ordering of events. The spec tests
allow these orderings to be specified explicitly, enabling orderings that are
difficult or impossible to force when connected to a real backend. In addition,
when running under Node, the IndexedDb persistence layer is faked.

The Firestore Spec Tests are portable and must be kept in sync between the Web
SDK (this SDK), Android SDK, and iOS SDK. The Web SDK contains the authoritative
test definitions and they must be manually "exported" to the Android SDK and iOS
SDK when they change.

## Running the Tests

The spec tests are part of the unit test suite of each SDK. Therefore, to run
the spec tests simply run the entire unit test suite and the spec tests will be
executed as a part of it.

## Test Tags

Each spec test can specify zero or many "tags" that influence the test's
execution. Some of the commonly-used tags are documented here; see
[describe_spec.ts](describe_spec.ts) for the full set of supported tags.

- `exclusive` - Only run this spec test and skip all others. It can be useful
  to apply this tag to a test while it is under active development or debugging.
  Tests should never be checked into source control with this tag.

- `no-android` and `no-ios` - Do not run this spec test on Android and/or iOS,
  respectively. It may be useful to specify these tags if the functionality has
  not been or never will be ported to these platforms.

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
