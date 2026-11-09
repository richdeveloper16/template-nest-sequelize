<div align="center">

# Desarrollo de módulos · NestJS

**Guía para implementar dominios con una estructura consistente**

Controller · Service · Repository · Mapper · DTO

[Inicio rápido](#inicio-rápido) · [Estructura](#estructura-del-módulo) · [Contratos](#contrato-del-repositorio) · [Integración](#integración) · [Pruebas](#pruebas-y-calidad)

</div>

---

Esta guía define las responsabilidades, los contratos y el flujo de entrega de
los módulos funcionales. Utiliza el módulo `user` como referencia y permite que
varios desarrolladores trabajen en dominios distintos sin duplicar infraestructura.

Un módulo agrupa una funcionalidad de la API, por ejemplo, usuarios o productos.
En esta guía, `<modulo>` es un marcador: reemplázalo por el nombre de tu
funcionalidad y adapta los nombres de clases, archivos y rutas.

Consulta el [README](../README.md) para instalar el proyecto, configurar PostgreSQL
y conocer los comandos generales.

## Inicio rápido

1. Revisa el módulo `src/modules/user/` y los contratos compartidos de `src/common/`.
2. Confirma los campos y tipos del modelo en `src/database/models/`.
3. Crea tu carpeta en `src/modules/<modulo>/` con la estructura descrita abajo.
4. Implementa los DTO, la interfaz del repositorio, el repositorio, el mapper,
   el servicio y el controlador. Registra sus proveedores en `<modulo>.module.ts`.
5. Agrega pruebas de los comportamientos del dominio y verifica el módulo.
6. Entrega la carpeta y coordina su registro en `ModulesModule`.

> Si el dominio requiere tablas o columnas nuevas, coordina primero los cambios
> de modelos y SQL con el responsable de base de datos. La aplicación no crea ni
> actualiza tablas automáticamente.

## Estructura del módulo

El trabajo de cada desarrollador se concentra en:

```text
src/modules/<modulo>/
```

Estructura para módulos nuevos:

```text
<modulo>/
├── dto/
│   ├── create-<modulo>.dto.ts
│   ├── update-<modulo>.dto.ts
│   ├── <modulo>-filter.dto.ts
│   └── <modulo>-response.dto.ts
├── interfaces/
│   └── <modulo>-repository.interface.ts
├── mapper/
│   └── <modulo>.mapper.ts
├── repository/
│   ├── <modulo>.repository.ts
│   └── <modulo>.repository.spec.ts
├── <modulo>.controller.ts
├── <modulo>.module.ts
├── <modulo>.service.ts
└── <modulo>.service.spec.ts
```

Incluye filtros y paginación cuando el dominio los necesite. El módulo `user` utiliza esta misma convención, incluido `update-user.dto.ts`.

Un DTO define qué datos recibe o devuelve una operación. El repositorio consulta
la base de datos; el servicio aplica las reglas de negocio; el mapper selecciona
los campos que se devuelven al cliente. El controlador conecta ese flujo con una
ruta HTTP.

### Responsabilidades

```text
Solicitud HTTP → Controller → Service → Repository → DatabaseService → PostgreSQL
                                 ↓
                               Mapper → DTO de respuesta
```

| Componente | Responsabilidad                                               |
| ---------- | ------------------------------------------------------------- |
| Controller | Declarar rutas, recibir DTO y documentar las operaciones.     |
| Service    | Aplicar reglas de negocio y coordinar consultas y respuestas. |
| Repository | Construir consultas y devolver atributos planos del modelo.   |
| Interface  | Definir las operaciones y tipos del repositorio.              |
| Mapper     | Seleccionar y transformar los campos de la respuesta pública. |
| DTO        | Definir entradas, filtros y salidas documentadas de la API.   |
| Module     | Registrar controladores y proveedores del dominio.            |

### Infraestructura compartida

Reutiliza estos componentes al crear un módulo. Si necesitas modificarlos,
coordina el cambio con el responsable de integración:

| Recurso                               | Ubicación                                                       |
| ------------------------------------- | --------------------------------------------------------------- |
| Conexión y modelos registrados        | `src/database/`                                                 |
| Contrato base del repositorio         | `src/common/interfaces/repository/base-repository.interface.ts` |
| Contratos de respuesta y paginación   | `src/common/interfaces/`                                        |
| Filtro e interceptores globales       | `src/common/filters/` y `src/common/interceptors/`              |
| Configuración HTTP, Swagger y Winston | `src/config/`                                                   |
| Arranque y módulo raíz                | `src/main.ts` y `src/app.module.ts`                             |
| Reglas de calidad                     | Configuración de ESLint y Prettier en la raíz                   |

Los cambios necesarios en estos recursos se coordinan con el responsable de
integración, al igual que los cambios de esquema y modelos.

## DTO y validación

| DTO                   | Contenido                                                       |
| --------------------- | --------------------------------------------------------------- |
| `Create<Modulo>Dto`   | Campos aceptados al crear un registro.                          |
| `Update<Modulo>Dto`   | Campos modificables; opcionales para actualizaciones parciales. |
| `<Modulo>FilterDto`   | Filtros permitidos y parámetros de paginación.                  |
| `<Modulo>ResponseDto` | Campos públicos y tipos de salida.                              |

Usa decoradores de `class-validator` para las restricciones de entrada y de
`class-transformer` para conversiones explícitas. Documenta campos obligatorios
con `@ApiProperty` y opcionales con `@ApiPropertyOptional`.

La aplicación configura `ValidationPipe` con `whitelist: true` y `transform: true`:
los campos de entrada deben tener decoradores de validación para conservarse.
Los decoradores de Swagger documentan el contrato, pero no validan los valores.

`whitelist` elimina los campos no declarados para validación y `transform`
convierte la entrada en una instancia del DTO, aplicando las conversiones configuradas.

Para consultas paginadas, extiende `PaginationQueryDto` de
`src/common/dto/pagination/pagination-query.dto.ts`. Este contrato define
`page=1`, `limit=10` y un máximo de `100` elementos por página.

## Contrato del repositorio

El contrato específico extiende `IBaseRepository` y declara las consultas
adicionales del dominio. Esta es la forma utilizada por `user`, desde
`interfaces/user-repository.interface.ts`:

```ts
import type { IBaseRepository } from '../../../common/interfaces/repository/base-repository.interface';
import type { PaginatedResult } from '../../../common/interfaces/pagination/paginated-result.interface';
import type { UsersAttributes } from '../../../database/models/users.model';
import type { CreateUserDto } from '../dto/create-user.dto';
import type { UpdateUserDto } from '../dto/update-user.dto';
import type { UserFilterDto } from '../dto/user-filter.dto';

export interface IUserRepository extends IBaseRepository<
  UsersAttributes,
  CreateUserDto,
  UpdateUserDto
> {
  findAllPaginated(
    filters: UserFilterDto,
  ): Promise<PaginatedResult<UsersAttributes>>;
}
```

### Operaciones base

| Método             | Retorno              | Comportamiento                                                                      |
| ------------------ | -------------------- | ----------------------------------------------------------------------------------- |
| `save(data)`       | `Promise<T>`         | Crear y devolver los atributos del registro.                                        |
| `findAll()`        | `Promise<T[]>`       | Consultar la colección.                                                             |
| `findById(id)`     | `Promise<T \| null>` | Devolver el registro o `null` si no existe.                                         |
| `update(id, data)` | `Promise<T>`         | Actualizar y devolver el registro; lanzar `NotFoundException` si no existe.         |
| `remove(id)`       | `Promise<T>`         | Eliminar y devolver los atributos previos; lanzar `NotFoundException` si no existe. |

El contrato base incluye `remove`, aunque el controlador del dominio no exponga
necesariamente una ruta de eliminación.

### Implementación y persistencia

El repositorio implementa su interfaz y es el único componente del módulo que
accede directamente a `DatabaseService`.

| Regla                     | Aplicación                                                                   |
| ------------------------- | ---------------------------------------------------------------------------- |
| Acceso a modelos          | Consultar `database.models.<modelo>`.                                        |
| Resultado plano           | Usar `raw: true` o `instance.get({ plain: true })`.                          |
| Campos permitidos         | Construir explícitamente los valores de creación y actualización.            |
| Actualizaciones parciales | Comprobar `!== undefined` para conservar valores válidos como `false` y `0`. |
| Paginación                | Aplicar `offset`, `limit` y un orden estable.                                |
| Transacciones             | Usarlas cuando varias operaciones deban completarse como una unidad.         |

Devuelve los resultados paginados con el contrato compartido:

```ts
export interface PaginatedResult<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
```

Importa el contrato existente desde
`src/common/interfaces/pagination/paginated-result.interface.ts`; el ejemplo
muestra su forma, no una interfaz que deba duplicarse en el módulo.

`items` contiene los registros de la página solicitada. `meta` indica la página
actual, el límite, los totales y si hay páginas anteriores o siguientes.

## Servicio y mapper

El patrón actual registra el repositorio concreto como proveedor y lo inyecta en
el servicio. La interfaz define el contrato que implementa ese repositorio;
las interfaces de TypeScript no son tokens de inyección en tiempo de ejecución.

Ejemplo de consulta, siguiendo `UserService`:

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from './repository/user.repository';
import { UserMapper } from './mapper/user.mapper';
import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async findById(id: number): Promise<UserResponseDto> {
    const entity = await this.userRepository.findById(id);
    if (!entity) throw new NotFoundException('Usuario no encontrado');
    return UserMapper.toResponse(entity);
  }
}
```

El servicio concentra las reglas de negocio y transforma las entidades mediante
el mapper. En consultas paginadas, transforma `items` y conserva `meta`.

El mapper construye explícitamente la respuesta: selecciona los campos públicos,
excluye contraseñas y otros datos internos y convierte las fechas al formato
establecido por el DTO. El módulo `user` utiliza `toResponse` y `toResponseList`.

## Controlador y documentación

Mantén el controlador centrado en el contrato HTTP: recibe los DTO y delega en
el servicio. Usa `ParseIntPipe` para identificadores enteros y `@Query()` para
los filtros validados.

El proyecto dispone del decorador `ApiCrud` en
`src/common/decorators/api-endpoint.decorator.ts`. Reutilízalo para documentar
las respuestas, los errores y las operaciones paginadas, siguiendo
`src/modules/user/user.controller.ts`.

| Aspecto               | Convención                                                                      |
| --------------------- | ------------------------------------------------------------------------------- |
| Rutas                 | Declararlas en `@Controller` y en los decoradores de cada método.               |
| Actualización parcial | Usar `PATCH` con el DTO de actualización.                                       |
| Respuestas            | Devolver los datos del servicio; el interceptor global construye el envoltorio. |
| Errores de dominio    | Lanzar excepciones HTTP de Nest cuando corresponda.                             |
| Errores de Sequelize  | Permitir que el filtro global traduzca los errores de persistencia.             |
| Documentación         | Mantener descripciones, DTO y códigos HTTP alineados con el comportamiento.     |

No agregues un segundo envoltorio `ApiResponse` en cada controlador. Swagger está
disponible en `/api/docs` cuando `NODE_ENV` no es `production`.

## Registro del módulo

`DatabaseModule` es global: no es necesario importar ni registrar de nuevo
`DatabaseService` dentro de cada módulo funcional.

```ts
import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserRepository } from './repository/user.repository';

