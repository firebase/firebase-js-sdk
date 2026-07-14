export class PublicModel {}
class PrivateModel extends PublicModel {}
export type ModelMap = Record<string, PrivateModel | null>;
