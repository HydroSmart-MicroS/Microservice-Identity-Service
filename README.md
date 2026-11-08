# Identity

Cuentas Better Auth, sesiones/JWT ES256, perfiles propietario/inquilino, consulta interna de usuarios y outbox.

DDD: application/internal, domain/model y domain/services, infrastructure, interfaces/acl e interfaces/rest.
La base es exclusiva de este contexto. Consultas de configuración y colaboración entre servicios usan RabbitMQ RPC;
los cambios pasan por outbox y los consumidores confirman después de procesar.

## Operación en MAIN

En la red de Compose, el servicio escucha en `identity:8080` y utiliza la base `hs_identity`.

| Comprobación | Ruta interna |
|---|---|
| Proceso | `GET /health/live` |
| Disponibilidad | `GET /health/ready` |

Readiness verifica PostgreSQL y RabbitMQ. Revisa el resultado en el [panel de MAIN](http://127.0.0.1:8099/). Tras arrancar, comprueba la publicación de claves en /api/auth/jwks a través del Gateway. Las sesiones y el outbox se guardan en hs_identity.

Construye y ejecuta las pruebas del Dockerfile desde este clon con `docker build -t hydrosmart-identity .`. Para la prueba conjunta, ejecuta `./scripts/Test-Local.ps1 -DatabaseMode Hosted` desde la carpeta de orquestación.
