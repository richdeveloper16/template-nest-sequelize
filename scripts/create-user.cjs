/* Local provisioning only; credentials are never accepted through CLI arguments. */
require('dotenv').config({ quiet: true });
require('reflect-metadata');
const { NestFactory } = require('@nestjs/core');
const { plainToInstance } = require('class-transformer');
const { validate } = require('class-validator');
const { AppModule } = require('../dist/src/app.module');
const { UserService } = require('../dist/src/modules/user/user.service');
const {
  CreateUserDto,
} = require('../dist/src/modules/user/dto/create-user.dto');

async function main() {
  const dto = plainToInstance(CreateUserDto, {
    fk_person: Number(process.env.BOOTSTRAP_PERSON_ID),
    username: process.env.BOOTSTRAP_USERNAME,
    password: process.env.BOOTSTRAP_PASSWORD,
  });
  const errors = await validate(dto);
  if (errors.length)
    throw new Error(
      'Configura BOOTSTRAP_PERSON_ID, BOOTSTRAP_USERNAME y BOOTSTRAP_PASSWORD con valores válidos',
    );
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
    abortOnError: false,
  });
  try {
    const user = await app.get(UserService).save(dto);
    console.log(`Usuario creado: ${user.user_id}`);
  } finally {
    await app.close();
  }
}
main().catch(() => {
  console.error(
    'No se pudo crear el usuario. Revisa las variables BOOTSTRAP_*, JWT_SECRET, la conexión, las migraciones y la unicidad del usuario.',
  );
  process.exitCode = 1;
});
