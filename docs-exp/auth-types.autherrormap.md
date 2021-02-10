{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## AuthErrorMap interface

A mapping of error codes to error messages.


While error messages are useful for debugging (providing verbose textual context around what went wrong), these strings take up a lot of space in the compiled code. When deploying code in production, using  will save you roughly 10k compressed/gzipped over . You can select the error map during initialization:

```javascript
initializeAuth(app, {errorMap: debugErrorMap})

```
When initializing Auth,  is default.

<b>Signature:</b>

```typescript
export interface AuthErrorMap 
```
{% endblock body %}
