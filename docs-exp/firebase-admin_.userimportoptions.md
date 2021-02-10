{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## UserImportOptions interface

Interface representing the user import options needed for  method. This is used to provide the password hashing algorithm information.

<b>Signature:</b>

```typescript
export interface UserImportOptions 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [hash](./firebase-admin_.userimportoptions.md#userimportoptionshash_property) | { algorithm: [HashAlgorithmType](./firebase-admin_.md#hashalgorithmtype_type)<!-- -->; key?: Buffer; saltSeparator?: Buffer; rounds?: number; memoryCost?: number; parallelization?: number; blockSize?: number; derivedKeyLength?: number; } | The password hashing information. |

## UserImportOptions.hash property

The password hashing information.

<b>Signature:</b>

```typescript
hash: {
        algorithm: HashAlgorithmType;
        key?: Buffer;
        saltSeparator?: Buffer;
        rounds?: number;
        memoryCost?: number;
        parallelization?: number;
        blockSize?: number;
        derivedKeyLength?: number;
    };
```
{% endblock body %}
