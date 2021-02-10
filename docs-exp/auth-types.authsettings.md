{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## AuthSettings interface

Interface representing an Auth instance's settings.

<b>Signature:</b>

```typescript
export interface AuthSettings 
```

## Remarks

Currently used for enabling/disabling app verification for phone Auth testing.

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [appVerificationDisabledForTesting](./auth-types.authsettings.md#authsettingsappverificationdisabledfortesting_property) | boolean | When set, this property disables app verification for the purpose of testing phone authentication. For this property to take effect, it needs to be set before rendering a reCAPTCHA app verifier. When this is disabled, a mock reCAPTCHA is rendered instead. This is useful for manual testing during development or for automated integration tests.<!-- -->In order to use this feature, you will need to [whitelist your phone number](https://firebase.google.com/docs/auth/web/phone-auth#test-with-whitelisted-phone-numbers) via the Firebase Console.<!-- -->The default value is false (app verification is enabled). |

## AuthSettings.appVerificationDisabledForTesting property

When set, this property disables app verification for the purpose of testing phone authentication. For this property to take effect, it needs to be set before rendering a reCAPTCHA app verifier. When this is disabled, a mock reCAPTCHA is rendered instead. This is useful for manual testing during development or for automated integration tests.

In order to use this feature, you will need to [whitelist your phone number](https://firebase.google.com/docs/auth/web/phone-auth#test-with-whitelisted-phone-numbers) via the Firebase Console.

The default value is false (app verification is enabled).

<b>Signature:</b>

```typescript
appVerificationDisabledForTesting: boolean;
```
{% endblock body %}
