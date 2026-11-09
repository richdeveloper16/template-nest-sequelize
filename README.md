<div align="center">

# API NestJS · Sequelize

**Plantilla de API REST con TypeScript y PostgreSQL**

NestJS 11 · Sequelize 6 · TypeScript 5 · Swagger · Winston

[Inicio rápido](#inicio-rápido) · [Endpoints](#endpoints) · [Arquitectura](#arquitectura) · [Pruebas y calidad](#pruebas-y-calidad)

</div>

---

Base para desarrollar una API por módulos, con acceso a datos mediante repositorios,
validación de solicitudes, respuestas uniformes y documentación interactiva.
El módulo de usuarios (`user`) sirve como referencia para crear otros módulos.
El módulo de autenticación (`auth`) permite iniciar sesión y protege las rutas privadas.

Si es tu primera vez con el proyecto, sigue el inicio rápido en orden. Después,
consulta estas guías según lo que necesites:

- [Autenticación](docs/auth.md): crear el primer usuario, iniciar sesión y usar el token.
- [Desarrollo de módulos](docs/module-development.md): agregar funcionalidades siguiendo la estructura del proyecto.

## Características

| Área              | Implementación                                                  |
| ----------------- | --------------------------------------------------------------- |
| API HTTP          | NestJS 11 sobre Express                                         |
| Persistencia      | Sequelize 6 y PostgreSQL                                        |
| Validación        | DTO con `class-validator` y `class-transformer`                 |
| Documentación     | Swagger disponible en desarrollo                                |
| Observabilidad    | Winston, registro de solicitudes y archivos con rotación diaria |
| Manejo de errores | Filtro global con traducción de errores de base de datos        |
| Calidad           | Jest, Supertest, ESLint y Prettier                              |

## Inicio rápido

### 1. Preparar el entorno

Usa Node.js 24.15.0 (ver `.nvmrc`), npm 11 y PostgreSQL 17. Docker Compose
es opcional y permite levantar una base local con la configuración incluida.

Desde la raíz del proyecto:

```bash
npm ci
```

Copia la configuración de ejemplo. En PowerShell:

```powershell
Copy-Item .env.example .env
```

En Bash:

```bash
cp .env.example .env
```

### 2. Configurar las variables

Edita `.env` con los datos de tu entorno:

```dotenv
DATABASE_URL="postgresql://template:template_local@localhost:5432/template_dev"
NODE_ENV="development"
PORT=3000
JWT_SECRET=<pega-aqui-el-secreto-generado>
JWT_TTL_SECONDS=900
BCRYPT_ROUNDS=12
```

| Variable       | Uso                                                                                             |
| -------------- | ----------------------------------------------------------------------------------------------- |
| `DATABASE_URL` | URL de conexión a una base PostgreSQL existente.                                                |
| `NODE_ENV`     | Entorno de ejecución: `development`, `test` o `production`. Swagger se desactiva en producción. |
| `PORT`         | Puerto HTTP. El ejemplo utiliza `3000`.                                                         |

Genera un secreto JWT aleatorio antes de iniciar la aplicación:

`JWT_SECRET` permite firmar y validar los tokens de acceso. El valor del ejemplo
es un marcador que debes reemplazar por el resultado del siguiente comando:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Copia el resultado en `JWT_SECRET` de `.env`. Es obligatorio, debe contener al
menos 32 bytes y no debe compartirse entre entornos. La vigencia predeterminada
es `JWT_TTL_SECONDS=900` (15 minutos).

### 3. Preparar la base de datos

Con Docker y su motor en ejecución:

```bash
docker compose up -d --wait postgres
npm run db:migrate
```

Si ya tienes PostgreSQL, crea una base vacía, configura `DATABASE_URL` y ejecuta
`npm run db:migrate`. El comando carga `.env`, aplica archivos de
`database/migrations/` y registra su checksum en `schema_migrations`.

El [esquema SQL](docs/database/schema.sql) es una referencia de las tablas de dominio;
no lo ejecutes además de las migraciones. La migración inicial crea `users` y
`audit_log`, con sus columnas e índices.

> Para bases anteriores se requiere revisar y adaptar el DDL antes de adoptar
> las migraciones. El comando no modifica automáticamente tablas preexistentes.
> Consulta [Migraciones](CONTRIBUTING.md#migraciones).

`DatabaseService` registra los dos modelos y autentica la conexión al iniciar.
Al detener la aplicación, cierra el pool. Los cambios de esquema se aplican por
separado mediante SQL; la aplicación no ejecuta `sync`, `alter` ni `force`.

### 4. Crear el primer usuario

Sigue [Crear el primer usuario](docs/auth.md#crear-el-primer-usuario): compila y
ejecuta `npm run auth:create-user` con las variables `BOOTSTRAP_*` indicadas.
Las rutas de usuarios requieren autenticación y no existe registro público.
Este paso crea las credenciales que usarás para iniciar sesión; no asigna permisos
de administrador.

### 5. Iniciar la API

```bash
npm run start:dev
```

| Recurso | Dirección con `PORT=3000`        |
| ------- | -------------------------------- |
| API     | <http://localhost:3000>          |
| Swagger | <http://localhost:3000/api/docs> |

### 6. Iniciar sesión y probar una ruta privada

1. Abre Swagger y ejecuta `POST /auth/login` con el usuario y la contraseña creados.
2. Copia el valor de `data.access_token` de la respuesta.
3. Pulsa **Authorize**, pega el token y confirma.
4. Ejecuta `GET /auth/me` para consultar tu perfil o `GET /user` para listar usuarios.

Si utilizas otro cliente HTTP, envía el encabezado `Authorization: Bearer <access_token>`.
Cuando el token expire, vuelve a iniciar sesión para obtener uno nuevo.

## Contrato del módulo de usuarios

Al crear un usuario envía `fk_person`, `username` (2–50 caracteres) y
`password` (mínimo 12 caracteres y máximo 72 bytes UTF-8); `fk_user_type` es opcional y admite `null`.
La contraseña se guarda con bcrypt y salt aleatorio, y no se devuelve por HTTP.
`PATCH` admite únicamente `fk_person`, `fk_user_type`, `username` y `status`.
Las fechas de auditoría y los campos de bloqueo se controlan internamente.
Los campos que el DTO no permite se eliminan antes de procesar la solicitud
mediante la opción `whitelist` del validador global.

El módulo `auth` implementa login JWT y protege las rutas por defecto. Consulta
[Autenticación](docs/auth.md) para iniciar sesión y usar el token. Los permisos por
rol quedan pendientes de las reglas de cada proyecto. Los identificadores de persona
y tipo de usuario no tienen claves foráneas hasta incorporar sus dominios.

### Hash de contraseñas

Configura en `.env`:

```dotenv
BCRYPT_ROUNDS=12
```

`bcryptjs` es la única librería utilizada para generar y verificar hashes bcrypt.
`BCRYPT_ROUNDS` acepta enteros entre 10 y 15, con valor predeterminado 12.
El salt se genera automáticamente para cada contraseña.

Se usa `hashPassword` para crear hashes y `verifyPassword` para comprobarlos.
Las contraseñas que superan 72 bytes UTF-8 se rechazan para evitar truncamientos;
los caracteres acentuados y emojis pueden ocupar varios bytes.
Consulta la documentación de [bcryptjs](https://github.com/dcodeIO/bcrypt.js#security-considerations).

Los hashes `scrypt$v1$...` existentes conservan verificación compatible.
Los nuevos registros usan bcrypt. El login actualiza los hashes antiguos después
de verificar la contraseña, siempre que no supere 72 bytes UTF-8. No requiere
migración SQL ni modifica contraseñas sin un inicio de sesión válido.

## Endpoints

Las rutas se declaran sin un prefijo global. Consulta Swagger para ver los DTO,
los parámetros y las respuestas documentadas.

| Método  | Ruta              | Operación                                    |
| ------- | ----------------- | -------------------------------------------- |
| `GET`   | `/`               | Mensaje de bienvenida.                       |
| `POST`  | `/auth/login`     | Iniciar sesión y obtener un token de acceso. |
| `GET`   | `/auth/me`        | Consultar el perfil del usuario autenticado. |
| `POST`  | `/user`           | Registrar un usuario.                        |
| `GET`   | `/user`           | Consultar usuarios sin paginación.           |
| `GET`   | `/user/paginated` | Consultar usuarios con filtros y paginación. |
| `GET`   | `/user/:id`       | Consultar un usuario por identificador.      |
| `PATCH` | `/user/:id`       | Actualizar los campos enviados.              |

Las rutas de usuarios son privadas. Inicia sesión en `POST /auth/login` y usa el
`data.access_token` recibido. Consulta tu perfil en `GET /auth/me`.

Ejemplo de consulta paginada:

```bash
curl -H "Authorization: Bearer <access_token>" "http://localhost:3000/user/paginated?page=1&limit=10"
```

La paginación utiliza `page=1` y `limit=10` por defecto; el límite máximo es `100`.
Los parámetros declarados en el DTO de filtros son `user_id`, `fk_user_type`,
`username` y `status`.

### Respuestas HTTP

El interceptor global coloca el resultado de cada operación en `data` y agrega
información común, como el código HTTP y la fecha de la respuesta:

```json
{
  "success": true,
  "code": 200,
  "message": "Operación exitosa",
  "data": "Api NestJS!",
  "timestamp": "2026-11-06T18:00:00.000Z",
  "path": "/"
}
```

En errores, `success` es `false` y `data` es `null`. El filtro global traduce
conflictos de unicidad a `409` y errores de referencia, validación o datos inválidos
a `400`. Los errores internos se devuelven como `500`, sin exponer consultas ni
credenciales en la respuesta.

## Arquitectura

```text
Controller → Service → Repository → DatabaseService → PostgreSQL
                 ↓
               Mapper → DTO de respuesta
```

| Capa            | Responsabilidad                                       |
| --------------- | ----------------------------------------------------- |
| Controller      | Recibir solicitudes y declarar rutas y documentación. |
| Service         | Coordinar las operaciones del módulo.                 |
| Repository      | Encapsular las consultas a Sequelize.                 |
| Mapper          | Construir la representación pública de los datos.     |
| DatabaseService | Administrar la conexión y los modelos.                |

```text
src/
├── common/                 # DTO, contratos, filtros e interceptores compartidos
├── config/                 # Configuración HTTP, Swagger y Winston
├── database/
│   ├── models/             # Modelos users y audit_log
│   ├── database.module.ts
│   └── database.service.ts
├── modules/
│   ├── auth/               # Login, validación JWT y protección de rutas
│   ├── user/               # Controller, service, repository, mapper y DTO
│   └── modules.module.ts   # Registro de los módulos funcionales
├── app.module.ts
└── main.ts
docs/
├── database/schema.sql     # Definición SQL de las tablas
├── module-development.md   # Guía para desarrollar módulos
└── auth.md                 # Configuración y uso de la autenticación
test/                       # Pruebas HTTP e2e
```

Para extender el proyecto, consulta la
[guía de desarrollo de módulos](docs/module-development.md) y contrasta sus
convenciones con la implementación actual de `src/modules/user/`.

## Comandos de ejecución

| Comando               | Propósito                                        |
| --------------------- | ------------------------------------------------ |
| `npm run start`       | Iniciar con Nest CLI.                            |
| `npm run start:dev`   | Iniciar y observar cambios.                      |
| `npm run start:debug` | Iniciar con depuración y observación de cambios. |
| `npm run build`       | Compilar la aplicación en `dist/`.               |
| `npm run start:prod`  | Ejecutar la compilación con Node.js.             |

Para ejecutar el código compilado:

```bash
npm run build
npm run start:prod
```

Configura `NODE_ENV=production` en el entorno de despliegue; `start:prod` ejecuta
`dist/src/main.js` y no establece esa variable.

## Pruebas y calidad

Ejecuta estos comandos desde la raíz, después de instalar las dependencias.
Los argumentos que siguen a `--` se envían a la herramienta correspondiente.

### Pruebas

| Comando              | Propósito                                           |
| -------------------- | --------------------------------------------------- |
| `npm test`           | Ejecutar las pruebas unitarias `src/**/*.spec.ts`.  |
| `npm run test:watch` | Volver a ejecutar pruebas al detectar cambios.      |
| `npm run test:cov`   | Generar cobertura en `coverage/`.                   |
| `npm run test:debug` | Pausar Jest al inicio para conectar un depurador.   |
| `npm run test:e2e`   | Ejecutar las pruebas HTTP con `test/jest-e2e.json`. |

```bash
# Pruebas unitarias en un solo proceso.
npm test -- --runInBand

# Pruebas de un archivo específico.
npm test -- src/modules/user/repository/user.repository.spec.ts

# Reporte de cobertura.
npm run test:cov -- --runInBand
```

Ejecuta `npm run test:migrations` para verificar transacciones, historial inmutable
y reversión del ejecutor SQL mediante un cliente simulado. Esto no sustituye la
validación con PostgreSQL del workflow de CI.

Abre `coverage/lcov-report/index.html` para consultar las líneas y ramas cubiertas.
La configuración actual no exige un porcentaje mínimo.

Las e2e requieren una base exclusiva y aplican la misma configuración HTTP del
arranque. Prueban creación, hash persistido, filtros, actualización, unicidad y
validación e inicio de sesión; eliminan los usuarios creados al finalizar.

En PowerShell, prepara la base de pruebas:

```powershell
Copy-Item .env.test.example .env.test
docker compose --profile test up -d --wait postgres-test
$env:DATABASE_URL = 'postgresql://template:template_test@localhost:5433/template_test'
$env:NODE_ENV = 'test'
npm run db:migrate
npm run test:e2e -- --runInBand
Remove-Item Env:DATABASE_URL
Remove-Item Env:NODE_ENV
```

En Bash, exporta las mismas variables antes de migrar y usa `unset DATABASE_URL NODE_ENV`
al terminar. El lanzador e2e carga `.env.test` y exige `NODE_ENV=test`.
Las variables de la sesión tienen prioridad. No necesitas iniciar la API por separado.
El servicio `postgres-test` usa almacenamiento temporal y pierde los datos al
eliminar su contenedor.

<details>
<summary><strong>Modo watch y depuración</strong></summary>

En modo watch, pulsa `a` para ejecutar todas las pruebas, `p` para filtrar por
archivo, `t` para filtrar por nombre y `q` para salir. Si no hay historial de Git:

```bash
npm run test:watch -- --watchAll
```

Para depurar, conecta un depurador de Node al puerto `9229` y continúa la ejecución.
En Windows puedes invocar directamente el archivo JavaScript de Jest:

```bash
node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/jest/bin/jest.js --runInBand src/modules/user/repository/user.repository.spec.ts
```

</details>

### Formato y análisis estático

| Comando                         | Propósito                                   | ¿Modifica archivos? |
| ------------------------------- | ------------------------------------------- | ------------------- |
| `npm run lint`                  | Revisar TypeScript con ESLint.              | No                  |
| `npm run lint:fix`              | Aplicar correcciones automáticas de ESLint. | Sí                  |
| `npm run lint:file -- <ruta>`   | Revisar un archivo concreto.                | Solo con `--fix`    |
| `npm run format`                | Aplicar Prettier al proyecto.               | Sí                  |
| `npm run format:check`          | Comprobar el formato.                       | No                  |
| `npm run format:file -- <ruta>` | Aplicar Prettier a los archivos indicados.  | Sí                  |
| `npm run fix`                   | Ejecutar `format` y después `lint:fix`.     | Sí                  |
| `npm run verify`                | Ejecutar `format:check` y después `lint`.   | No                  |

Ejemplos por archivo:

```bash
npm run lint:file -- src/modules/user/user.service.ts
npm run lint:file -- src/modules/user/user.service.ts --fix
npm run format:file -- src/modules/user/user.service.ts
```

`verify` no compila ni ejecuta pruebas. `fix` aplica las correcciones disponibles;
algunos problemas requieren intervención manual. En ambos scripts, el segundo
paso se ejecuta únicamente si el primero termina correctamente.

### Antes de entregar cambios

```bash
npm run verify
npm test -- --runInBand
npm run test:migrations
npm run build
```

Con la base de pruebas preparada, ejecuta también las pruebas e2e. Usa `npm run fix`
durante el desarrollo cuando necesites aplicar formato y correcciones automáticas.

## Envío de correo

El proyecto incluye dependencias de Nodemailer y variables SMTP de ejemplo,
pero todavía no contiene un módulo de envío de correo. Para incorporar esta
funcionalidad, implementa el servicio y su configuración antes de utilizarlo
desde los módulos funcionales.

## Autenticación

Consulta la [guía de Auth](docs/auth.md) para JWT, provisión del primer usuario,
bloqueo temporal y uso de `@Public()` y `@CurrentUser()` en módulos nuevos.

## Trabajo en equipo

Consulta [CONTRIBUTING.md](CONTRIBUTING.md) para ramas, PR, responsabilidades,
migraciones y configuración de protección de `main`.
El workflow [CI](.github/workflows/ci.yml) comprueba formato, lint, pruebas,
compilación, migraciones y endpoints con PostgreSQL.

## Logs

Winston escribe en consola y en `logs/`, con compresión y rotación diaria:

| Archivo                  | Retención | Tamaño máximo por archivo |
| ------------------------ | --------- | ------------------------- |
| `application-%DATE%.log` | 14 días   | 20 MB                     |
| `errors-%DATE%.log`      | 30 días   | 20 MB                     |

---

<div align="center">

[Volver al inicio](#api-nestjs--sequelize)

</div>
