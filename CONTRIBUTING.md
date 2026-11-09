# Colaborar en el template

Cada cambio parte de una rama corta desde `main` y se entrega mediante un pull
request. Usa nombres como `feat/user-filter` o `fix/environment-validation`.

## Reparto del trabajo

| Área                                                  | Responsable de coordinación  |
| ----------------------------------------------------- | ---------------------------- |
| `src/modules/<modulo>/`                               | Desarrollador del dominio    |
| `src/common/`, `src/config/`, arranque y dependencias | Responsable de integración   |
| Modelos, `initModels` y migraciones                   | Responsable de base de datos |
| `ModulesModule`                                       | Responsable de integración   |

Acuerden los responsables al iniciar el proyecto. La coordinación no impide
proponer cambios compartidos: inclúyelos explícitamente en el alcance del PR.
Consulta la [guía de módulos](docs/module-development.md).

## Entorno y contratos

- Usa Node de `.nvmrc`, `npm ci` y conserva `package-lock.json`.
- Cada desarrollador usa su propia base; las e2e usan otra base exclusiva.
- Las respuestas paginadas usan `PaginatedResult<T>` (`items` y `meta`).
- Los timestamps HTTP se expresan como ISO 8601 UTC.
- Los módulos se consumen mediante sus proveedores exportados; no importes el
  repositorio interno de otro dominio para evitar su servicio.
- No agregues paquetes sin explicar su propósito en el PR.

## Migraciones

Ejecuta `npm run db:migrate` con `DATABASE_URL` configurada. El comando carga `.env`
y respeta las variables de la sesión. Cada archivo se aplica en una transacción;
el historial guarda su checksum y un bloqueo de PostgreSQL serializa ejecuciones.

Crea archivos `database/migrations/0002_descripcion.sql`, con prefijos numéricos de
igual longitud y en orden. Coordina la numeración antes de fusionar ramas.
No edites ni elimines migraciones ya aplicadas: agrega una nueva corrección.
No incluyas `BEGIN`, `COMMIT` ni operaciones incompatibles con una transacción.

Actualiza también `docs/database/schema.sql` para mantener una referencia del
esquema final. En bases nuevas se ejecutan las migraciones, no ambos métodos.

La migración inicial está destinada a bases vacías. Para una base previa,
compara su DDL y prepara con el responsable una migración de adaptación y un
baseline revisado. No borres tablas ni marques migraciones como aplicadas sin
comprobar que el esquema coincide. El comando no adopta bases existentes.

`fk_person` y `fk_user_type` son identificadores de ejemplo: el template no
incluye esos dominios ni crea claves foráneas hacia tablas inexistentes. Define
esas relaciones con una migración cuando incorpores los módulos correspondientes.

## Antes de solicitar revisión

```bash
npm run verify
npm test -- --runInBand
npm run test:migrations
npm run build
```

Ejecuta las e2e con una base de pruebas preparada. El workflow de CI levanta
PostgreSQL, aplica las migraciones y ejecuta esas comprobaciones.

El PR debe explicar el problema, el comportamiento resultante, las comprobaciones
realizadas y cualquier cambio de esquema o contrato HTTP. Divide cambios grandes
por dominio y evita reformateos ajenos al alcance.

El administrador del repositorio debe configurar protección de `main`, requerir
el job `verify` del workflow `CI` y al menos una aprobación. Estas reglas se
activan en el alojamiento Git; incluir el workflow no las activa por sí solo.
