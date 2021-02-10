{% extends "_internal/templates/reference.html" %}{% block title %}Title{% endblock title %}{% block body %}
## remote-config-types package

## Interfaces

|  Interface | Description |
|  --- | --- |
|  [RemoteConfig](./remote-config-types.remoteconfig.md#remoteconfig_interface) | The Firebase Remote Config service interface. |
|  [Settings](./remote-config-types.settings.md#settings_interface) | Defines configuration options for the Remote Config SDK. |
|  [Value](./remote-config-types.value.md#value_interface) | Wraps a value with metadata and type-safe getters. |

## Type Aliases

|  Type Alias | Description |
|  --- | --- |
|  [FetchStatus](./remote-config-types.md#fetchstatus_type) | Summarizes the outcome of the last attempt to fetch config from the Firebase Remote Config server.<ul> <li>"no-fetch-yet" indicates the [RemoteConfig](./remote-config-types.remoteconfig.md#remoteconfig_interface) instance has not yet attempted to fetch config, or that SDK initialization is incomplete.</li> <li>"success" indicates the last attempt succeeded.</li> <li>"failure" indicates the last attempt failed.</li> <li>"throttle" indicates the last attempt was rate-limited.</li> </ul> |
|  [LogLevel](./remote-config-types.md#loglevel_type) | Defines levels of Remote Config logging. |
|  [ValueSource](./remote-config-types.md#valuesource_type) | Indicates the source of a value.<ul> <li>"static" indicates the value was defined by a static constant.</li> <li>"default" indicates the value was defined by default config.</li> <li>"remote" indicates the value was defined by fetched config.</li> </ul> |

## FetchStatus type

Summarizes the outcome of the last attempt to fetch config from the Firebase Remote Config server.

<ul> <li>"no-fetch-yet" indicates the [RemoteConfig](./remote-config-types.remoteconfig.md#remoteconfig_interface) instance has not yet attempted to fetch config, or that SDK initialization is incomplete.</li> <li>"success" indicates the last attempt succeeded.</li> <li>"failure" indicates the last attempt failed.</li> <li>"throttle" indicates the last attempt was rate-limited.</li> </ul>

<b>Signature:</b>

```typescript
export type FetchStatus = 'no-fetch-yet' | 'success' | 'failure' | 'throttle';
```

## LogLevel type

Defines levels of Remote Config logging.

<b>Signature:</b>

```typescript
export type LogLevel = 'debug' | 'error' | 'silent';
```

## ValueSource type

Indicates the source of a value.

<ul> <li>"static" indicates the value was defined by a static constant.</li> <li>"default" indicates the value was defined by default config.</li> <li>"remote" indicates the value was defined by fetched config.</li> </ul>

<b>Signature:</b>

```typescript
export type ValueSource = 'static' | 'default' | 'remote';
```
{% endblock body %}
