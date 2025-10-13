/**
 * Command: DeductCreditsCommand
 * Comando para deducir créditos de un usuario
 */

import { UserId } from '../../domain/value-objects/UserId';
import { CreditAmount } from '../../domain/value-objects/CreditAmount';
import { TransactionReason } from '../../domain/entities/CreditTransaction';

export interface DeductCreditsCommandProps {
  userId: UserId;
  amount: CreditAmount;
  reason: TransactionReason;
  referenceId?: string;
  metadata?: Record<string, any>;
  idempotencyKey?: string;
}

export class DeductCreditsCommand {
  public readonly userId: UserId;
  public readonly amount: CreditAmount;
  public readonly reason: TransactionReason;
  public readonly referenceId?: string;
  public readonly metadata?: Record<string, any>;
  public readonly idempotencyKey?: string;

  constructor(props: DeductCreditsCommandProps) {
    this.userId = props.userId;
    this.amount = props.amount;
    this.reason = props.reason;
    this.referenceId = props.referenceId;
    this.metadata = props.metadata;
    this.idempotencyKey = props.idempotencyKey;
  }

  /**
   * Crear comando desde datos primitivos
   */
  static create(props: {
    userId: string;
    amount: number;
    currency?: string;
    reason: string;
    referenceId?: string;
    metadata?: Record<string, any>;
    idempotencyKey?: string;
  }): DeductCreditsCommand {
    return new DeductCreditsCommand({
      userId: new UserId(props.userId),
      amount: new CreditAmount(props.amount, props.currency || 'EUR'),
      reason: props.reason as TransactionReason,
      referenceId: props.referenceId,
      metadata: props.metadata,
      idempotencyKey: props.idempotencyKey
    });
  }
}



