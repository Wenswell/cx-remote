import type { HubEvent } from '../domain/types.js';
import type { Store } from '../store/store.js';

type Listener = (event: HubEvent) => void;

export class EventBus {
  private listeners = new Set<Listener>();

  constructor(private readonly store: Store) {}

  publish(event: Omit<HubEvent, 'id' | 'createdAt'> & { createdAt?: number }): HubEvent {
    const stored = this.store.addEvent({
      ...event,
      createdAt: event.createdAt ?? Date.now(),
    });
    for (const listener of this.listeners) {
      listener(stored);
    }
    return stored;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
