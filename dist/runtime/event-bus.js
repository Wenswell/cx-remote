export class EventBus {
    store;
    listeners = new Set();
    constructor(store) {
        this.store = store;
    }
    publish(event) {
        const stored = this.store.addEvent({
            ...event,
            createdAt: event.createdAt ?? Date.now(),
        });
        for (const listener of this.listeners) {
            listener(stored);
        }
        return stored;
    }
    subscribe(listener) {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }
}
