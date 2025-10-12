/**
 * Domain Event Bus Interface
 * Sistema de eventos de dominio para desacoplamiento
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

export interface EventBus {
  /**
   * Publicar un evento de dominio
   */
  publish(event: DomainEvent): Promise<void>;

  /**
   * Emitir un evento (alias para compatibilidad)
   */
  emit(eventType: string, payload: any): Promise<void>;

  /**
   * Suscribirse a un tipo de evento
   */
  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: EventHandler<T>
  ): void;

  /**
   * Desuscribirse de un tipo de evento
   */
  unsubscribe(eventType: string, handler: EventHandler): void;
}

/**
 * Implementación simple del Event Bus
 */
export class SimpleEventBus implements EventBus {
  private handlers: Map<string, EventHandler[]> = new Map();

  async publish(event: DomainEvent): Promise<void> {
    const eventHandlers = this.handlers.get(event.type) || [];
    
    // Ejecutar todos los handlers de forma secuencial
    for (const handler of eventHandlers) {
      try {
        await handler.handle(event);
      } catch (error) {
        console.error(`Error handling event ${event.type}:`, error);
        // En un sistema real, podrías querer reintentar o enviar a una cola de errores
      }
    }
  }

  async emit(eventType: string, payload: any): Promise<void> {
    await this.publish({
      type: eventType,
      payload,
      timestamp: new Date(),
      aggregateId: payload.userId || 'unknown',
      version: 1
    });
  }

  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: EventHandler<T>
  ): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  unsubscribe(eventType: string, handler: EventHandler): void {
    const eventHandlers = this.handlers.get(eventType);
    if (eventHandlers) {
      const index = eventHandlers.indexOf(handler);
      if (index > -1) {
        eventHandlers.splice(index, 1);
      }
    }
  }
}

/**
 * Event Bus singleton para la aplicación
 */
export const eventBus = new SimpleEventBus();
