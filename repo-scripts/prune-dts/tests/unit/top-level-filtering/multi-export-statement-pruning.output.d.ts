class InternalA {}
class InternalB {}

export class PublicA {}
export { InternalA as PublicAlias, InternalB };
