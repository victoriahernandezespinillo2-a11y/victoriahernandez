/**
 * Domain Entity: Promotion
 * Representa una promoción con reglas de negocio
 */

import { ValidationResult } from '../common/ValidationResult';
import { CreditAmount } from '../value-objects/CreditAmount';

export enum PromotionType {
  SIGNUP_BONUS = 'SIGNUP_BONUS',
  RECHARGE_BONUS = 'RECHARGE_BONUS',
  USAGE_BONUS = 'USAGE_BONUS',
  REFERRAL_BONUS = 'REFERRAL_BONUS',
  DISCOUNT_CODE = 'DISCOUNT_CODE',
  SEASONAL = 'SEASONAL'
}

export enum PromotionStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  EXPIRED = 'EXPIRED',
  EXHAUSTED = 'EXHAUSTED'
}

export interface PromotionConditions {
  // Condiciones generales
  minAmount?: number;
  maxAmount?: number;
  minReservations?: number;
  userSegment?: string[];
  
  // Condiciones de recarga
  minTopupAmount?: number;
  
  // Condiciones de uso
  reservationCount?: number;
  completedReservations?: number;
  
  // Condiciones temporales
  dayOfWeek?: number[];
  timeOfDay?: { start: string; end: string };
  
  // Condiciones de usuario
  firstTimeUser?: boolean;
  existingCustomer?: boolean;
}

export interface PromotionRewards {
  // Tipo de recompensa
  type: 'FIXED_CREDITS' | 'PERCENTAGE_BONUS' | 'DISCOUNT_PERCENTAGE' | 'DISCOUNT_FIXED';
  
  // Valor de la recompensa
  value: number;
  
  // Límites de la recompensa
  maxRewardAmount?: number;
  
  // Recompensas múltiples
  stackable?: boolean;
}

export interface PromotionProps {
  id: string;
  name: string;
  code?: string;
  type: PromotionType;
  status: PromotionStatus;
  conditions: PromotionConditions;
  rewards: PromotionRewards;
  validFrom: Date;
  validTo?: Date;
  usageLimit?: number;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export class Promotion {
  private readonly _id: string;
  private _name: string;
  private _code: string | undefined;
  private readonly _type: PromotionType;
  private _status: PromotionStatus;
  private readonly _conditions: PromotionConditions;
  private readonly _rewards: PromotionRewards;
  private readonly _validFrom: Date;
  private _validTo: Date | undefined;
  private _usageLimit: number | undefined;
  private _usageCount: number;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: PromotionProps) {
    this._id = props.id;
    this._name = props.name;
    this._code = props.code;
    this._type = props.type;
    this._status = props.status;
    this._conditions = props.conditions;
    this._rewards = props.rewards;
    this._validFrom = props.validFrom;
    this._validTo = props.validTo;
    this._usageLimit = props.usageLimit;
    this._usageCount = props.usageCount;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;

    const validation = this.validate();
    if (!validation.isValid) {
      throw new Error(`Promotion inválida: ${validation.errors.join(', ')}`);
    }
  }

  // Getters
  get id(): string { return this._id; }
  get name(): string { return this._name; }
  get code(): string | undefined { return this._code; }
  get type(): PromotionType { return this._type; }
  get status(): PromotionStatus { return this._status; }
  get conditions(): PromotionConditions { return { ...this._conditions }; }
  get rewards(): PromotionRewards { return { ...this._rewards }; }
  get validFrom(): Date { return this._validFrom; }
  get validTo(): Date | undefined { return this._validTo; }
  get usageLimit(): number | undefined { return this._usageLimit; }
  get usageCount(): number { return this._usageCount; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }

  /**
   * Validar la promoción
   */
  validate(): ValidationResult {
    const errors: string[] = [];

    // Validar nombre
    if (!this._name || this._name.length < 3) {
      errors.push('El nombre debe tener al menos 3 caracteres');
    }

    // Validar código si es requerido
    if (this._type === PromotionType.DISCOUNT_CODE && !this._code) {
      errors.push('Las promociones de tipo DISCOUNT_CODE requieren un código');
    }

    // Validar fechas
    if (this._validFrom > new Date()) {
      // Promoción futura - válido
    }

    if (this._validTo && this._validTo < this._validFrom) {
      errors.push('La fecha de fin debe ser posterior a la fecha de inicio');
    }

    // Validar límite de uso
    if (this._usageLimit !== undefined && this._usageLimit < 1) {
      errors.push('El límite de uso debe ser al menos 1');
    }

    // Validar contador de uso
    if (this._usageCount < 0) {
      errors.push('El contador de uso no puede ser negativo');
    }

    // Validar recompensas
    if (this._rewards.value <= 0) {
      errors.push('El valor de la recompensa debe ser positivo');
    }

    return new ValidationResult(errors.length === 0, errors);
  }

  /**
   * Verificar si la promoción está activa
   */
  isActive(): boolean {
    const now = new Date();
    
    // Estado debe ser ACTIVE
    if (this._status !== PromotionStatus.ACTIVE) {
      return false;
    }

    // Verificar fechas
    if (this._validFrom > now) {
      return false;
    }

    if (this._validTo && this._validTo < now) {
      return false;
    }

    // Verificar límite de uso
    if (this._usageLimit && this._usageCount >= this._usageLimit) {
      return false;
    }

    return true;
  }

