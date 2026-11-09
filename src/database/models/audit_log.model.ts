import { DataTypes, Model, type Optional, type Sequelize } from 'sequelize';

export interface AuditLogAttributes {
  audit_log_id: string;
  fk_user: number | null;
  action: string;
  entity_name: string;
  entity_id: string | null;
  values: unknown;
  error_values: unknown;
  ip_address: string | null;
  user_agent: string | null;
  registration_date: Date;
}

export type AuditLogCreationAttributes = Optional<
  AuditLogAttributes,
  | 'audit_log_id'
  | 'fk_user'
  | 'entity_id'
  | 'values'
  | 'error_values'
  | 'ip_address'
  | 'user_agent'
  | 'registration_date'
>;
export class AuditLogModel extends Model<
  AuditLogAttributes,
  AuditLogCreationAttributes
> {
  declare audit_log_id: string;
  declare fk_user: number | null;
  declare action: string;
  declare entity_name: string;
  declare entity_id: string | null;
  declare values: unknown;
  declare error_values: unknown;
  declare ip_address: string | null;
  declare user_agent: string | null;
  declare registration_date: Date;
}

export function initAuditLog(sequelize: Sequelize) {
  AuditLogModel.init(
    {
      audit_log_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
      },
      fk_user: { type: DataTypes.INTEGER, allowNull: true },
      action: { type: DataTypes.STRING(30), allowNull: false },
      entity_name: { type: DataTypes.STRING(100), allowNull: false },
      entity_id: { type: DataTypes.STRING(100), allowNull: true },
      values: { type: DataTypes.JSONB, allowNull: true },
      error_values: { type: DataTypes.JSONB, allowNull: true },
      ip_address: { type: DataTypes.INET, allowNull: true },
      user_agent: { type: DataTypes.TEXT, allowNull: true },
      registration_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'audit_log',
      tableName: 'audit_log',
      timestamps: false,
      indexes: [
        {
          name: 'idx_audit_log_date',
          unique: false,
          fields: [{ name: 'registration_date', order: 'DESC' }],
        },
        {
          name: 'idx_audit_log_entity',
          unique: false,
          fields: ['entity_name', 'entity_id'],
        },
        { name: 'idx_audit_log_user', unique: false, fields: ['fk_user'] },
      ],
    },
  );
  return AuditLogModel;
}
