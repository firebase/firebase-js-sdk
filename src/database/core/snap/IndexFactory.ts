import { KeyIndex as KeyIndexClass } from "./indexes/KeyIndex";
import { PriorityIndex as PriorityIndexClass } from "./indexes/PriorityIndex";
import { ValueIndex as ValueIndexClass } from "./indexes/ValueIndex";

export const KeyIndex = new KeyIndexClass();
export const PriorityIndex = new PriorityIndexClass();
export const ValueIndex = new ValueIndexClass();
export const Fallback = {};