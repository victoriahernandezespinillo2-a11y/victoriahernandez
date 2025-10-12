/**
 * Domain Entity: CreditTransaction
 * Representa una transacción de créditos con reglas de negocio
 */

import { CreditAmount } from '../value-objects/CreditAmount';
import { UserId } from '../value-objects/UserId';
import { TransactionId } from '../value-objects/TransactionId';
import { ValidationResult } from '../common/ValidationResult';

export enum TransactionType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
  TRANSFER = 'TRANSFER'
}

export enum TransactionReason {
  TOPUP = 'TOPUP',
  PAYMENT = 'PAYMENT',
  PROMOTION = 'PROMOTION',
  REFUND = 'REFUND',
  ADMIN_ADJUSTMENT = 'ADMIN_ADJUSTMENT',
  ORDER = 'ORDER',
  RESERVATION_PAYMENT = 'RESERVATION_PAYMENT'
}

export interface CreditTransactionProps {
  id: TransactionId;
  userId: UserId;
  type: TransactionType;
  amount: CreditAmount;
  reason: TransactionReason;
  balanceBefore: CreditAmount;
  balanceAfter: CreditAmount;
  referenceId?: string;
  metadata?: Record<string, any>;
  idempotencyKey?: string;
  createdAt: Date;
}

export class CreditTransaction {
  private readonly _id: TransactionId;
  private readonly _userId: UserId;
  private readonly _type: TransactionType;
  private readonly _amount: CreditAmount;
  private readonly _reason: TransactionReason;
  private readonly _balanceBefore: CreditAmount;
  private readonly _balanceAfter: CreditAmount;
  private readonly _referenceId?: string;
  private readonly _metadata: Record<string, any>;
  private readonly _idempotencyKey?: string;
  private readonly _createdAt: Date;

  constructor(props: CreditTransactionProps) {
    this._id = props.id;
    this._userId = props.userId;
    this._type = props.type;
    this._amount = props.amount;
    this._reason = props.reason;
    this._balanceBefore = props.balanceBefore;
    this._balanceAfter = props.balanceAfter;
    this._referenceId = props.referenceId;
    this._metadata = props.metadata || {};
    this._idempotencyKey = props.idempotencyKey;
    this._createdAt = props.createdAt;

    const validation = this.validate();
    if (!validation.isValid) {
      throw new Error(`CreditTransaction inválida: ${validation.errors.join(', ')}`);
    }
  }

  get id(): TransactionId {
    return this._id;
  }

  get userId(): UserId {
    return this._userId;
  }

  get type(): TransactionType {
    return this._type;
  }

  get amount(): CreditAmount {
    return this._amount;
  }

  get reason(): TransactionReason {
    return this._reason;
  }

  get balanceBefore(): CreditAmount {
    return this._balanceBefore;
  }

  get balanceAfter(): CreditAmount {
    return this._balanceAfter;
  }

  get referenceId(): string | undefined {
    return this._referenceId;
  }

  get metadata(): Record<string, any> {
    return { ...this._metadata };
  }

