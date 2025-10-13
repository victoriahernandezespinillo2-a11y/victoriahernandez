/**
 * Value Object: CreditAmount
 * Representa una cantidad de créditos con su moneda
 */

import { ValidationResult } from '../common/ValidationResult';

export interface CreditAmountProps {
  value: number;
  currency: string;
}

export class CreditAmount {
  private readonly _value: number;
  private readonly _currency: string;

  constructor(value: number, currency: string = 'EUR') {
    this._value = value;
    this._currency = currency;

    const validation = this.validate();
    if (!validation.isValid) {
      throw new Error(`CreditAmount inválido: ${validation.errors.join(', ')}`);
    }
  }

  get value(): number {
    return this._value;
  }

  get currency(): string {
    return this._currency;
  }

  /**
   * Sumar dos cantidades de créditos
   */
  add(other: CreditAmount): CreditAmount {
    this.validateSameCurrency(other);
    return new CreditAmount(this._value + other._value, this._currency);
  }

  /**
   * Restar dos cantidades de créditos
   */
  subtract(other: CreditAmount): CreditAmount {
    this.validateSameCurrency(other);
    const result = this._value - other._value;
    
    if (result < 0) {
      throw new Error('El resultado no puede ser negativo');
    }
    
    return new CreditAmount(result, this._currency);
  }

  /**
   * Multiplicar por un factor
   */
  multiply(factor: number): CreditAmount {
    if (factor < 0) {
      throw new Error('El factor no puede ser negativo');
    }
    
    return new CreditAmount(this._value * factor, this._currency);
  }

  /**
   * Dividir por un divisor
   */
  divide(divisor: number): CreditAmount {
    if (divisor <= 0) {
      throw new Error('El divisor debe ser positivo');
    }
    
    return new CreditAmount(this._value / divisor, this._currency);
  }

  /**
   * Verificar si es mayor que otra cantidad
   */
  isGreaterThan(other: CreditAmount): boolean {
    this.validateSameCurrency(other);
    return this._value > other._value;
  }

  /**
   * Verificar si es mayor o igual que otra cantidad
   */
  isGreaterThanOrEqual(other: CreditAmount): boolean {
    this.validateSameCurrency(other);
    return this._value >= other._value;
  }

  /**
   * Verificar si es menor que otra cantidad
   */
  isLessThan(other: CreditAmount): boolean {
    this.validateSameCurrency(other);
    return this._value < other._value;
  }

  /**
   * Verificar si es menor o igual que otra cantidad
   */
  isLessThanOrEqual(other: CreditAmount): boolean {
    this.validateSameCurrency(other);
    return this._value <= other._value;
  }

  /**
   * Verificar si es cero
   */
  isZero(): boolean {
    return this._value === 0;
  }

  /**
   * Verificar si es positiva
   */
  isPositive(): boolean {
    return this._value > 0;
  }

  /**
   * Formatear para mostrar
   */
  format(): string {
    return `${this._value.toFixed(2)} ${this._currency}`;
  }

  /**
   * Validar el estado del objeto
   */
  validate(): ValidationResult {
    const errors: string[] = [];

    if (!Number.isFinite(this._value)) {
      errors.push('El valor debe ser un número finito');
    }

    if (this._value < 0) {
      errors.push('El valor no puede ser negativo');
    }

    if (!this._currency || this._currency.length !== 3) {
      errors.push('La moneda debe ser un código de 3 caracteres');
    }

    return new ValidationResult(errors.length === 0, errors);
  }

  /**
   * Validar que las monedas coincidan
   */
  private validateSameCurrency(other: CreditAmount): void {
    if (this._currency !== other._currency) {
      throw new Error(`No se pueden operar cantidades con monedas diferentes: ${this._currency} vs ${other._currency}`);
    }
  }

  /**
   * Comparar con otro objeto
   */
  equals(other: CreditAmount): boolean {
    return this._value === other._value && this._currency === other._currency;
  }

  /**
   * Crear desde string
   */
  static fromString(value: string, currency: string = 'EUR'): CreditAmount {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      throw new Error(`Valor inválido: ${value}`);
    }
    return new CreditAmount(numValue, currency);
  }

  /**
   * Crear desde número
   */
  static fromNumber(value: number, currency: string = 'EUR'): CreditAmount {
    return new CreditAmount(value, currency);
  }

  /**
   * Crear cantidad cero
   */
  static zero(currency: string = 'EUR'): CreditAmount {
    return new CreditAmount(0, currency);
  }
}



