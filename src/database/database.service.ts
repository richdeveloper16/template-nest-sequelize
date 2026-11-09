import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Sequelize } from 'sequelize';
import { initModels } from './models';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  readonly sequelize: Sequelize;
  readonly models: ReturnType<typeof initModels>;

  constructor(config: ConfigService) {
    this.sequelize = new Sequelize(config.getOrThrow<string>('DATABASE_URL'), {
      dialect: 'postgres',
      logging: false,
    });
    this.models = initModels(this.sequelize);
  }

  async onModuleInit() {
    await this.sequelize.authenticate();
  }

  async onModuleDestroy() {
    await this.sequelize.close();
  }
}