  get idempotencyKey(): string | undefined {
    return this._idempotencyKey;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  /**
   * Validar la transacción
   */
  validate(): ValidationResult {
    const errors: string[] = [];

    // Validar que el monto sea positivo
    if (!this._amount.isPositive()) {
      errors.push('El monto debe ser positivo');
    }

    // Validar consistencia de balance
    const expectedBalanceAfter = this._type === TransactionType.CREDIT
      ? this._balanceBefore.add(this._amount)
      : this._balanceBefore.subtract(this._amount);

    if (!this._balanceAfter.equals(expectedBalanceAfter)) {
      errors.push('El balance después no coincide con el cálculo esperado');
    }

    // Validar que el balance antes no sea negativo
    if (this._balanceBefore.value < 0) {
      errors.push('El balance antes no puede ser negativo');
    }

    // Validar que el balance después no sea negativo
    if (this._balanceAfter.value < 0) {
      errors.push('El balance después no puede ser negativo');
    }

    // Validar fecha de creación
    if (this._createdAt > new Date()) {
      errors.push('La fecha de creación no puede ser futura');
    }

    return new ValidationResult(errors.length === 0, errors);
  }

  /**
   * Verificar si es una transacción de crédito
   */
  isCredit(): boolean {
    return this._type === TransactionType.CREDIT;
  }

  /**
   * Verificar si es una transacción de débito
   */
  isDebit(): boolean {
    return this._type === TransactionType.DEBIT;
  }

  /**
   * Verificar si es una transferencia
   */
  isTransfer(): boolean {
    return this._type === TransactionType.TRANSFER;
  }

  /**
   * Crear transacción de crédito
   */
  static createCredit(props: {
    userId: UserId;
    amount: CreditAmount;
    reason: TransactionReason;
    balanceBefore: CreditAmount;
    referenceId?: string;
    metadata?: Record<string, any>;
    idempotencyKey?: string;
  }): CreditTransaction {
    const balanceAfter = props.balanceBefore.add(props.amount);
    
    return new CreditTransaction({
      id: TransactionId.generate(),
      userId: props.userId,
      type: TransactionType.CREDIT,
      amount: props.amount,
      reason: props.reason,
      balanceBefore: props.balanceBefore,
      balanceAfter,
      referenceId: props.referenceId,
      metadata: props.metadata,
      idempotencyKey: props.idempotencyKey,
      createdAt: new Date()
    });
  }

  /**
   * Crear transacción de débito
   */
  static createDebit(props: {
    userId: UserId;
    amount: CreditAmount;
    reason: TransactionReason;
    balanceBefore: CreditAmount;
    referenceId?: string;
    metadata?: Record<string, any>;
    idempotencyKey?: string;
  }): CreditTransaction {
    const balanceAfter = props.balanceBefore.subtract(props.amount);
    
    return new CreditTransaction({
      id: TransactionId.generate(),
      userId: props.userId,
      type: TransactionType.DEBIT,
      amount: props.amount,
      reason: props.reason,
      balanceBefore: props.balanceBefore,
      balanceAfter,
      referenceId: props.referenceId,
      metadata: props.metadata,
      idempotencyKey: props.idempotencyKey,
      createdAt: new Date()
    });
  }

  /**
   * Reconstruir desde persistencia
   */
  static fromPersistence(data: {
    id: string;
    userId: string;
    type: string;
    amount: number;
    currency: string;
    reason: string;
    balanceBefore: number;
    balanceAfter: number;
    referenceId?: string;
    metadata?: Record<string, any>;
    idempotencyKey?: string;
    createdAt: Date;
  }): CreditTransaction {
    return new CreditTransaction({
      id: new TransactionId(data.id),
      userId: new UserId(data.userId),
      type: data.type as TransactionType,
      amount: new CreditAmount(data.amount, data.currency),
      reason: data.reason as TransactionReason,
      balanceBefore: new CreditAmount(data.balanceBefore, data.currency),
      balanceAfter: new CreditAmount(data.balanceAfter, data.currency),
      referenceId: data.referenceId,
      metadata: data.metadata,
      idempotencyKey: data.idempotencyKey,
      createdAt: data.createdAt
    });
  }

  /**
   * Convertir a datos de persistencia
   */
  toPersistence(): {
    id: string;
    userId: string;
    type: string;
    amount: number;
    currency: string;
    reason: string;
    balanceBefore: number;
    balanceAfter: number;
    referenceId?: string;
    metadata?: Record<string, any>;
    idempotencyKey?: string;
    createdAt: Date;
  } {
    return {
      id: this._id.value,
      userId: this._userId.value,
      type: this._type,
      amount: this._amount.value,
      currency: this._amount.currency,
      reason: this._reason,
      balanceBefore: this._balanceBefore.value,
      balanceAfter: this._balanceAfter.value,
      referenceId: this._referenceId || undefined,
      metadata: this._metadata || undefined,
      idempotencyKey: this._idempotencyKey || undefined,
      createdAt: this._createdAt
    };
  }

  equals(other: CreditTransaction): boolean {
    return this._id.equals(other._id);
  }
}
