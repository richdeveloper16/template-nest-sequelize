import { DataTypes, Model, type Optional, type Sequelize } from 'sequelize';

export interface UsersAttributes {
  user_id: number;
  fk_person: number;
  fk_user_type: number | null;
  username: string;
  password: string;
  last_login: Date | null;
  failed_attempts: number;
  locked_until: Date | null;
  status: boolean;
  registration_date: Date;
  update_date: Date | null;
}

export type UsersCreationAttributes = Optional<
  UsersAttributes,
  | 'user_id'
  | 'fk_user_type'
  | 'last_login'
  | 'failed_attempts'
  | 'locked_until'
  | 'status'
  | 'registration_date'
  | 'update_date'
>;
export class UsersModel extends Model<
  UsersAttributes,
  UsersCreationAttributes
> {
  declare user_id: number;
  declare fk_person: number;
  declare fk_user_type: number | null;
  declare username: string;
  declare password: string;
  declare last_login: Date | null;
  declare failed_attempts: number;
  declare locked_until: Date | null;
  declare status: boolean;
  declare registration_date: Date;
  declare update_date: Date | null;
}

export function initUsers(sequelize: Sequelize) {
  UsersModel.init(
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
      },
      fk_person: { type: DataTypes.INTEGER, allowNull: false },
      fk_user_type: { type: DataTypes.INTEGER, allowNull: true },
      username: { type: DataTypes.STRING(50), allowNull: false },
      password: { type: DataTypes.TEXT, allowNull: false },
      last_login: { type: DataTypes.DATE, allowNull: true },
      failed_attempts: {
        type: DataTypes.SMALLINT,
        allowNull: false,
        defaultValue: 0,
      },
      locked_until: { type: DataTypes.DATE, allowNull: true },
      status: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      registration_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      update_date: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'users',
      tableName: 'users',
      timestamps: false,
      indexes: [
        { name: 'uk_users_person', unique: true, fields: ['fk_person'] },
        { name: 'uk_users_username', unique: true, fields: ['username'] },
        { name: 'idx_users_status', unique: false, fields: ['status'] },
        {
          name: 'idx_users_user_type',
          unique: false,
          fields: ['fk_user_type'],
        },
      ],
    },
  );
  return UsersModel;
}
