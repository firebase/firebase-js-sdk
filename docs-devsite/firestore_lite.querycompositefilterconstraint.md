Project: /docs/reference/js/_project.yaml
Book: /docs/reference/_book.yaml
page_type: reference

{% comment %}
DO NOT EDIT THIS FILE!
This is generated by the JS SDK team, and any local changes will be
overwritten. Changes should be made in the source code at
https://github.com/firebase/firebase-js-sdk
{% endcomment %}

# QueryCompositeFilterConstraint class
A `QueryCompositeFilterConstraint` is used to narrow the set of documents returned by a Firestore query by performing the logical OR or AND of multiple [QueryFieldFilterConstraint](./firestore_.queryfieldfilterconstraint.md#queryfieldfilterconstraint_class)<!-- -->s or [QueryCompositeFilterConstraint](./firestore_.querycompositefilterconstraint.md#querycompositefilterconstraint_class)<!-- -->s. `QueryCompositeFilterConstraint`<!-- -->s are created by invoking [or()](./firestore_.md#or) or [and()](./firestore_.md#and) and can then be passed to [query()](./firestore_.md#query) to create a new query instance that also contains the `QueryCompositeFilterConstraint`<!-- -->.

<b>Signature:</b>

```typescript
export declare class QueryCompositeFilterConstraint 
```

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [type](./firestore_lite.querycompositefilterconstraint.md#querycompositefilterconstrainttype) |  | 'or' \| 'and' | The type of this query constraint |

## QueryCompositeFilterConstraint.type

The type of this query constraint

<b>Signature:</b>

```typescript
readonly type: 'or' | 'and';
```