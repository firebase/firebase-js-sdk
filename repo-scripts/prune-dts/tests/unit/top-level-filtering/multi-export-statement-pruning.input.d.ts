class InternalA {}
class InternalB {}
class InternalC {}
export class PublicA {}
export { InternalA as PublicAlias, InternalB };
