{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## ActionCodeSettings interface

This is the interface that defines the required continue/state URL with optional Android and iOS bundle identifiers.

<b>Signature:</b>

```typescript
export interface ActionCodeSettings 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [android](./firebase-admin_auth.actioncodesettings.md#actioncodesettingsandroid_property) | { packageName: string; installApp?: boolean; minimumVersion?: string; } | Defines the Android package name. This will try to open the link in an android app if it is installed. If <code>installApp</code> is passed, it specifies whether to install the Android app if the device supports it and the app is not already installed. If this field is provided without a <code>packageName</code>, an error is thrown explaining that the <code>packageName</code> must be provided in conjunction with this field. If <code>minimumVersion</code> is specified, and an older version of the app is installed, the user is taken to the Play Store to upgrade the app. |
|  [dynamicLinkDomain](./firebase-admin_auth.actioncodesettings.md#actioncodesettingsdynamiclinkdomain_property) | string | Defines the dynamic link domain to use for the current link if it is to be opened using Firebase Dynamic Links, as multiple dynamic link domains can be configured per project. This field provides the ability to explicitly choose configured per project. This fields provides the ability explicitly choose one. If none is provided, the oldest domain is used by default. |
|  [handleCodeInApp](./firebase-admin_auth.actioncodesettings.md#actioncodesettingshandlecodeinapp_property) | boolean | Whether to open the link via a mobile app or a browser. The default is false. When set to true, the action code link is sent as a Universal Link or Android App Link and is opened by the app if installed. In the false case, the code is sent to the web widget first and then redirects to the app if installed. |
|  [iOS](./firebase-admin_auth.actioncodesettings.md#actioncodesettingsios_property) | { bundleId: string; } | Defines the iOS bundle ID. This will try to open the link in an iOS app if it is installed. |
|  [url](./firebase-admin_auth.actioncodesettings.md#actioncodesettingsurl_property) | string | Defines the link continue/state URL, which has different meanings in different contexts: <ul> <li>When the link is handled in the web action widgets, this is the deep link in the <code>continueUrl</code> query parameter.</li> <li>When the link is handled in the app directly, this is the <code>continueUrl</code> query parameter in the deep link of the Dynamic Link.</li> </ul> |

## ActionCodeSettings.android property

Defines the Android package name. This will try to open the link in an android app if it is installed. If `installApp` is passed, it specifies whether to install the Android app if the device supports it and the app is not already installed. If this field is provided without a `packageName`<!-- -->, an error is thrown explaining that the `packageName` must be provided in conjunction with this field. If `minimumVersion` is specified, and an older version of the app is installed, the user is taken to the Play Store to upgrade the app.

<b>Signature:</b>

```typescript
android?: {
        packageName: string;
        installApp?: boolean;
        minimumVersion?: string;
    };
```

## ActionCodeSettings.dynamicLinkDomain property

Defines the dynamic link domain to use for the current link if it is to be opened using Firebase Dynamic Links, as multiple dynamic link domains can be configured per project. This field provides the ability to explicitly choose configured per project. This fields provides the ability explicitly choose one. If none is provided, the oldest domain is used by default.

<b>Signature:</b>

```typescript
dynamicLinkDomain?: string;
```

## ActionCodeSettings.handleCodeInApp property

Whether to open the link via a mobile app or a browser. The default is false. When set to true, the action code link is sent as a Universal Link or Android App Link and is opened by the app if installed. In the false case, the code is sent to the web widget first and then redirects to the app if installed.

<b>Signature:</b>

```typescript
handleCodeInApp?: boolean;
```

## ActionCodeSettings.iOS property

Defines the iOS bundle ID. This will try to open the link in an iOS app if it is installed.

<b>Signature:</b>

```typescript
iOS?: {
        bundleId: string;
    };
```

## ActionCodeSettings.url property

Defines the link continue/state URL, which has different meanings in different contexts: <ul> <li>When the link is handled in the web action widgets, this is the deep link in the `continueUrl` query parameter.</li> <li>When the link is handled in the app directly, this is the `continueUrl` query parameter in the deep link of the Dynamic Link.</li> </ul>

<b>Signature:</b>

```typescript
url: string;
```
{% endblock body %}
