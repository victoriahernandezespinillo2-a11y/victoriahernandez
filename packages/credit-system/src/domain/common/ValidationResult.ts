/**
 * Value Object: ValidationResult
 * Resultado de validación con errores
 */

export class ValidationResult {
  private readonly _isValid: boolean;
  private readonly _errors: string[];

  constructor(isValid: boolean, errors: string[] = []) {
    this._isValid = isValid;
    this._errors = [...errors];
  }

  get isValid(): boolean {
    return this._isValid;
  }

  get errors(): string[] {
    return [...this._errors];
  }

  get errorMessage(): string {
    return this._errors.join('; ');
  }

  /**
   * Combinar con otro resultado de validación
   */
  combine(other: ValidationResult): ValidationResult {
    const combinedErrors = [...this._errors, ...other._errors];
    const combinedIsValid = this._isValid && other._isValid;
    
    return new ValidationResult(combinedIsValid, combinedErrors);
  }

  /**
   * Crear resultado válido
   */
  static valid(): ValidationResult {
    return new ValidationResult(true);
  }

  /**
   * Crear resultado inválido
   */
  static invalid(errors: string[]): ValidationResult {
    return new ValidationResult(false, errors);
  }

  /**
   * Crear resultado inválido con un solo error
   */
  static invalidSingle(error: string): ValidationResult {
    return new ValidationResult(false, [error]);
  }
}



