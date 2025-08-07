import { Pool, PoolClient } from 'pg';

// Configuración de la base de datos
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Tipos para la aplicación
export interface User {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  password: string | null;
  role: 'user' | 'admin' | 'staff';
  dateOfBirth: Date | null;
  membershipType: string | null;
  membershipExpiresAt: Date | null;
  creditsBalance: number;
  isActive: boolean;
  gdprConsent: boolean;
  gdprConsentDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Center {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  settings: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Court {
  id: string;
  centerId: string;
  name: string;
  sportType: string;
  capacity: number | null;
  basePricePerHour: number;
  isActive: boolean;
  maintenanceStatus: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Reservation {
  id: string;
  courtId: string;
  userId: string;
  startTime: Date;
  endTime: Date;
  status: string;
  totalPrice: number;
  paymentMethod: string | null;
  paymentIntentId: string | null;
  isRecurring: boolean;
  recurringParentId: string | null;
  checkInTime: Date | null;
  checkOutTime: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Membership {
  id: string;
  userId: string;
  type: string;
  status: string;
  validFrom: Date;
  validUntil: Date;
  price: number;
  paymentMethod: string | null;
  paymentIntentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tournament {
  id: string;
  name: string;
  description: string | null;
  sportType: string;
  format: string;
  maxParticipants: number;
  currentParticipants: number;
  startDate: Date;
  endDate: Date;
  status: string;
  entryFee: number;
  prizePool: number | null;
  rules: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Enums
export enum UserRole {
  user = 'user',
  admin = 'admin',
  staff = 'staff'
}

export enum ReservationStatus {
  PENDING = 'pending',
  PAID = 'paid',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show'
}

export enum MembershipType {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUAL = 'annual',
  PUNCH_CARD = 'punch_card'
}

export enum TournamentFormat {
  ELIMINATION = 'elimination',
  ROUND_ROBIN = 'round_robin',
  SWISS = 'swiss'
}

export enum MaintenanceType {
  CLEANING = 'cleaning',
  REPAIR = 'repair',
  INSPECTION = 'inspection',
  RENOVATION = 'renovation'
}

export enum MaintenanceStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

// Clase principal de base de datos
export class Database {
  public pool: Pool;

  constructor() {
    this.pool = pool;
  }

  // Métodos para usuarios
  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const query = `
      INSERT INTO users (email, name, phone, password, role, date_of_birth, membership_type, 
                        membership_expires_at, credits_balance, is_active, gdpr_consent, gdpr_consent_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
    
    const values = [
      userData.email,
      userData.name,
      userData.phone,
      userData.password,
      userData.role,
      userData.dateOfBirth,
      userData.membershipType,
      userData.membershipExpiresAt,
      userData.creditsBalance,
      userData.isActive,
      userData.gdprConsent,
      userData.gdprConsentDate
    ];

    const result = await this.pool.query(query, values);
    return this.mapUserFromDb(result.rows[0]);
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await this.pool.query(query, [email]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapUserFromDb(result.rows[0]);
  }

  async findUserById(id: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapUserFromDb(result.rows[0]);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const fields = Object.keys(updates).filter(key => key !== 'id' && key !== 'createdAt' && key !== 'updatedAt');
    const setClause = fields.map((field, index) => `${this.camelToSnake(field)} = $${index + 2}`).join(', ');
    const query = `UPDATE users SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`;
    
    const values = [id, ...fields.map(field => updates[field as keyof User])];
    const result = await this.pool.query(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapUserFromDb(result.rows[0]);
  }

  // Métodos para canchas
  async getCourts(): Promise<Court[]> {
    const query = 'SELECT * FROM courts WHERE is_active = true ORDER BY name';
    const result = await this.pool.query(query);
    return result.rows.map(this.mapCourtFromDb);
  }

  async getCourtById(id: string): Promise<Court | null> {
    const query = 'SELECT * FROM courts WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapCourtFromDb(result.rows[0]);
  }

  // Métodos para reservas
  async createReservation(reservationData: Omit<Reservation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Reservation> {
    const query = `
      INSERT INTO reservations (court_id, user_id, start_time, end_time, status, total_price, 
                              payment_method, payment_intent_id, is_recurring, recurring_parent_id, 
                              check_in_time, check_out_time, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;
    
    const values = [
      reservationData.courtId,
      reservationData.userId,
      reservationData.startTime,
      reservationData.endTime,
      reservationData.status,
      reservationData.totalPrice,
      reservationData.paymentMethod,
      reservationData.paymentIntentId,
      reservationData.isRecurring,
      reservationData.recurringParentId,
      reservationData.checkInTime,
      reservationData.checkOutTime,
      reservationData.notes
    ];

    const result = await this.pool.query(query, values);
    return this.mapReservationFromDb(result.rows[0]);
  }

  async getReservationsByUser(userId: string): Promise<Reservation[]> {
    const query = `
      SELECT r.*, c.name as court_name 
      FROM reservations r 
      JOIN courts c ON r.court_id = c.id 
      WHERE r.user_id = $1 
      ORDER BY r.start_time DESC
    `;
    const result = await this.pool.query(query, [userId]);
    return result.rows.map(this.mapReservationFromDb);
  }

  // Métodos para membresías
  async createMembership(membershipData: Omit<Membership, 'id' | 'createdAt' | 'updatedAt'>): Promise<Membership> {
    const query = `
      INSERT INTO memberships (user_id, type, status, valid_from, valid_until, price, 
                              payment_method, payment_intent_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const values = [
      membershipData.userId,
      membershipData.type,
      membershipData.status,
      membershipData.validFrom,
      membershipData.validUntil,
      membershipData.price,
      membershipData.paymentMethod,
      membershipData.paymentIntentId
    ];

    const result = await this.pool.query(query, values);
    return this.mapMembershipFromDb(result.rows[0]);
  }

  // Métodos de utilidad
  async testConnection(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  // Métodos de mapeo
  private mapUserFromDb(row: any): User {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      phone: row.phone,
      password: row.password,
      role: row.role,
      dateOfBirth: row.date_of_birth,
      membershipType: row.membership_type,
      membershipExpiresAt: row.membership_expires_at,
      creditsBalance: row.credits_balance,
      isActive: row.is_active,
      gdprConsent: row.gdpr_consent,
      gdprConsentDate: row.gdpr_consent_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapCourtFromDb(row: any): Court {
    return {
      id: row.id,
      centerId: row.center_id,
      name: row.name,
      sportType: row.sport_type,
      capacity: row.capacity,
      basePricePerHour: row.base_price_per_hour,
      isActive: row.is_active,
      maintenanceStatus: row.maintenance_status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapReservationFromDb(row: any): Reservation {
    return {
      id: row.id,
      courtId: row.court_id,
      userId: row.user_id,
      startTime: row.start_time,
      endTime: row.end_time,
      status: row.status,
      totalPrice: row.total_price,
      paymentMethod: row.payment_method,
      paymentIntentId: row.payment_intent_id,
      isRecurring: row.is_recurring,
      recurringParentId: row.recurring_parent_id,
      checkInTime: row.check_in_time,
      checkOutTime: row.check_out_time,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapMembershipFromDb(row: any): Membership {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      status: row.status,
      validFrom: row.valid_from,
      validUntil: row.valid_until,
      price: row.price,
      paymentMethod: row.payment_method,
      paymentIntentId: row.payment_intent_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}

// Instancia singleton
export const db = new Database();

// Exportar enums
export { UserRole, ReservationStatus, MembershipType, TournamentFormat, MaintenanceType, MaintenanceStatus };

// Exportar tipos
export type {
  User,
  Center,
  Court,
  Reservation,
  Membership,
  Tournament
};