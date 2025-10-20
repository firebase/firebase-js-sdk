export class ImpactedQueryRefsAccumulator {
    impacted = new Set<string>();
    add(impacted: string[]) {
        impacted.forEach(ref => this.impacted.add(ref));
    }
    consumeEvents() {
        const events = Array.from(this.impacted);
        this.impacted.clear();
        return events;
    }
}