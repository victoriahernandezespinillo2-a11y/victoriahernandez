/**
 * Value Object: TransactionId
 * Identificador único de transacción con validación
 */

import { ValidationResult } from '../common/ValidationResult';

export class TransactionId {
  private readonly _value: string;

  constructor(value: string) {
    this._value = value;

    const validation = this.validate();
    if (!validation.isValid) {
      throw new Error(`TransactionId inválido: ${validation.errors.join(', ')}`);
    }
  }

  get value(): string {
    return this._value;
  }

  /**
   * Validar el formato del ID
   */
  validate(): ValidationResult {
    const errors: string[] = [];

    if (!this._value || typeof this._value !== 'string') {
      errors.push('El ID debe ser una cadena no vacía');
    }

    if (this._value.length < 10) {
      errors.push('El ID debe tener al menos 10 caracteres');
    }

    if (this._value.length > 50) {
      errors.push('El ID no puede tener más de 50 caracteres');
    }

    // Validar formato básico (puede ser UUID o CUID)
    const isValidFormat = /^[a-zA-Z0-9_-]+$/.test(this._value);
    if (!isValidFormat) {
      errors.push('El ID contiene caracteres inválidos');
    }

    return new ValidationResult(errors.length === 0, errors);
  }

  /**
   * Generar un nuevo ID único
   */
  static generate(): TransactionId {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 15);
    const id = `txn_${timestamp}_${random}`;
    return new TransactionId(id);
  }

  /**
   * Crear desde string
   */
  static fromString(value: string): TransactionId {
    return new TransactionId(value);
  }

  /**
   * Comparar con otro TransactionId
   */
  equals(other: TransactionId): boolean {
    return this._value === other._value;
  }
}



