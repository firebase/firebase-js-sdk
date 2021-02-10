{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## SessionCookieOptions interface

Interface representing the session cookie options needed for the  method.

<b>Signature:</b>

```typescript
export interface SessionCookieOptions 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [expiresIn](./firebase-admin_auth.sessioncookieoptions.md#sessioncookieoptionsexpiresin_property) | number | The session cookie custom expiration in milliseconds. The minimum allowed is 5 minutes and the maxium allowed is 2 weeks. |

## SessionCookieOptions.expiresIn property

The session cookie custom expiration in milliseconds. The minimum allowed is 5 minutes and the maxium allowed is 2 weeks.

<b>Signature:</b>

```typescript
expiresIn: number;
```
{% endblock body %}
