/**
 * Credit System Package - Main Export
 * Sistema de créditos enterprise para Polideportivo Oroquieta
 */

// Domain Entities
export { CreditBalance } from './domain/entities/CreditBalance';
export { CreditTransaction, TransactionType, TransactionReason } from './domain/entities/CreditTransaction';

// Domain Value Objects
export { CreditAmount } from './domain/value-objects/CreditAmount';
export { UserId } from './domain/value-objects/UserId';
export { TransactionId } from './domain/value-objects/TransactionId';

// Domain Services
export { CreditCalculationService } from './domain/services/CreditCalculationService';

// Domain Repositories
export { CreditRepository } from './domain/repositories/CreditRepository';

// Domain Events
export { EventBus, DomainEvent, EventHandler } from './domain/events/EventBus';

// Application Commands
export { AddCreditsCommand } from './application/commands/AddCreditsCommand';
export { DeductCreditsCommand } from './application/commands/DeductCreditsCommand';

// Application Use Cases
export { AddCreditsUseCase } from './application/use-cases/AddCreditsUseCase';
export { DeductCreditsUseCase } from './application/use-cases/DeductCreditsUseCase';

// Application Services
export { CreditManagementService } from './application/services/CreditManagementService';

// Infrastructure
export { PrismaCreditRepository } from './infrastructure/repositories/PrismaCreditRepository';
export { PrismaCreditRepositoryMethods } from './infrastructure/repositories/PrismaCreditRepositoryMethods';
export { AuditService, AuditLogEntry } from './infrastructure/services/AuditService';

// Common
export { ValidationResult } from './domain/common/ValidationResult';

// Singletons
export { eventBus } from './domain/events/EventBus';
export { auditService } from './infrastructure/services/AuditService';
