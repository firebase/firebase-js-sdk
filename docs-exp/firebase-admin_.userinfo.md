{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## UserInfo class

User info class that provides provider user information for different Firebase providers like google.com, facebook.com, password, etc.

<b>Signature:</b>

```typescript
export declare class UserInfo 
```

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [displayName](./firebase-admin_.userinfo.md#userinfodisplayname_property) |  | string |  |
|  [email](./firebase-admin_.userinfo.md#userinfoemail_property) |  | string |  |
|  [phoneNumber](./firebase-admin_.userinfo.md#userinfophonenumber_property) |  | string |  |
|  [photoURL](./firebase-admin_.userinfo.md#userinfophotourl_property) |  | string |  |
|  [providerId](./firebase-admin_.userinfo.md#userinfoproviderid_property) |  | string |  |
|  [uid](./firebase-admin_.userinfo.md#userinfouid_property) |  | string |  |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [toJSON()](./firebase-admin_.userinfo.md#userinfotojson_method) |  |  The plain object representation of the current provider data. |

## UserInfo.displayName property

<b>Signature:</b>

```typescript
readonly displayName: string;
```

## UserInfo.email property

<b>Signature:</b>

```typescript
readonly email: string;
```

## UserInfo.phoneNumber property

<b>Signature:</b>

```typescript
readonly phoneNumber: string;
```

## UserInfo.photoURL property

<b>Signature:</b>

```typescript
readonly photoURL: string;
```

## UserInfo.providerId property

<b>Signature:</b>

```typescript
readonly providerId: string;
```

## UserInfo.uid property

<b>Signature:</b>

```typescript
readonly uid: string;
```

## UserInfo.toJSON() method

 The plain object representation of the current provider data.

<b>Signature:</b>

```typescript
toJSON(): object;
```
<b>Returns:</b>

object

{% endblock body %}
