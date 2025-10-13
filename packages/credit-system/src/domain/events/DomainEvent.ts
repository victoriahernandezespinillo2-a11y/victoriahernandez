/**
 * Domain Event Interface
 * Representa un evento de dominio en el sistema
 */

export interface DomainEvent {
  type: string;
  payload: any;
  timestamp: Date;
  aggregateId: string;
  version: number;
}

export interface EventHandler<T extends DomainEvent = DomainEvent> {
  handle(event: T): Promise<void>;
}



