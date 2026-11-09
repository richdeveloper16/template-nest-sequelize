<div align="center">

# Autenticación · Auth

**Inicio de sesión con JWT y contraseñas bcrypt**

[Configuración](#configuración) · [Primer usuario](#crear-el-primer-usuario) · [Endpoints](#endpoints) · [Integración](#integración-con-otros-módulos)

</div>

---

El módulo `src/modules/auth/` comprueba el usuario y la contraseña en la tabla
`users`. Si las credenciales son válidas, devuelve un token JWT que el cliente
debe enviar en las solicitudes a rutas privadas.

Un guard global comprueba ese token antes de permitir el acceso. Las contraseñas
se almacenan como hashes bcrypt mediante `bcryptjs`: la API verifica el hash y
nunca devuelve la contraseña. El módulo utiliza los campos e índices del esquema
actual, por lo que no necesita una migración adicional a las del proyecto.

Para probar el flujo completo: configura el entorno, crea el primer usuario,
inicia la API, ejecuta `POST /auth/login` y usa el token en `GET /auth/me`.

## Configuración

Agrega a `.env` un secreto aleatorio propio y la vigencia del token:

```dotenv
JWT_SECRET=<secreto-aleatorio-de-al-menos-32-bytes>
JWT_TTL_SECONDS=900
BCRYPT_ROUNDS=12
```

Genera el secreto localmente y copia el resultado en `JWT_SECRET`:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

| Variable          | Uso                                                                             |
| ----------------- | ------------------------------------------------------------------------------- |
| `JWT_SECRET`      | Obligatoria. Mínimo 32 bytes; usa un valor aleatorio diferente en cada entorno. |
| `JWT_TTL_SECONDS` | Vigencia entre 60 y 86400 segundos; por defecto, 900 (15 minutos).              |
| `BCRYPT_ROUNDS`   | Costo de los hashes nuevos, entre 10 y 15; por defecto, 12.                     |

Los secretos de `.env.test.example` y del workflow CI son exclusivos de pruebas.
Al cambiar `JWT_SECRET`, los tokens firmados con el valor anterior dejan de ser válidos.

## Crear el primer usuario

No hay registro público. Con PostgreSQL preparado y `.env` configurado, compila
y ejecuta el comando local de provisión. Ejemplo en PowerShell:

Antes de continuar, aplica las migraciones con `npm run db:migrate` y configura
`JWT_SECRET`. El comando crea el usuario directamente desde la aplicación y no
requiere que el servidor HTTP esté iniciado.

```powershell
npm run build
$env:BOOTSTRAP_PERSON_ID = '1'
$env:BOOTSTRAP_USERNAME = 'admin-local'
$env:BOOTSTRAP_PASSWORD = 'sustituye-por-una-clave-larga'
npm run auth:create-user
Remove-Item Env:BOOTSTRAP_PERSON_ID
Remove-Item Env:BOOTSTRAP_USERNAME
Remove-Item Env:BOOTSTRAP_PASSWORD
```

En Bash, exporta las mismas variables y elimínalas con `unset` al terminar.
`BOOTSTRAP_PERSON_ID` es el identificador de persona, `BOOTSTRAP_USERNAME` es el
nombre de usuario y `BOOTSTRAP_PASSWORD` es su contraseña inicial. Sustituye los
valores del ejemplo antes de ejecutar el comando.
El comando valida los datos, utiliza `UserService` para aplicar hash y crea un
usuario activo. No muestra la contraseña ni concede un rol administrativo:
`admin-local` es únicamente un nombre de ejemplo.

Los identificadores de persona deben ser únicos. La contraseña nueva debe tener
al menos 12 caracteres y ocupar como máximo 72 bytes UTF-8. El comando carga `.env`
y respeta los valores que ya existan en la sesión.

## Endpoints

| Método | Ruta                | Acceso     | Resultado                                   |
| ------ | ------------------- | ---------- | ------------------------------------------- |
| `GET`  | `/`                 | Público    | Bienvenida.                                 |
| `POST` | `/auth/login`       | Público    | Token de acceso y perfil público.           |
| `GET`  | `/auth/me`          | Bearer JWT | Perfil actualizado del usuario autenticado. |
| Todos  | `/user` y `/user/*` | Bearer JWT | Operaciones existentes de usuarios.         |

### Iniciar sesión

Inicia la API con `npm run start:dev`. Después, envía las credenciales del usuario
que creaste; el siguiente ejemplo muestra el cuerpo de la solicitud:

```http
POST /auth/login
Content-Type: application/json

{
  "username": "admin-local",
  "password": "sustituye-por-una-clave-larga"
}
```

Responde HTTP `200` con el envoltorio global de la API. Su campo `data` contiene:

```json
{
  "access_token": "<jwt-firmado>",
  "token_type": "Bearer",
  "expires_in": 900,
  "user": {
    "user_id": 1,
    "fk_person": 1,
    "fk_user_type": null,
    "username": "admin-local",
    "status": true,
    "registration_date": "2026-11-06T18:00:00.000Z"
  }
}
```

El campo `access_token` contiene el JWT y `expires_in` indica cuántos segundos
será válido. `user` contiene el perfil público del usuario.

El token incluye el identificador del usuario en `sub`, las fechas de emisión y
expiración, el emisor y la audiencia. El emisor identifica quién firma el token;
la audiencia indica para quién está destinado. No incluye la contraseña ni su hash.

### Consultar el perfil

```http
GET /auth/me
Authorization: Bearer <access_token>
```

En Swagger, abre **Authorize** y pega únicamente el valor de `access_token`.
Swagger agrega el encabezado Bearer a las solicitudes privadas. En otros clientes,
envía el encabezado completo que muestra el ejemplo. No envíes el token en la URL.

Cuando el token expire, vuelve a ejecutar `POST /auth/login` para obtener uno nuevo.

| Situación                                                          | HTTP                       |
| ------------------------------------------------------------------ | -------------------------- |
| DTO inválido                                                       | `400`                      |
| Credenciales incorrectas, cuenta desconocida, inactiva o bloqueada | `401` con mensaje uniforme |
| Token ausente, inválido, expirado o de otro emisor/audiencia       | `401`                      |
| Usuario del token eliminado o desactivado                          | `401`                      |

## Intentos fallidos y actualización de hashes

- Cinco contraseñas incorrectas bloquean la cuenta durante 15 minutos.
- Los intentos se actualizan dentro de una transacción con bloqueo de fila para
  serializar inicios de sesión simultáneos de la misma cuenta.
- Al vencer el bloqueo, la cuenta vuelve a permitir intentos de inicio de sesión.
- Un inicio de sesión válido reinicia el contador, elimina el bloqueo y actualiza
  `last_login` (fecha del último acceso).
- Las cuentas inexistentes también realizan una verificación de hash para reducir
  diferencias evidentes de tiempo de respuesta.
- Un hash scrypt válido se reemplaza por bcrypt después de verificar la contraseña.
  También se aumenta el costo de un hash bcrypt antiguo cuando corresponde.
- Las contraseñas scrypt que superan 72 bytes siguen verificándose sin truncamiento;
  necesitan un cambio de contraseña para migrarse a bcrypt.

Un bloqueo temporal impide nuevos inicios de sesión; no revoca tokens que ya
estén emitidos. Desactivar al usuario sí impide usar esos tokens en rutas privadas.

## Integración con otros módulos

El guard se registra mediante `APP_GUARD` en `AuthModule`. Todas las rutas Nest
nuevas requieren token, salvo que se declaren explícitamente públicas:

```ts
import { Public } from '../auth/decorators/public.decorator';

@Public()
@Get('public-info')
publicInfo() {
  return { available: true };
}
```

Para obtener el perfil cargado por el guard:

```ts
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserResponseDto } from '../user/dto/user-response.dto';

@Get('profile')
profile(@CurrentUser() user: UserResponseDto) {
  return user;
}
```

Documenta las rutas privadas con `@ApiBearerAuth()`. La consulta del usuario se
realiza en cada solicitud privada para detectar cuentas desactivadas o eliminadas.
Los errores de conexión se conservan como errores internos; no se convierten en
un falso error de credenciales.

## Alcance

Este módulo implementa autenticación. Los usuarios autenticados pueden acceder
a las rutas existentes de usuarios; no hay permisos por rol ni restricciones por
propietario. Define esas reglas antes de incorporar usuarios con distintos niveles
de acceso. `fk_user_type` no se interpreta como un rol.

La autenticación comprueba quién hace la solicitud. La autorización determina
qué operaciones puede realizar esa persona; esas reglas deben implementarse
según las necesidades del proyecto.

Los tokens son de acceso y expiran; no hay refresh token, cierre de sesión con
revocación, recuperación de contraseña ni MFA. El cliente puede eliminar su token,
pero este conserva validez hasta expirar mientras la cuenta siga activa.

El bloqueo por cuenta no sustituye límites por IP o límites en el proxy. Para
exponer la API, configura HTTPS y limita las solicitudes según tu despliegue.

## Pruebas

```bash
npm test -- src/modules/auth --runInBand
npm run verify
npm run build
```

Las pruebas HTTP de `src/modules/auth/` utilizan el guard y JWT reales con
persistencia simulada. Las e2e de `test/` usan PostgreSQL, crean sus usuarios de
prueba y los eliminan al finalizar. Consulta la preparación de la base de pruebas
en el [README](../README.md#pruebas-y-calidad).

Referencia de la librería: [NestJS JWT](https://github.com/nestjs/jwt).
