# 🚀 Quick Start Guide - MediConnect Pro

Esta guía te ayudará a tener MediConnect Pro funcionando en tu máquina local en menos de 10 minutos.

## 📋 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- **Docker Desktop** (20.10+) - [Descargar aquí](https://www.docker.com/products/docker-desktop)
- **Docker Compose** (2.0+) - Incluido con Docker Desktop
- **Git** - [Descargar aquí](https://git-scm.com/downloads)
- **8GB RAM mínimo** (16GB recomendado)
- **20GB de espacio libre en disco**

### Verificar Instalación

```bash
# Verificar Docker
docker --version
# Debería mostrar: Docker version 20.10 o superior

# Verificar Docker Compose
docker-compose --version
# Debería mostrar: Docker Compose version 2.0 o superior

# Verificar Git
git --version
```

## 🎬 Inicio Rápido (3 Pasos)

### Paso 1: Clonar el Repositorio

```bash
git clone https://github.com/Federicojaviermartino/mediconnect-pro.git
cd mediconnect-pro
```

### Paso 2: Configurar Variables de Entorno

```bash
# Copiar el archivo de ejemplo
cp .env.example .env

# El archivo .env ya tiene valores predeterminados que funcionan
# No necesitas modificar nada para empezar
```

### Paso 3: Iniciar con Docker Compose

```bash
# Iniciar todos los servicios
docker-compose up -d

# Ver los logs (opcional)
docker-compose logs -f
```

**¡Eso es todo!** 🎉 El sistema se está iniciando.

## ⏱️ Tiempo de Inicio

La primera vez tomará más tiempo porque Docker descarga todas las imágenes:
- **Primera ejecución**: 10-15 minutos (descarga de imágenes + build)
- **Siguientes ejecuciones**: 2-3 minutos

## 🔍 Verificar que Todo Funciona

### Verificar el Estado de los Contenedores

```bash
docker-compose ps
```

Deberías ver todos los servicios en estado "Up":
- ✅ mediconnect-postgres
- ✅ mediconnect-mongodb
- ✅ mediconnect-redis
- ✅ mediconnect-kafka
- ✅ mediconnect-zookeeper
- ✅ mediconnect-mqtt
- ✅ mediconnect-auth-service
- ✅ mediconnect-patient-service
- ✅ mediconnect-vitals-service
- ✅ mediconnect-consultation-service
- ✅ mediconnect-ml-service
- ✅ mediconnect-api-gateway
- ✅ mediconnect-web
- ✅ mediconnect-nginx

### Verificar los Health Endpoints

```bash
# API Gateway
curl http://localhost:3000/health

# Auth Service
curl http://localhost:3001/health

# Patient Service
curl http://localhost:3002/health

# Vitals Service
curl http://localhost:3003/health

# Consultation Service
curl http://localhost:3004/health

# ML Service
curl http://localhost:8000/health
```

Todos deberían responder con `{"status":"ok"}` o similar.

## 🌐 Acceder a la Aplicación

Una vez que todos los servicios estén funcionando:

| Servicio | URL | Descripción |
|----------|-----|-------------|
| **Web App** | http://localhost:80 | Aplicación web principal |
| **Web App (directo)** | http://localhost:3100 | Acceso directo sin nginx |
| **API Gateway** | http://localhost:3000 | API principal |
| **API Documentation** | http://localhost:3000/api-docs | Swagger UI (si está configurado) |

### Documentación de APIs (Swagger)

- **Auth Service**: http://localhost:3001/api-docs
- **Patient Service**: http://localhost:3002/api-docs
- **Vitals Service**: http://localhost:3003/api-docs
- **Consultation Service**: http://localhost:3004/api-docs
- **ML Service**: http://localhost:8000/docs

## 🧪 Probar la API

### 1. Registrar un Usuario

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@mediconnect.com",
    "password": "SecurePass123!",
    "firstName": "Dr. John",
    "lastName": "Doe",
    "role": "DOCTOR"
  }'
```

### 2. Iniciar Sesión

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@mediconnect.com",
    "password": "SecurePass123!"
  }'
```

Esto te devolverá un `access_token` que puedes usar para las siguientes peticiones.

### 3. Acceder a un Endpoint Protegido

```bash
# Reemplaza YOUR_TOKEN con el token que recibiste
curl http://localhost:3000/api/patients \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📊 Datos de Prueba

### Usuarios Predefinidos (si se ejecutó el seed)

| Email | Password | Role |
|-------|----------|------|
| admin@mediconnect.com | Admin123! | ADMIN |
| doctor@mediconnect.com | Doctor123! | DOCTOR |
| patient@mediconnect.com | Patient123! | PATIENT |

*Nota: Los datos de prueba se generan automáticamente si existe un script de seed.*

## 🛠️ Comandos Útiles

### Ver Logs de un Servicio Específico

```bash
# Ver logs de auth-service
docker-compose logs -f auth-service

# Ver logs de todos los servicios
docker-compose logs -f

# Ver últimas 100 líneas
docker-compose logs --tail=100
```

### Reiniciar un Servicio

```bash
# Reiniciar auth-service
docker-compose restart auth-service

# Reiniciar todos los servicios
docker-compose restart
```

### Detener Todo

```bash
# Detener todos los servicios
docker-compose down

