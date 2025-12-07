# MediConnect Pro - Quick Start Guide

## 🚀 Inicio Rápido (5 minutos)

### 1. Instalar Dependencias

```bash
npm install
```

### 2. Configurar Variables de Entorno

#### Opción A: Usar modo demo (sin APIs reales)
```bash
# No necesitas hacer nada, funciona out-of-the-box con datos mock
npm start
```

#### Opción B: Habilitar AI real (recomendado)

1. Copia el archivo de ejemplo:
```bash
cp .env.example .env
```

2. Edita `.env` y añade tus API keys:

```env
# OpenAI (para transcripción y notas médicas)
OPENAI_API_KEY=sk-...tu-key-aquí...

# Anthropic (para triage y diagnóstico)
ANTHROPIC_API_KEY=sk-ant-...tu-key-aquí...

# Session secret (genera uno seguro)
SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
```

### 3. Iniciar el Servidor

```bash
npm start
```

El servidor estará disponible en: **http://localhost:3000**

---

## 🔑 Usuarios de Prueba

### Administrador
- **Email**: `admin@mediconnect.demo`
- **Password**: `Demo2024!Admin`

### Doctor
- **Email**: `dr.smith@mediconnect.demo`
- **Password**: `Demo2024!Doctor`

### Paciente
- **Email**: `john.doe@mediconnect.demo`
- **Password**: `Demo2024!Patient`

---

## 📋 Funcionalidades Disponibles

### ✅ Sin APIs (Modo Demo)
- ✅ Autenticación y autorización
- ✅ Gestión de pacientes
- ✅ Citas médicas
- ✅ Prescripciones
- ✅ Monitoreo de signos vitales
- ✅ Dashboard interactivo
- ⚠️ AI usa respuestas simuladas

### ✅ Con APIs de AI Configuradas
- ✅ Todo lo anterior +
- ✅ Transcripción de consultas (OpenAI Whisper)
- ✅ Generación automática de notas médicas (GPT-4)
- ✅ Reportes médicos inteligentes (GPT-4)
- ✅ Triage asistido por AI (Claude)
- ✅ Diagnóstico diferencial (Claude)

---

## 🗄️ Base de Datos

### Desarrollo (JSON - por defecto)
No requiere configuración. Los datos se guardan en `src/database/database.json`

### Producción (PostgreSQL - recomendado)

1. Instala PostgreSQL

2. Crea la base de datos:
```bash
createdb mediconnect
```

3. Configura en `.env`:
```env
USE_POSTGRES=true
DATABASE_URL=postgres://user:password@localhost:5432/mediconnect
```

4. Ejecuta migraciones:
```bash
npm run db:migrate
```

---

## 🧪 Testing

```bash
# Ejecutar todos los tests
npm test

# Ver cobertura
npm test -- --coverage

# Modo watch (desarrollo)
npm run test:watch
```

---

## 🔐 Obtener API Keys

### OpenAI
1. Ve a https://platform.openai.com/api-keys
2. Inicia sesión o crea cuenta
3. Clic en "Create new secret key"
4. Copia la key (empieza con `sk-...`)
5. **Importante**: Añade crédito a tu cuenta OpenAI

### Anthropic (Claude)
1. Ve a https://console.anthropic.com/
2. Inicia sesión o crea cuenta
3. Ve a "API Keys" en el menú
4. Clic en "Create Key"
5. Copia la key (empieza con `sk-ant-...`)

### Costos Estimados de AI
- **OpenAI GPT-4**: ~$0.03 por 1K tokens (~750 palabras)
- **Anthropic Claude**: ~$0.015 por 1K tokens
- **Estimado mensual** (100 consultas/mes): $5-15 USD

---

## 📊 Health Checks

Verifica que todo funcione:

```bash
# Health check completo
curl http://localhost:3000/health

# Liveness probe (Kubernetes)
curl http://localhost:3000/health/live

# Readiness probe (Kubernetes)
curl http://localhost:3000/health/ready

# Estado de AI
curl http://localhost:3000/api/ai/status
```

---

## 🚢 Desplegar a Producción

### Render.com (Recomendado - Gratis)

1. Push tu código a GitHub

2. Ve a https://render.com y crea cuenta

3. New → Web Service

4. Conecta tu repositorio

5. Configura:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment Variables**: Añade tus keys de `.env`

6. Clic en "Create Web Service"

### Variables de entorno en producción:
```
NODE_ENV=production
SESSION_SECRET=[genera-uno-seguro]
OPENAI_API_KEY=[tu-key]
ANTHROPIC_API_KEY=[tu-key]
DATABASE_URL=[tu-postgres-url]
USE_POSTGRES=true
```

---

## 🔧 Comandos Útiles

```bash
# Desarrollo
npm start                    # Iniciar servidor
npm run dev                  # Con auto-reload (si tienes nodemon)
npm test                     # Ejecutar tests

# Base de datos
npm run db:migrate          # Ejecutar migraciones
npm run db:migrate:status   # Ver estado de migraciones
npm run db:migrate:rollback # Revertir última migración

# Producción
npm run build              # Preparar para producción
```

---

## 📚 Documentación Completa

- **[TRANSFORMATION_SUMMARY.md](TRANSFORMATION_SUMMARY.md)** - Resumen de todas las funcionalidades
- **[API.md](API.md)** - Documentación completa de la API
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Arquitectura del sistema

---

## ⚠️ Solución de Problemas

### El servidor no inicia
```bash
# Verifica que el puerto 3000 esté libre
lsof -i :3000  # Mac/Linux
netstat -ano | findstr :3000  # Windows

# Mata el proceso si es necesario
```

### AI no funciona
```bash
# Verifica tus API keys
curl http://localhost:3000/api/ai/status

# Revisa los logs
# El servidor mostrará: "⚠️ No AI API keys configured"
```

### Tests fallan
```bash
# Limpia cache de Jest
npx jest --clearCache

# Ejecuta tests individualmente
npx jest src/__tests__/auth.test.js
```

---

## 🆘 Soporte

Si encuentras problemas:

1. Revisa los logs del servidor en la consola
2. Verifica el archivo `src/logs/app.log`
3. Consulta la documentación en `/docs`
4. Crea un issue en GitHub

---

## 🎉 ¡Listo!

Tu plataforma MediConnect Pro está lista para usar.

**Próximos pasos sugeridos:**
1. ✅ Configurar API keys de AI
2. ✅ Ejecutar tests: `npm test`
3. ✅ Explorar dashboards (Admin, Doctor, Paciente)
4. ✅ Probar funcionalidades de AI
5. ✅ Desplegar a staging/producción

**¿Necesitas ayuda?** Revisa [TRANSFORMATION_SUMMARY.md](TRANSFORMATION_SUMMARY.md) para ver todas las funcionalidades disponibles.
