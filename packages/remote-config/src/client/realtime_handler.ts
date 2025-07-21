
import { ConfigUpdateObserver } from "../public_types";
export class RealtimeHandler {
    constructor() {

    } 
    private observers: Set<ConfigUpdateObserver> = new Set<ConfigUpdateObserver>();
    begineRealtime(){
        //if observers are present, start the realtime updates
        if (this.observers.size > 0) {
           
        }
    }
    /**
     * Adds an observer to the realtime updates.
     * @param observer The observer to add.
     */
    addObserver(observer: ConfigUpdateObserver) {
        this.observers.add(observer);
        this.begineRealtime();
    }
    /**
     * Removes an observer from the realtime updates.
     * @param observer The observer to remove.
     * @returns true if the observer was removed, false if it was not found.
     */
    removeObserver(observer: ConfigUpdateObserver) {
        if (this.observers.has(observer)) {
            return this.observers.delete(observer);
        }
    }
}
