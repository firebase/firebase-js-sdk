/**
 * @license Copyright 2026 Google LLC
 */
import { UsedType, UnusedPrivateType } from './dep';
class PrivateItem implements UnusedPrivateType {}
export interface PublicAPI {
  get(): UsedType;
}
