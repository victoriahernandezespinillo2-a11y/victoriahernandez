/**
 * Domain Entity: CreditBalance
 * Representa el saldo de créditos de un usuario con reglas de negocio
 */

import { CreditAmount } from '../value-objects/CreditAmount';
import { UserId } from '../value-objects/UserId';
import { ValidationResult } from '../common/ValidationResult';

export interface CreditBalanceProps {
  userId: UserId;
  amount: CreditAmount;
  version: number;
}

export class CreditBalance {
  private readonly _userId: UserId;
  private _amount: CreditAmount;
  private _version: number;

  constructor(props: CreditBalanceProps) {
    this._userId = props.userId;
    this._amount = props.amount;
    this._version = props.version;
  }

  get userId(): UserId {
    return this._userId;
  }

  get amount(): CreditAmount {
    return this._amount;
  }

  get version(): number {
    return this._version;
  }

  /**
   * Agregar créditos al saldo
   */
  add(amount: CreditAmount): CreditBalance {
    if (amount.value <= 0) {
      throw new Error('La cantidad a agregar debe ser positiva');
    }

    return new CreditBalance({
      userId: this._userId,
      amount: this._amount.add(amount),
      version: this._version + 1
    });
  }

  /**
   * Sustraer créditos del saldo
   */
  subtract(amount: CreditAmount): CreditBalance {
    if (amount.value <= 0) {
      throw new Error('La cantidad a sustraer debe ser positiva');
    }

    if (!this.canAfford(amount)) {
      throw new Error(
        `Saldo insuficiente. Disponible: ${this._amount.value}, Requerido: ${amount.value}`
      );
    }

    return new CreditBalance({
      userId: this._userId,
      amount: this._amount.subtract(amount),
      version: this._version + 1
    });
  }

  /**
   * Verificar si el usuario puede permitirse una cantidad
   */
  canAfford(amount: CreditAmount): boolean {
    return this._amount.value >= amount.value;
  }

  /**
   * Validar el estado del saldo
   */
  validate(): ValidationResult {
    const errors: string[] = [];

    if (this._amount.value < 0) {
      errors.push('El saldo no puede ser negativo');
    }

    if (this._version < 0) {
      errors.push('La versión debe ser un número positivo');
    }

    return new ValidationResult(errors.length === 0, errors);
  }

  /**
   * Crear un nuevo saldo desde cero
   */
  static create(userId: UserId, initialAmount: CreditAmount = new CreditAmount(0, 'EUR')): CreditBalance {
    return new CreditBalance({
      userId,
      amount: initialAmount,
      version: 1
    });
  }

  /**
   * Reconstruir desde persistencia
   */
  static fromPersistence(data: {
    userId: string;
    amount: number;
    currency: string;
    version: number;
  }): CreditBalance {
    return new CreditBalance({
      userId: new UserId(data.userId),
      amount: new CreditAmount(data.amount, data.currency),
      version: data.version
    });
  }

  /**
   * Convertir a datos de persistencia
   */
  toPersistence(): {
    userId: string;
    amount: number;
    currency: string;
    version: number;
  } {
    return {
      userId: this._userId.value,
      amount: this._amount.value,
      currency: this._amount.currency,
      version: this._version
    };
  }

  equals(other: CreditBalance): boolean {
    return (
      this._userId.equals(other._userId) &&
      this._amount.equals(other._amount) &&
      this._version === other._version
    );
  }
}



