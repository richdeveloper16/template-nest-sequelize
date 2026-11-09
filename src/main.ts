import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { setupSwagger } from './config/swagger.config';
import { winstonLogger } from './config/winston.config';
import { configureApp } from './config/app.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: winstonLogger,
  });

  configureApp(app);
  setupSwagger(app);

  await app.listen(app.get(ConfigService).getOrThrow<number>('PORT'));
}
void bootstrap();
