{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## UserMetadata class

User metadata class that provides metadata information like user account creation and last sign in time.

<b>Signature:</b>

```typescript
export declare class UserMetadata 
```

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [creationTime](./firebase-admin_auth.usermetadata.md#usermetadatacreationtime_property) |  | string |  |
|  [lastRefreshTime](./firebase-admin_auth.usermetadata.md#usermetadatalastrefreshtime_property) |  | string \| null | The time at which the user was last active (ID token refreshed), or null if the user was never active. Formatted as a UTC Date string (eg 'Sat, 03 Feb 2001 04:05:06 GMT') |
|  [lastSignInTime](./firebase-admin_auth.usermetadata.md#usermetadatalastsignintime_property) |  | string |  |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [toJSON()](./firebase-admin_auth.usermetadata.md#usermetadatatojson_method) |  |  The plain object representation of the user's metadata. |

## UserMetadata.creationTime property

<b>Signature:</b>

```typescript
readonly creationTime: string;
```

## UserMetadata.lastRefreshTime property

The time at which the user was last active (ID token refreshed), or null if the user was never active. Formatted as a UTC Date string (eg 'Sat, 03 Feb 2001 04:05:06 GMT')

<b>Signature:</b>

```typescript
readonly lastRefreshTime: string | null;
```

## UserMetadata.lastSignInTime property

<b>Signature:</b>

```typescript
readonly lastSignInTime: string;
```

## UserMetadata.toJSON() method

 The plain object representation of the user's metadata.

<b>Signature:</b>

```typescript
toJSON(): object;
```
<b>Returns:</b>

object

{% endblock body %}
