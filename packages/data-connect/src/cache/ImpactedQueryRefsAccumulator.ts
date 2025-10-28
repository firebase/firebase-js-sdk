export class ImpactedQueryRefsAccumulator {
    impacted = new Set<string>();
    add(impacted: string[]): void {
        impacted.forEach(ref => this.impacted.add(ref));
    }
    consumeEvents(): string[] {
        const events = Array.from(this.impacted);
        this.impacted.clear();
        return events;
    }
}