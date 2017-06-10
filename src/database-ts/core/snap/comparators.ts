import { nameCompare } from "../util/util";

export function NAME_ONLY_COMPARATOR(left, right) {
  return nameCompare(left.name, right.name);
};

export function NAME_COMPARATOR(left, right) {
  return nameCompare(left, right);
};
