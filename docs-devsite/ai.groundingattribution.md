Project: /docs/reference/js/_project.yaml
Book: /docs/reference/_book.yaml
page_type: reference

{% comment %}
DO NOT EDIT THIS FILE!
This is generated by the JS SDK team, and any local changes will be
overwritten. Changes should be made in the source code at
https://github.com/firebase/firebase-js-sdk
{% endcomment %}

# GroundingAttribution interface
> Warning: This API is now obsolete.
> 
> 

<b>Signature:</b>

```typescript
export interface GroundingAttribution 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [confidenceScore](./ai.groundingattribution.md#groundingattributionconfidencescore) | number |  |
|  [retrievedContext](./ai.groundingattribution.md#groundingattributionretrievedcontext) | [RetrievedContextAttribution](./ai.retrievedcontextattribution.md#retrievedcontextattribution_interface) |  |
|  [segment](./ai.groundingattribution.md#groundingattributionsegment) | [Segment](./ai.segment.md#segment_interface) |  |
|  [web](./ai.groundingattribution.md#groundingattributionweb) | [WebAttribution](./ai.webattribution.md#webattribution_interface) |  |

## GroundingAttribution.confidenceScore

<b>Signature:</b>

```typescript
confidenceScore?: number;
```

## GroundingAttribution.retrievedContext

<b>Signature:</b>

```typescript
retrievedContext?: RetrievedContextAttribution;
```

## GroundingAttribution.segment

<b>Signature:</b>

```typescript
segment: Segment;
```

## GroundingAttribution.web

<b>Signature:</b>

```typescript
web?: WebAttribution;
```
