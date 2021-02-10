{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## DataMessagePayload interface

Interface representing an FCM legacy API data message payload. Data messages let developers send up to 4KB of custom key-value pairs. The keys and values must both be strings. Keys can be any custom string, except for the following reserved strings:

\* `"from"` \* Anything starting with `"google."`<!-- -->.

See \[Build send requests\](/docs/cloud-messaging/send-message) for code samples and detailed documentation.

<b>Signature:</b>

```typescript
export interface DataMessagePayload 
```
{% endblock body %}