  /**
   * Verificar si se puede aplicar a una cantidad
   */
  canApplyTo(amount: CreditAmount): boolean {
    if (!this.isActive()) {
      return false;
    }

    // Verificar monto mínimo
    if (this._conditions.minAmount && amount.value < this._conditions.minAmount) {
      return false;
    }

    // Verificar monto máximo
    if (this._conditions.maxAmount && amount.value > this._conditions.maxAmount) {
      return false;
    }

    // Verificar día de la semana
    if (this._conditions.dayOfWeek && this._conditions.dayOfWeek.length > 0) {
      const today = new Date().getDay();
      if (!this._conditions.dayOfWeek.includes(today)) {
        return false;
      }
    }

    // Verificar hora del día
    if (this._conditions.timeOfDay) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      if (currentTime < this._conditions.timeOfDay.start || currentTime > this._conditions.timeOfDay.end) {
        return false;
      }
    }

    return true;
  }

  /**
   * Calcular recompensa para una cantidad
   */
  calculateReward(amount: CreditAmount): CreditAmount {
    let rewardValue = 0;

    switch (this._rewards.type) {
      case 'FIXED_CREDITS':
        rewardValue = this._rewards.value;
        break;

      case 'PERCENTAGE_BONUS':
        rewardValue = amount.value * (this._rewards.value / 100);
        break;

      case 'DISCOUNT_PERCENTAGE':
        rewardValue = amount.value * (this._rewards.value / 100);
        break;

      case 'DISCOUNT_FIXED':
        rewardValue = this._rewards.value;
        break;
    }

    // Aplicar límite máximo de recompensa
    if (this._rewards.maxRewardAmount && rewardValue > this._rewards.maxRewardAmount) {
      rewardValue = this._rewards.maxRewardAmount;
    }

    return new CreditAmount(rewardValue, amount.currency);
  }

  /**
   * Incrementar contador de uso
   */
  incrementUsage(): Promotion {
    const newProps = {
      ...this.toProps(),
      usageCount: this._usageCount + 1,
      updatedAt: new Date()
    };

    // Actualizar estado si se alcanzó el límite
    if (newProps.usageLimit && newProps.usageCount >= newProps.usageLimit) {
      newProps.status = PromotionStatus.EXHAUSTED;
    }

    return new Promotion(newProps);
  }

  /**
   * Activar promoción
   */
  activate(): Promotion {
    return new Promotion({
      ...this.toProps(),
      status: PromotionStatus.ACTIVE,
      updatedAt: new Date()
    });
  }

  /**
   * Pausar promoción
   */
  pause(): Promotion {
    return new Promotion({
      ...this.toProps(),
      status: PromotionStatus.PAUSED,
      updatedAt: new Date()
    });
  }

  /**
   * Expirar promoción
   */
  expire(): Promotion {
    return new Promotion({
      ...this.toProps(),
      status: PromotionStatus.EXPIRED,
      updatedAt: new Date()
    });
  }

  /**
   * Convertir a props para reconstrucción
   */
  private toProps(): PromotionProps {
    return {
      id: this._id,
      name: this._name,
      code: this._code || undefined,
      type: this._type,
      status: this._status,
      conditions: this._conditions,
      rewards: this._rewards,
      validFrom: this._validFrom,
      validTo: this._validTo || undefined,
      usageLimit: this._usageLimit || undefined,
      usageCount: this._usageCount,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt
    };
  }

  /**
   * Crear una nueva promoción
   */
  static create(params: {
    name: string;
    code?: string;
    type: PromotionType;
    conditions: PromotionConditions;
    rewards: PromotionRewards;
    validFrom: Date;
    validTo?: Date;
    usageLimit?: number;
  }): Promotion {
    return new Promotion({
      id: `promo_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: params.name,
      code: params.code || undefined,
      type: params.type,
      status: PromotionStatus.DRAFT,
      conditions: params.conditions,
      rewards: params.rewards,
      validFrom: params.validFrom,
      validTo: params.validTo || undefined,
      usageLimit: params.usageLimit || undefined,
      usageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  /**
   * Reconstruir desde persistencia
   */
  static fromPersistence(data: any): Promotion {
    return new Promotion({
      id: data.id,
      name: data.name,
      code: data.code || undefined,
      type: data.type as PromotionType,
      status: data.status as PromotionStatus,
      conditions: data.conditions,
      rewards: data.rewards,
      validFrom: new Date(data.validFrom),
      validTo: data.validTo ? new Date(data.validTo) : undefined,
      usageLimit: data.usageLimit || undefined,
      usageCount: data.usageCount,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt)
    });
  }

  /**
   * Convertir a datos de persistencia
   */
  toPersistence(): any {
    return {
      id: this._id,
      name: this._name,
      code: this._code,
      type: this._type,
      status: this._status,
      conditions: this._conditions,
      rewards: this._rewards,
      validFrom: this._validFrom,
      validTo: this._validTo,
      usageLimit: this._usageLimit,
      usageCount: this._usageCount,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt
    };
  }
}
