{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## App interface

<b>Signature:</b>

```typescript
export interface App 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [name](./firebase-admin_auth.app.md#appname_property) | string | The (read-only) name for this app.<!-- -->The default app's name is <code>&quot;[DEFAULT]&quot;</code>. |
|  [options](./firebase-admin_auth.app.md#appoptions_property) | [AppOptions](./firebase-admin_.appoptions.md#appoptions_interface) | The (read-only) configuration options for this app. These are the original parameters given in . |

## App.name property

The (read-only) name for this app.

The default app's name is `"[DEFAULT]"`<!-- -->.

<b>Signature:</b>

```typescript
name: string;
```

## Example 1


```javascript
// The default app's name is "[DEFAULT]"
admin.initializeApp(defaultAppConfig);
console.log(admin.app().name);  // "[DEFAULT]"

```

## Example 2


```javascript
// A named app's name is what you provide to initializeApp()
var otherApp = admin.initializeApp(otherAppConfig, "other");
console.log(otherApp.name);  // "other"

```

## App.options property

The (read-only) configuration options for this app. These are the original parameters given in .

<b>Signature:</b>

```typescript
options: AppOptions;
```

## Example


```javascript
var app = admin.initializeApp(config);
console.log(app.options.credential === config.credential);  // true
console.log(app.options.databaseURL === config.databaseURL);  // true

```

{% endblock body %}
