{% extends "_internal/templates/reference.html" %}{% block title %}Title{% endblock title %}{% block body %}
## EventParams interface

Standard gtag.js event parameters. For more information, see [the gtag.js documentation on parameters](https://developers.google.com/gtagjs/reference/parameter)<!-- -->.

<b>Signature:</b>

```typescript
export interface EventParams 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [affiliation](./analytics-types.eventparams.md#eventparamsaffiliation_property) | string |  |
|  [checkout\_option](./analytics-types.eventparams.md#eventparamscheckout_option_property) | string |  |
|  [checkout\_step](./analytics-types.eventparams.md#eventparamscheckout_step_property) | number |  |
|  [content\_id](./analytics-types.eventparams.md#eventparamscontent_id_property) | string |  |
|  [content\_type](./analytics-types.eventparams.md#eventparamscontent_type_property) | string |  |
|  [coupon](./analytics-types.eventparams.md#eventparamscoupon_property) | string |  |
|  [currency](./analytics-types.eventparams.md#eventparamscurrency_property) | string |  |
|  [description](./analytics-types.eventparams.md#eventparamsdescription_property) | string |  |
|  [event\_category](./analytics-types.eventparams.md#eventparamsevent_category_property) | string |  |
|  [event\_label](./analytics-types.eventparams.md#eventparamsevent_label_property) | string |  |
|  [fatal](./analytics-types.eventparams.md#eventparamsfatal_property) | boolean |  |
|  [item\_list\_id](./analytics-types.eventparams.md#eventparamsitem_list_id_property) | string |  |
|  [item\_list\_name](./analytics-types.eventparams.md#eventparamsitem_list_name_property) | string |  |
|  [items](./analytics-types.eventparams.md#eventparamsitems_property) | [Item](./analytics-types.item.md#item_interface)<!-- -->\[\] |  |
|  [method](./analytics-types.eventparams.md#eventparamsmethod_property) | string |  |
|  [number](./analytics-types.eventparams.md#eventparamsnumber_property) | string |  |
|  [page\_location](./analytics-types.eventparams.md#eventparamspage_location_property) | string |  |
|  [page\_path](./analytics-types.eventparams.md#eventparamspage_path_property) | string |  |
|  [page\_title](./analytics-types.eventparams.md#eventparamspage_title_property) | string |  |
|  [payment\_type](./analytics-types.eventparams.md#eventparamspayment_type_property) | string |  |
|  [promotion\_id](./analytics-types.eventparams.md#eventparamspromotion_id_property) | string |  |
|  [promotion\_name](./analytics-types.eventparams.md#eventparamspromotion_name_property) | string |  |
|  [promotions](./analytics-types.eventparams.md#eventparamspromotions_property) | [Promotion](./analytics-types.promotion.md#promotion_interface)<!-- -->\[\] |  |
|  [screen\_name](./analytics-types.eventparams.md#eventparamsscreen_name_property) | string |  |
|  [search\_term](./analytics-types.eventparams.md#eventparamssearch_term_property) | string |  |
|  [shipping\_tier](./analytics-types.eventparams.md#eventparamsshipping_tier_property) | string |  |
|  [shipping](./analytics-types.eventparams.md#eventparamsshipping_property) | [Currency](./analytics-types.md#currency_type) |  |
|  [tax](./analytics-types.eventparams.md#eventparamstax_property) | [Currency](./analytics-types.md#currency_type) |  |
|  [transaction\_id](./analytics-types.eventparams.md#eventparamstransaction_id_property) | string |  |
|  [value](./analytics-types.eventparams.md#eventparamsvalue_property) | number |  |

## EventParams.affiliation property

<b>Signature:</b>

```typescript
affiliation?: string;
```

## EventParams.checkout\_option property

<b>Signature:</b>

```typescript
checkout_option?: string;
```

## EventParams.checkout\_step property

<b>Signature:</b>

```typescript
checkout_step?: number;
```

## EventParams.content\_id property

<b>Signature:</b>

```typescript
content_id?: string;
```

## EventParams.content\_type property

<b>Signature:</b>

```typescript
content_type?: string;
```

## EventParams.coupon property

<b>Signature:</b>

```typescript
coupon?: string;
```

## EventParams.currency property

<b>Signature:</b>

```typescript
currency?: string;
```

## EventParams.description property

<b>Signature:</b>

```typescript
description?: string;
```

## EventParams.event\_category property

<b>Signature:</b>

```typescript
event_category?: string;
```

## EventParams.event\_label property

<b>Signature:</b>

```typescript
event_label?: string;
```

## EventParams.fatal property

<b>Signature:</b>

```typescript
fatal?: boolean;
```

## EventParams.item\_list\_id property

<b>Signature:</b>

```typescript
item_list_id?: string;
```

## EventParams.item\_list\_name property

<b>Signature:</b>

```typescript
item_list_name?: string;
```

## EventParams.items property

<b>Signature:</b>

```typescript
items?: Item[];
```

## EventParams.method property

<b>Signature:</b>

```typescript
method?: string;
```

## EventParams.number property

<b>Signature:</b>

```typescript
number?: string;
```

## EventParams.page\_location property

<b>Signature:</b>

```typescript
page_location?: string;
```

## EventParams.page\_path property

<b>Signature:</b>

```typescript
page_path?: string;
```

## EventParams.page\_title property

<b>Signature:</b>

```typescript
page_title?: string;
```

## EventParams.payment\_type property

<b>Signature:</b>

```typescript
payment_type?: string;
```

## EventParams.promotion\_id property

<b>Signature:</b>

```typescript
promotion_id?: string;
```

## EventParams.promotion\_name property

<b>Signature:</b>

```typescript
promotion_name?: string;
```

## EventParams.promotions property

<b>Signature:</b>

```typescript
promotions?: Promotion[];
```

## EventParams.screen\_name property

<b>Signature:</b>

```typescript
screen_name?: string;
```

## EventParams.search\_term property

<b>Signature:</b>

```typescript
search_term?: string;
```

## EventParams.shipping\_tier property

<b>Signature:</b>

```typescript
shipping_tier?: string;
```

## EventParams.shipping property

<b>Signature:</b>

```typescript
shipping?: Currency;
```

## EventParams.tax property

<b>Signature:</b>

```typescript
tax?: Currency;
```

## EventParams.transaction\_id property

<b>Signature:</b>

```typescript
transaction_id?: string;
```

## EventParams.value property

<b>Signature:</b>

```typescript
value?: number;
```
{% endblock body %}
