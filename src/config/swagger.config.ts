import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as packageJson from '../../package.json';

export function setupSwagger(app: INestApplication): void {
  if (app.get(ConfigService).get<string>('NODE_ENV') === 'production') return;
  const config = new DocumentBuilder()
    .setTitle('API NestJS · Sequelize')
    .setDescription(
      'Template modular con autenticación JWT. Inicia sesión en /auth/login y utiliza Authorize para acceder a las rutas protegidas. No incluye permisos por rol.',
    )
    .setVersion(packageJson.version)
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
}
