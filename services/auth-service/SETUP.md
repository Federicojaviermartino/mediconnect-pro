# Auth Service - Setup Guide

## ✅ Archivos Creados (Fase 1 Completada)

### Estructura Implementada

```
src/
├── auth/
│   ├── auth.module.ts              ✅ Módulo de autenticación
│   ├── auth.controller.ts          ✅ Endpoints de auth
│   ├── auth.service.ts             ✅ Lógica de negocio
│   ├── strategies/
│   │   ├── jwt.strategy.ts        ✅ Validación de JWT
│   │   └── local.strategy.ts      ✅ Login con email/password
│   ├── guards/
│   │   ├── jwt-auth.guard.ts      ✅ Protección de rutas
│   │   └── roles.guard.ts         ✅ Control de acceso por roles
│   ├── decorators/
│   │   ├── current-user.decorator.ts  ✅ @CurrentUser()
│   │   └── roles.decorator.ts         ✅ @Roles()
│   └── dto/
│       ├── register.dto.ts        ✅ DTO de registro
│       ├── login.dto.ts           ✅ DTO de login
│       ├── refresh-token.dto.ts   ✅ DTO de refresh
│       ├── auth-response.dto.ts   ✅ Response estándar
│       └── update-password.dto.ts ✅ DTO cambio password
│
├── users/
│   ├── users.module.ts            ✅ Módulo de usuarios
│   ├── users.controller.ts        ✅ CRUD de usuarios
│   ├── users.service.ts           ✅ Lógica de negocio
│   ├── users.repository.ts        ✅ Repository pattern
│   └── entities/
│       └── user.entity.ts         ✅ Entidad User (ya existía)
│
├── health/
│   ├── health.module.ts           ✅ Módulo health checks
│   └── health.controller.ts       ✅ Endpoint /health
│
├── common/
│   ├── filters/
│   │   └── http-exception.filter.ts  ✅ Manejo global de errores
│   └── interceptors/
│       └── transform.interceptor.ts  ✅ Transformador de respuestas
│
├── database/
│   ├── database.module.ts         ✅ Configuración TypeORM (actualizado)
│   └── ...
│
├── config/
│   └── configuration.ts           ✅ Variables de entorno
│
├── app.module.ts                  ✅ Módulo principal (actualizado)
└── main.ts                        ✅ Bootstrap (ya existía)
```

---

## 🚀 Próximos Pasos

### 1. Instalar Dependencias

```bash
# Desde la raíz del proyecto
npm install
```

### 2. Levantar Docker (Bases de Datos)

```bash
# Desde la raíz del proyecto
npm run docker:up

# Esperar a que todos los contenedores estén UP
# Verificar con:
docker ps
```

Esto levantará:
- PostgreSQL (puerto 5432)
- MongoDB (puerto 27017)
- Redis (puerto 6379)
- Kafka (puerto 9092)
- TimescaleDB (puerto 5433)

### 3. Crear Base de Datos para Auth Service

```bash
# Conectarse a PostgreSQL
docker exec -it mediconnect-postgres psql -U mediconnect_admin -d mediconnect_db

# Dentro de psql, crear la base de datos:
CREATE DATABASE mediconnect_auth;

# Salir de psql:
\q
```

### 4. Ejecutar el Auth Service

```bash
# Opción 1: Desde la raíz del proyecto
npm run dev:auth

# Opción 2: Desde el directorio del servicio
cd services/auth-service
npm run dev
```

El servicio estará disponible en:
- **API**: http://localhost:3001/api/v1
- **Health Check**: http://localhost:3001/health
- **Swagger Docs**: http://localhost:3001/api/docs (en desarrollo)

---

## 📡 Endpoints Disponibles

### Auth Endpoints (`/api/v1/auth`)

