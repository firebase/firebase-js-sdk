# @firebase/testing

This is the testing component for the Firebase JS SDK.


## Protocol buffers

There are some protocol buffers (the `.proto` files in `src/protos/`) that
are included in this package but should not be modified. They're copied from
Google production and emulator APIs, and are immutable specifically to maintain
compatibility with those services.

When those services update their APIs, the new versions should be mirrored into
this package.
