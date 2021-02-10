{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## ThenableReference interface


<b>Signature:</b>

```typescript
export interface ThenableReference
  extends Reference,
    Pick<Promise<Reference>, 'then' | 'catch'> 
```
<b>Extends:</b> [Reference](./database.reference.md#reference_interface)<!-- -->, Pick&lt;Promise&lt;[Reference](./database.reference.md#reference_interface)<!-- -->&gt;, 'then' \| 'catch'&gt;

{% endblock body %}
