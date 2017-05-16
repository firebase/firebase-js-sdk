export interface PropertySpec {
  is: any;
  isName?: string;
  args?: number;
}

export interface NamespaceSpec {
  [prop: string]: NamespaceSpec | PropertySpec;
}
