// TODO: Consolidate Types
type FDCScalarValue = string | number | boolean | undefined | null | object | FDCScalarValue[];

export class BackingDataObject {
  private map = new Map<String, FDCScalarValue>();
  constructor(public readonly globalID) {}
  updateServerValue(key: string, value: FDCScalarValue) {
    this.map.set(key, value);
  }
  // TODO(mtewani): Track fields related to a query.
  track(key: string, arg1: any) {
    throw new Error('Method not implemented.');
  }
}