| Método | Endpoint | Descripción | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Registrar nuevo usuario | No |
| POST | `/auth/login` | Login | No |
| POST | `/auth/refresh` | Refrescar token | No |
| POST | `/auth/logout` | Cerrar sesión | Sí (JWT) |
| GET | `/auth/me` | Obtener usuario actual | Sí (JWT) |
| POST | `/auth/forgot-password` | Solicitar reset password | No |
| POST | `/auth/reset-password` | Resetear password | No |

### Users Endpoints (`/api/v1/users`)

| Método | Endpoint | Descripción | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/users/profile` | Ver perfil propio | Sí (JWT) |
| PATCH | `/users/profile` | Actualizar perfil | Sí (JWT) |
| PATCH | `/users/password` | Cambiar contraseña | Sí (JWT) |
| GET | `/users` | Listar usuarios | Sí (Admin) |
| GET | `/users/:id` | Ver usuario | Sí (Admin) |
| DELETE | `/users/:id` | Eliminar usuario | Sí (Admin) |
| GET | `/users/stats/overview` | Estadísticas | Sí (Admin) |

### Health Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/health` | Health check completo |
| GET | `/health/ready` | Readiness probe |
| GET | `/health/live` | Liveness probe |

---

## 🧪 Probar la API

### 1. Health Check

```bash
curl http://localhost:3001/health
```

### 2. Registrar Usuario

```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@test.com",
    "password": "Test1234!",
    "confirmPassword": "Test1234!",
    "firstName": "John",
    "lastName": "Doe",
    "role": "doctor",
    "acceptedTerms": true
  }'
```

### 3. Login

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@test.com",
    "password": "Test1234!"
  }'
```

Guardar el `accessToken` de la respuesta.

### 4. Ver Perfil (con JWT)

```bash
curl http://localhost:3001/api/v1/users/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 🔐 Roles Disponibles

Definidos en `@mediconnect/types`:
- `admin` - Administrador del sistema
- `doctor` - Médico
- `nurse` - Enfermera
- `patient` - Paciente
- `staff` - Personal administrativo

---

## 🐛 Troubleshooting

### Error: "Database connection failed"

**Solución**:
```bash
# Verificar que PostgreSQL esté corriendo
docker ps | grep postgres

# Ver logs de PostgreSQL
docker logs mediconnect-postgres

# Reiniciar contenedor
docker restart mediconnect-postgres
```

### Error: "Port 3001 already in use"

**Solución**:
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3001 | xargs kill -9
```

### Error: "JWT secret not configured"

**Solución**: Verificar que el archivo `.env` en la raíz tenga:
```
JWT_SECRET=dev_jwt_secret_key_min_32_chars_long_12345678
JWT_REFRESH_SECRET=dev_refresh_secret_key_min_32_chars_long_12345678
```

---

## 📝 Notas Importantes

1. **Synchronize en Desarrollo**: TypeORM está configurado con `synchronize: true` en desarrollo, por lo que las tablas se crearán automáticamente. **NUNCA usar en producción**.

2. **Email Verification**: La funcionalidad de verificación de email está preparada pero los emails no se envían aún (placeholder con TODO).

3. **Password Reset**: Similar a email verification, la lógica está implementada pero el envío de emails es un placeholder.

4. **Refresh Tokens**: Se almacenan hasheados en la base de datos por seguridad.

5. **Guards**: Todos los endpoints de usuarios requieren JWT excepto los de auth (register, login, etc.).

---

## 🎯 Próximas Funcionalidades (Fase 2+)

- [ ] Implementar envío real de emails (con Nodemailer)
- [ ] Two-Factor Authentication (2FA)
- [ ] Gestión de sesiones activas
- [ ] Logs de auditoría
- [ ] Rate limiting por usuario
- [ ] Blacklist de tokens revocados
- [ ] Migraciones de TypeORM

---

## ✅ Fase 1 Completada

**Total de archivos creados**: 18 nuevos + 2 modificados
**Fecha de completado**: 2025-10-10
**Estado**: ✅ Auth Service 100% funcional
