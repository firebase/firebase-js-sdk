/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { FirebaseApp } from '@firebase/app-exp';

/**
 * Additional options that can be passed to Firebase Analytics method
 * calls such as `logEvent`, `setCurrentScreen`, etc.
 * @public
 */
export interface AnalyticsCallOptions {
  /**
   * If true, this config or event call applies globally to all
   * analytics properties on the page.
   */
  global: boolean;
}

/**
 * The Firebase Analytics service interface.
 *
 * @public
 */
export interface Analytics {
  /**
   * The FirebaseApp this Functions instance is associated with.
   */
  app: FirebaseApp;
}

/**
 * Specifies custom options for your Firebase Analytics instance.
 * You must set these before initializing `firebase.analytics()`.
 * @public
 */
export interface SettingsOptions {
  /** Sets custom name for `gtag` function. */
  gtagName?: string;
  /** Sets custom name for `dataLayer` array used by gtag. */
  dataLayerName?: string;
}

/**
 * Any custom params the user may pass to gtag.js.
 * @public
 */
export interface CustomParams {
  [key: string]: unknown;
}
/**
 * Type for standard gtag.js event names. `logEvent` also accepts any
 * custom string and interprets it as a custom event name.
 * @public
 */
export type EventNameString =
  | 'add_payment_info'
  | 'add_shipping_info'
  | 'add_to_cart'
  | 'add_to_wishlist'
  | 'begin_checkout'
  | 'checkout_progress'
  | 'exception'
  | 'generate_lead'
  | 'login'
  | 'page_view'
  | 'purchase'
  | 'refund'
  | 'remove_from_cart'
  | 'screen_view'
  | 'search'
  | 'select_content'
  | 'select_item'
  | 'select_promotion'
  | 'set_checkout_option'
  | 'share'
  | 'sign_up'
  | 'timing_complete'
  | 'view_cart'
  | 'view_item'
  | 'view_item_list'
  | 'view_promotion'
  | 'view_search_results';

/**
 * Currency field used by some Analytics events.
 * @public
 */
export type Currency = string | number;

/* eslint-disable camelcase */
/**
 * Item field used by some Analytics events.
 * @public
 */
export interface Item {
  item_id?: string;
  item_name?: string;
  item_brand?: string;
  item_category?: string;
  item_category2?: string;
  item_category3?: string;
  item_category4?: string;
  item_category5?: string;
  item_variant?: string;
  price?: Currency;
  quantity?: number;
  index?: number;
  coupon?: string;
  item_list_name?: string;
  item_list_id?: string;
  discount?: Currency;
  affiliation?: string;
  creative_name?: string;
  creative_slot?: string;
  promotion_id?: string;
  promotion_name?: string;
  location_id?: string;
  /** @deprecated Use item_brand instead. */
  brand?: string;
  /** @deprecated Use item_category instead. */
  category?: string;
  /** @deprecated Use item_id instead. */
  id?: string;
  /** @deprecated Use item_name instead. */
  name?: string;
}

/**
 * Field previously used by some Analytics events.
 * @deprecated Use Item instead.
 * @public
 */
export interface Promotion {
  creative_name?: string;
  creative_slot?: string;
  id?: string;
  name?: string;
}

/**
 * Standard gtag.js control parameters.
 * For more information, see
 * {@link https://developers.google.com/gtagjs/reference/parameter
 * | the gtag.js documentation on parameters}.
 * @public
 */
export interface ControlParams {
  groups?: string | string[];
  send_to?: string | string[];
  event_callback?: () => void;
  event_timeout?: number;
}

/**
 * Standard gtag.js event parameters.
 * For more information, see
 * {@link https://developers.google.com/gtagjs/reference/parameter
 * | the gtag.js documentation on parameters}.
 * @public
 */
export interface EventParams {
  checkout_option?: string;
  checkout_step?: number;
  content_id?: string;
  content_type?: string;
  coupon?: string;
  currency?: string;
  description?: string;
  fatal?: boolean;
  items?: Item[];
  method?: string;
  // eslint-disable-next-line id-blacklist
  number?: string;
  promotions?: Promotion[];
  screen_name?: string;
  search_term?: string;
  shipping?: Currency;
  tax?: Currency;
  transaction_id?: string;
  value?: number;
  event_label?: string;
  event_category?: string;
  shipping_tier?: string;
  item_list_id?: string;
  item_list_name?: string;
  promotion_id?: string;
  promotion_name?: string;
  payment_type?: string;
  affiliation?: string;
  page_title?: string;
  page_location?: string;
  page_path?: string;
}
/* eslint-enable camelcase */
