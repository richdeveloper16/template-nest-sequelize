import type { Sequelize } from 'sequelize';
import { initAuditLog } from './audit_log.model';
import { initUsers } from './users.model';

export function initModels(sequelize: Sequelize) {
  return {
    audit_log: initAuditLog(sequelize),
    users: initUsers(sequelize),
  };
}