# Detener y eliminar volúmenes (CUIDADO: elimina los datos)
docker-compose down -v
```

### Reconstruir un Servicio

```bash
# Reconstruir y reiniciar auth-service
docker-compose up -d --build auth-service

# Reconstruir todo
docker-compose up -d --build
```

### Acceder a un Contenedor

```bash
# Acceder a postgres
docker exec -it mediconnect-postgres psql -U postgres -d mediconnect_auth

# Acceder a mongodb
docker exec -it mediconnect-mongodb mongosh -u root -p mongo123

# Acceder a redis
docker exec -it mediconnect-redis redis-cli

# Shell en un servicio
docker exec -it mediconnect-auth-service sh
```

## 🐛 Solución de Problemas

### Problema: Puerto ya en uso

**Error**: `Bind for 0.0.0.0:3000 failed: port is already allocated`

**Solución**:
```bash
# Encontrar qué proceso usa el puerto
netstat -ano | findstr :3000  # Windows
lsof -i :3000                  # Mac/Linux

# Detener el proceso o cambiar el puerto en docker-compose.yml
```

### Problema: Servicios no inician

**Solución**:
```bash
# Ver logs detallados
docker-compose logs

# Verificar recursos de Docker Desktop
# Settings → Resources → Asegúrate de tener al menos 4GB RAM asignados
```

### Problema: Error de conexión a base de datos

**Solución**:
```bash
# Esperar a que los servicios de base de datos estén listos
# Kafka y PostgreSQL pueden tomar 1-2 minutos en iniciar

# Verificar que las bases de datos estén corriendo
docker-compose ps postgres mongodb redis
```

### Problema: "Cannot connect to Docker daemon"

**Solución**:
- Asegúrate de que Docker Desktop está corriendo
- En Windows: Revisa que el servicio de Docker esté iniciado
- En Mac/Linux: `sudo systemctl start docker`

### Problema: Espacio en disco insuficiente

**Solución**:
```bash
# Limpiar imágenes y contenedores no usados
docker system prune -a

# Ver uso de espacio
docker system df
```

## 📈 Siguientes Pasos

1. **Explorar la API**: Usa Postman o Insomnia con las URLs de arriba
2. **Revisar la Documentación**: Lee [README.md](README.md) para entender la arquitectura
3. **Configurar Desarrollo Local**: Ver [DEVELOPMENT.md](DEVELOPMENT.md) para desarrollo sin Docker
4. **Ejecutar Tests**: `npm test` (requiere Node.js instalado localmente)
5. **Contribuir**: Lee [CONTRIBUTING.md](CONTRIBUTING.md)

## 🎯 Arquitectura del Sistema

```
┌─────────────────────────────────────────┐
│         Browser (http://localhost)      │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│         Nginx (Port 80)                 │
└────────┬───────────────────┬────────────┘
         │                   │
┌────────▼────────┐  ┌──────▼──────────┐
│  Web Frontend   │  │  API Gateway    │
│   (Port 3100)   │  │  (Port 3000)    │
└─────────────────┘  └────────┬─────────┘
                              │
        ┌─────────────────────┼──────────────────┐
        │         │           │          │       │
┌───────▼───┐ ┌──▼──────┐ ┌─▼────────┐ ┌▼──────▼─┐
│   Auth    │ │ Patient │ │  Vitals  │ │ Consult │
│  :3001    │ │  :3002  │ │  :3003   │ │  :3004  │
└───────────┘ └─────────┘ └──────────┘ └─────────┘
     │             │            │            │
┌────▼─────────────▼────────────▼────────────▼────┐
│      PostgreSQL    MongoDB    Redis    Kafka    │
└──────────────────────────────────────────────────┘
```

## 💡 Tips

- **Monitoreo**: Usa `docker stats` para ver uso de recursos
- **Logs en tiempo real**: `docker-compose logs -f <servicio>`
- **Reinicio automático**: Los servicios se reinician automáticamente si fallan
- **Variables de entorno**: Modifica `.env` para personalizar configuraciones
- **Datos persistentes**: Los datos se guardan en volúmenes Docker y persisten entre reinicios

## 🔐 Seguridad

**IMPORTANTE**: Los valores predeterminados en `.env.example` son solo para desarrollo local.

Para producción:
- Cambia TODAS las contraseñas
- Usa JWT_SECRET seguro (mínimo 32 caracteres aleatorios)
- Configura HTTPS con certificados SSL
- Revisa [PRODUCTION-CHECKLIST.md](PRODUCTION-CHECKLIST.md)

## 📞 Soporte

¿Problemas? Abre un issue en GitHub:
https://github.com/Federicojaviermartino/mediconnect-pro/issues

## 📚 Documentación Adicional

- [README.md](README.md) - Documentación completa
- [DEPLOYMENT.md](DEPLOYMENT.md) - Guía de despliegue
- [TESTING_GUIDE.md](TESTING_GUIDE.md) - Guía de testing
- [CONTRIBUTING.md](CONTRIBUTING.md) - Cómo contribuir
- [PRODUCTION-CHECKLIST.md](PRODUCTION-CHECKLIST.md) - Checklist de producción

---

**¡Disfruta explorando MediConnect Pro!** 🏥💻
