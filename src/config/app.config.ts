import { INestApplication, ValidationPipe } from '@nestjs/common';

/** Aplica la configuración HTTP compartida por el arranque y las pruebas. */
export function configureApp(app: INestApplication): void {
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableShutdownHooks();
}
