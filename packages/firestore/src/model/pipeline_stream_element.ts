import { SnapshotVersion } from '../core/snapshot_version';

import { DocumentKey } from './document_key';
import { ObjectValue } from './object_value';

export interface PipelineStreamElement {
  transaction?: string;
  key?: DocumentKey;
  executionTime?: SnapshotVersion;
  createTime?: SnapshotVersion;
  updateTime?: SnapshotVersion;
  fields?: ObjectValue;
}