@Module({
  controllers: [UserController],
  providers: [UserService, UserRepository],
  exports: [UserService, UserRepository],
})
export class UserModule {}
```

Exporta los proveedores que deban consumirse desde otros módulos. El ejemplo
refleja el registro actual de `UserModule`.

## Integración

El desarrollador entrega su carpeta completa. El responsable de integración
importa el módulo en `src/modules/modules.module.ts` y lo agrega a `imports`,
conservando los módulos existentes:

```ts
import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [UserModule, AuthModule],
})
export class ModulesModule {}
```

Los módulos funcionales se integran mediante `ModulesModule`. No se agregan
directamente a `AppModule`.

El ejemplo muestra los módulos actuales. Para integrar el tuyo, agrega su
`import` y su clase a la lista `imports`, junto a `UserModule` y `AuthModule`.

### Responsabilidad sobre el esquema

Los modelos de `src/database/models/`, su registro en `initModels` y los archivos
SQL son recursos compartidos. Coordina los cambios con el responsable de base de
datos para evitar definiciones incompatibles entre módulos.

Revisa que columnas, tipos, valores por defecto y restricciones coincidan entre
modelo y base de datos. Para cambiar tablas, columnas o índices, agrega una
migración SQL en `database/migrations/` y aplícala con `npm run db:migrate`.
Actualiza también `docs/database/schema.sql` como referencia del esquema;
ese archivo no se ejecuta además de las migraciones.

## Pruebas y calidad

### Comportamientos que deben cubrirse

| Área            | Verificación                                                               |
| --------------- | -------------------------------------------------------------------------- |
| Servicio        | Reglas de negocio y transformación de respuestas con repositorio simulado. |
| Existencia      | Respuesta esperada cuando el registro no existe.                           |
| Repositorio     | Filtros, campos enviados y resultados con modelos de Sequelize simulados.  |
| Actualizaciones | Campos omitidos y valores válidos como `false` o `0`.                      |
| Paginación      | Desplazamiento, límite, orden y metadatos.                                 |
| Mapper          | Campos públicos y transformaciones relevantes del dominio.                 |
| Transacciones   | Confirmación o reversión cuando la operación lo requiera.                  |

Prueba los comportamientos que implementa el módulo. Evita pruebas que únicamente
repitan la estructura interna sin verificar un resultado observable.

Ejemplo de ejecución sobre el repositorio de referencia:

```bash
npm test -- src/modules/user/repository/user.repository.spec.ts --runInBand
```

### Antes de entregar cambios

```bash
npm run verify
npm test -- --runInBand
npm run build
```

| Comando                   | Qué valida                                             |
| ------------------------- | ------------------------------------------------------ |
| `npm run verify`          | Formato con Prettier y reglas de ESLint.               |
| `npm test -- --runInBand` | Pruebas unitarias en un solo proceso.                  |
| `npm run build`           | Compilación y comprobación de tipos mediante Nest CLI. |

Para aplicar correcciones automáticas durante el desarrollo:

```bash
npm run format:file -- docs/module-development.md
npm run lint:file -- src/modules/user/user.service.ts --fix
```

Las pruebas e2e requieren una base PostgreSQL de pruebas con las tablas preparadas.
Cuando corresponda validar la integración HTTP:

```bash
npm run test:e2e -- --runInBand
```

Consulta [Pruebas y calidad en el README](../README.md#pruebas-y-calidad) para
cobertura, depuración y configuración de las pruebas e2e.

## Correo compartido

El proyecto todavía no incluye `MailModule` ni `MailService`. Si tu dominio
necesita enviar correo, implementa primero un componente compartido que
centralice la configuración SMTP, el envío y las plantillas. Después, impórtalo
en los módulos que lo necesiten para evitar transportes duplicados.

## Autenticación de rutas

Todas las rutas Nest requieren token JWT por defecto mediante el guard global de
`AuthModule`. Usa `@Public()` solo en endpoints que deban ser anónimos, y
`@CurrentUser()` para obtener el perfil del usuario autenticado.
Documenta las rutas privadas con `@ApiBearerAuth()`.

Consulta [Auth](auth.md#integración-con-otros-módulos) para los imports y ejemplos.
El guard valida identidad y estado activo, pero no asigna permisos por rol.
Define la autorización del dominio antes de exponer operaciones con distintos
niveles de acceso.

## Coordinación del equipo

Consulta [CONTRIBUTING.md](../CONTRIBUTING.md) para el flujo de ramas y PR,
responsables de infraestructura y numeración de migraciones.

Usa `PaginatedResult<T>` tanto en catálogos como en otros dominios: la salida es
`items` y `meta`. Las fechas de las respuestas HTTP usan ISO 8601 en UTC,
por ejemplo, `2026-11-06T18:00:00.000Z`.
Para cambiar el esquema, agrega un SQL versionado en `database/migrations/`,
actualiza la referencia `docs/database/schema.sql` y ejecuta `npm run db:migrate`.
No edites migraciones aplicadas ni ejecutes el SQL de referencia además del historial.

En `user`, la creación aplica hash bcrypt antes de persistir. El DTO de actualización
excluye contraseña y campos internos de autenticación. La fecha de actualización
se genera en el servidor. Si agregas cambio de contraseña, define una operación
específica que valide y aplique hash; el repositorio no transforma secretos.

## Entrega del módulo

- [ ] Estructura del módulo completa y proveedores registrados.
- [ ] DTO de entrada, filtros y respuesta alineados con el dominio.
- [ ] Contrato del repositorio implementado y resultados planos.
- [ ] Reglas de negocio y casos de registro inexistente cubiertos.
- [ ] Mapper con selección explícita de campos públicos.
- [ ] Rutas y documentación Swagger coherentes.
- [ ] Pruebas, formato, análisis estático y compilación verificados.
- [ ] Cambios de modelos, SQL e integración comunicados a sus responsables.

---

<div align="center">

[Volver al inicio](#desarrollo-de-módulos--nestjs) · [README del proyecto](../README.md)

</div>
