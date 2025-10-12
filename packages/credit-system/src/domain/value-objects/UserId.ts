/**
 * Value Object: UserId
 * Identificador único de usuario con validación
 */

import { ValidationResult } from '../common/ValidationResult';

export class UserId {
  private readonly _value: string;

  constructor(value: string) {
    this._value = value;

    const validation = this.validate();
    if (!validation.isValid) {
      throw new Error(`UserId inválido: ${validation.errors.join(', ')}`);
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
   * Comparar con otro UserId
   */
  equals(other: UserId): boolean {
    return this._value === other._value;
  }

  /**
   * Crear desde string
   */
  static fromString(value: string): UserId {
    return new UserId(value);
  }

  /**
   * Crear un ID temporal para testing
   */
  static createTemp(): UserId {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8);
    return new UserId(`temp_${timestamp}_${random}`);
  }
}


