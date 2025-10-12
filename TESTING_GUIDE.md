# 🧪 Guía de Pruebas - MediConnect Pro Auth Service

## 📋 Pre-requisitos

1. ✅ Dependencias instaladas (`npm install`) - **COMPLETADO**
2. ⏳ Docker Desktop iniciado y corriendo
3. ⏳ Contenedores Docker levantados
4. ⏳ Base de datos creada
5. ⏳ Auth Service corriendo

---

## 🚀 Pasos para Probar

### 1️⃣ Iniciar Docker Desktop

**Windows**: Busca "Docker Desktop" en el menú inicio y ejecútalo.

Espera hasta que veas el ícono de Docker en la bandeja del sistema y diga "Docker Desktop is running".

Verifica que Docker está corriendo:
```bash
docker ps
```

---

### 2️⃣ Levantar Contenedores

```bash
# Desde la raíz del proyecto
cd "c:\Users\feder\OneDrive\Escritorio\Federico 2025\Freelance_projects\mediconnect-pro"

# Levantar todos los contenedores
npm run docker:up

# O directamente con docker-compose
docker-compose -f infrastructure/docker/docker-compose.yml up -d
```

**Contenedores que se levantarán**:
- ✅ PostgreSQL (puerto 5432)
- ✅ TimescaleDB (puerto 5433)
- ✅ MongoDB (puerto 27017)
- ✅ Redis (puerto 6379)
- ✅ Kafka + Zookeeper (puertos 9092, 9093)
- ✅ Mosquitto MQTT (puertos 1883, 9001)
- ✅ Mailhog (puertos 1025, 8025)
- ✅ Kafka UI (puerto 8080)
- ✅ pgAdmin (puerto 5050)
- ✅ Mongo Express (puerto 8081)

**Verificar que todos están UP**:
```bash
docker ps
```

Deberías ver ~11 contenedores corriendo.

---

### 3️⃣ Crear Base de Datos

```bash
# Conectarse a PostgreSQL
docker exec -it mediconnect-postgres psql -U mediconnect_admin -d mediconnect_db

# Dentro de psql, ejecutar:
CREATE DATABASE mediconnect_auth;

# Verificar que se creó:
\l

# Salir:
\q
```

**Alternativa (una sola línea)**:
```bash
docker exec -it mediconnect-postgres psql -U mediconnect_admin -d mediconnect_db -c "CREATE DATABASE mediconnect_auth;"
```

---

### 4️⃣ Iniciar Auth Service

```bash
# Opción 1: Desde la raíz
npm run dev:auth

# Opción 2: Desde el directorio del servicio
cd services/auth-service
npm run dev
```

**Salida esperada**:
```
═══════════════════════════════════════════════════════
🔐 MediConnect Pro - Auth Service
═══════════════════════════════════════════════════════
Environment:    development
Server:         http://localhost:3001
API:            http://localhost:3001/api/v1
Health:         http://localhost:3001/health
Swagger Docs:   http://localhost:3001/api/docs
Process ID:     XXXX
═══════════════════════════════════════════════════════
✅ Auth Service is ready
```

Si ves errores de base de datos, verifica que:
- PostgreSQL está corriendo: `docker ps | grep postgres`
- La base de datos existe: paso 3

---

## 🧪 Pruebas de Endpoints

### Test 1: Health Check ✅

```bash
curl http://localhost:3001/health
```

**Respuesta esperada**:
```json
{
  "status": "healthy",
  "service": "auth-service",
  "version": "1.0.0",
  "uptime": 45.123,
  "timestamp": "2025-10-10T19:35:00.000Z",
  "checks": {
    "database": {
      "status": "up",
      "responseTime": "5ms"
    },
    "memory": {
      "heapUsed": "45MB"
    }
  }
}
```

---

### Test 2: Registrar Usuario (Doctor) ✅

```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"doctor@test.com\",
    \"password\": \"Test1234!\",
    \"confirmPassword\": \"Test1234!\",
    \"firstName\": \"John\",
    \"lastName\": \"Doe\",
    \"role\": \"doctor\",
    \"phoneNumber\": \"+1234567890\",
    \"acceptedTerms\": true
  }"
```

**Respuesta esperada**:
```json
{
  "user": {
    "id": "uuid-here",
    "email": "doctor@test.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "doctor",
    "status": "pending_verification",
    "emailVerified": false,
    "createdAt": "2025-10-10T19:35:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": "15m",
  "message": "Registration successful. Please verify your email."
}
```

**Guarda el `accessToken` para los siguientes tests.**

---

### Test 3: Login ✅

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"doctor@test.com\",
    \"password\": \"Test1234!\"
  }"
