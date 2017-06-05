SUPPORTED ENVIRONMENTS
======================

The Firebase Web SDK is _officially supported_ in the following environments:

|                   | Auth                                                           | Database | Messaging | Storage              |
| ----------------- | :------------------------------------------------------------: | :------: | :-------: | :------------------: |
| IE9               |  ✓                                                             |    ✓     |     ✗     |    ✗                 |
| IE10-11           |  ✓                                                             |    ✓     |     ✗     |    ✓                 |
| Edge              |  ✓                                                             |    ✓     |     ✗     |    ✓                 |
| Firefox           |  ✓                                                             |    ✓     |     ✓     |    ✓                 |
| Chrome            |  ✓                                                             |    ✓     |     ✓     |    ✓                 |
| Chrome on iOS     |  ✓                                                             |    ✓     |     ✗     |    ✓                 |
| Safari            |  ✓                                                             |    ✓     |     ✗     |    ✓                 |
| React Native      |  ✓ (minus phone auth and popup/redirect OAuth operations)      |    ✓     |     ✗     |    ✓ (minus uploads) |
| Node.js           |  ✓ (minus phone auth and popup/redirect OAuth operations)      |    ✓     |     ✗     |    ✗                 |
| Chrome Extensions |  ✓ (minus phone auth, only supports popup OAuth operations)    |    ✓     |     ✗     |    ✓                 |
| Cordova           |  ✓ (minus phone auth, only supports redirect OAuth operations) |    ✓     |     ✗     |    ✓                 |

Features are not guaranteed to work outside officially supported environments.