```

**Respuesta esperada**:
```json
{
  "user": {
    "id": "uuid-here",
    "email": "doctor@test.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "doctor"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": "15m"
}
```

---

### Test 4: Obtener Usuario Actual (con JWT) ✅

```bash
# Reemplaza YOUR_ACCESS_TOKEN con el token del login
curl http://localhost:3001/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Respuesta esperada**:
```json
{
  "id": "uuid-here",
  "email": "doctor@test.com",
  "role": "doctor",
  "status": "pending_verification"
}
```

---

### Test 5: Ver Perfil Completo ✅

```bash
curl http://localhost:3001/api/v1/users/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Respuesta esperada**:
```json
{
  "id": "uuid-here",
  "email": "doctor@test.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "doctor",
  "status": "pending_verification",
  "phoneNumber": "+1234567890",
  "emailVerified": false,
  "phoneVerified": false,
  "twoFactorEnabled": false,
  "createdAt": "2025-10-10T19:35:00.000Z",
  "updatedAt": "2025-10-10T19:35:00.000Z"
}
```

---

### Test 6: Actualizar Perfil ✅

```bash
curl -X PATCH http://localhost:3001/api/v1/users/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"firstName\": \"Jane\",
    \"phoneNumber\": \"+9876543210\"
  }"
```

---

### Test 7: Refresh Token ✅

```bash
# Reemplaza YOUR_REFRESH_TOKEN con el refreshToken del login
curl -X POST http://localhost:3001/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{
    \"refreshToken\": \"YOUR_REFRESH_TOKEN\"
  }"
```

**Respuesta esperada**:
```json
{
  "accessToken": "nuevo_access_token...",
  "refreshToken": "nuevo_refresh_token...",
  "expiresIn": "15m"
}
```

---

### Test 8: Registrar Admin (para probar endpoints de admin) ✅

```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"admin@test.com\",
    \"password\": \"Admin1234!\",
    \"confirmPassword\": \"Admin1234!\",
    \"firstName\": \"Admin\",
    \"lastName\": \"User\",
    \"role\": \"admin\",
    \"acceptedTerms\": true
  }"
```

---

### Test 9: Listar Usuarios (solo Admin) ✅

```bash
# Primero hacer login como admin y obtener el token
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"admin@test.com\",
    \"password\": \"Admin1234!\"
  }"

# Luego listar usuarios con el token de admin
curl "http://localhost:3001/api/v1/users?page=1&limit=10" \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
```

**Respuesta esperada**:
```json
{
  "users": [
    { "id": "...", "email": "doctor@test.com", ... },
    { "id": "...", "email": "admin@test.com", ... }
  ],
  "total": 2,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

---

### Test 10: Logout ✅

```bash
curl -X POST http://localhost:3001/api/v1/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Respuesta esperada**:
```json
{
  "message": "Logout successful"
}
```

Después del logout, el refresh token se elimina de la base de datos.

---

## 🎨 Probar con Swagger UI (Recomendado)

Abre en tu navegador:
```
http://localhost:3001/api/docs
```

Tendrás una interfaz gráfica interactiva para probar todos los endpoints sin usar curl.

---

## 🐛 Errores Comunes

### Error: "ECONNREFUSED localhost:5432"
**Causa**: PostgreSQL no está corriendo.
**Solución**:
```bash
docker ps | grep postgres
docker start mediconnect-postgres
```

### Error: "JWT secret not configured"
**Causa**: Variables de entorno no cargadas.
**Solución**: Verificar que existe `.env` en la raíz con:
```
JWT_SECRET=dev_jwt_secret_key_min_32_chars_long_12345678
```

### Error: "Port 3001 already in use"
**Causa**: Otro proceso usando el puerto.
**Solución**:
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

### Error: "Database mediconnect_auth does not exist"
**Causa**: No se creó la base de datos.
**Solución**: Ejecutar paso 3 de nuevo.

---

## ✅ Checklist de Pruebas

- [ ] Health check responde con status "healthy"
- [ ] Registro de usuario doctor exitoso
- [ ] Login exitoso y obtención de tokens
- [ ] Endpoint `/auth/me` funciona con JWT
- [ ] Ver perfil completo funciona
- [ ] Actualizar perfil funciona
- [ ] Refresh token funciona
- [ ] Registro de admin exitoso
- [ ] Listar usuarios (solo admin) funciona
- [ ] Logout funciona
- [ ] Swagger UI accesible en /api/docs

---

## 📊 Verificar Base de Datos

```bash
# Conectarse a PostgreSQL
docker exec -it mediconnect-postgres psql -U mediconnect_admin -d mediconnect_auth

# Ver tablas creadas:
\dt

# Ver usuarios registrados:
SELECT id, email, "firstName", "lastName", role, status, "emailVerified", "createdAt" FROM users;

# Salir:
\q
```

---

## 🎉 Si Todo Funciona

¡Felicidades! El Auth Service está funcionando correctamente.

**Próximos pasos**:
1. Probar más endpoints (forgot-password, reset-password)
2. Integrar con API Gateway
3. Continuar con Fase 2 (Patient Service, Vitals Service, etc.)

---

**Creado**: 2025-10-10
**Versión**: Auth Service v1.0.0
