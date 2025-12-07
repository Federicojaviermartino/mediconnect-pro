# Manual de Usuario - Administrador
## MediConnect Pro

### Bienvenido a MediConnect Pro - Panel de Administración

Este manual está diseñado para administradores del sistema MediConnect Pro. Como administrador, tienes control total sobre usuarios, configuración del sistema, seguridad y monitoreo de la plataforma.

---

## Tabla de Contenidos

1. [Inicio de Sesión](#inicio-de-sesión)
2. [Panel de Administración](#panel-de-administración)
3. [Gestión de Usuarios](#gestión-de-usuarios)
4. [Gestión de Médicos](#gestión-de-médicos)
5. [Gestión de Pacientes](#gestión-de-pacientes)
6. [Configuración del Sistema](#configuración-del-sistema)
7. [Seguridad y Auditoría](#seguridad-y-auditoría)
8. [Monitoreo y Logs](#monitoreo-y-logs)
9. [Base de Datos](#base-de-datos)
10. [Reportes y Analytics](#reportes-y-analytics)
11. [Mantenimiento](#mantenimiento)
12. [Solución de Problemas](#solución-de-problemas)

---

## Inicio de Sesión

### Acceso Administrativo

1. Abre tu navegador web
2. Ve a: `http://tu-servidor.com/login.html`
3. Ingresa credenciales de administrador:
   - **Email**: `admin@mediconnect.demo`
   - **Contraseña**: `Demo2024!Admin`
4. Haz clic en **"Iniciar Sesión"**

### Primera Configuración

Al primer acceso:
1. **Cambia la contraseña por defecto** inmediatamente
2. Configura autenticación de dos factores (2FA)
3. Revisa la configuración de seguridad
4. Establece políticas de contraseñas
5. Configura backup automático

### Seguridad de Cuenta Admin

- ✅ Usa contraseñas muy fuertes (16+ caracteres)
- ✅ Habilita autenticación de dos factores
- ✅ No compartas credenciales administrativas
- ✅ Revisa logs de acceso regularmente
- ✅ Usa una cuenta de usuario normal para tareas diarias

---

## Panel de Administración

### Vista General del Dashboard

El dashboard administrativo muestra:

#### Métricas del Sistema
- **Total de usuarios**: Pacientes + Médicos + Admins
- **Usuarios activos**: Sesiones en las últimas 24 horas
- **Almacenamiento utilizado**: GB usados / disponibles
- **Uptime del sistema**: Tiempo sin interrupciones

#### Estado de Servicios
- **Base de datos**: ✅ Operativa / ⚠️ Degradada / ❌ Caída
- **Servidor de aplicaciones**: Estado actual
- **Servicios de AI**: OpenAI / Anthropic status
- **Backup automático**: Último backup exitoso

#### Alertas Recientes
- Intentos de acceso fallidos
- Errores del sistema
- Recursos del servidor (CPU, RAM, disco)
- Actualizaciones pendientes

### Navegación del Panel Admin

- 📊 **Dashboard**: Vista general
- 👥 **Users**: Gestión de usuarios
- 👨‍⚕️ **Doctors**: Gestión de médicos
- 🏥 **Patients**: Gestión de pacientes
- ⚙️ **Settings**: Configuración del sistema
- 🔐 **Security**: Seguridad y auditoría
- 📊 **Analytics**: Reportes y estadísticas
- 🛠️ **Maintenance**: Mantenimiento del sistema

---

## Gestión de Usuarios

### Ver Todos los Usuarios

1. Haz clic en **"Users"** en el menú lateral
2. Verás tabla con todos los usuarios:
   - ID de usuario
   - Nombre completo
   - Email
   - Rol (Admin, Doctor, Patient)
   - Estado (Active, Inactive, Suspended)
   - Último acceso

### Crear Nuevo Usuario

1. Haz clic en **"+ New User"**
2. Completa el formulario:
   - **Información Personal**:
     - Nombre completo
     - Email (único en el sistema)
     - Teléfono
   - **Rol**: Selecciona Admin, Doctor o Patient
   - **Contraseña temporal**: Genera automáticamente
   - **Enviar credenciales por email**: Checkbox
3. Haz clic en **"Create User"**
4. El usuario recibirá email con credenciales

### Editar Usuario Existente

1. En la lista de usuarios, haz clic en el email del usuario
2. Modifica campos necesarios:
   - Información personal
   - Cambiar rol
   - Restablecer contraseña
   - Activar/Desactivar cuenta
3. Haz clic en **"Save Changes"**

### Cambiar Rol de Usuario

Para promover o degradar roles:

1. Edita el usuario
2. Campo **"Role"**: Selecciona nuevo rol
   - **Admin**: Acceso total al sistema
   - **Doctor**: Acceso a pacientes y herramientas médicas
   - **Patient**: Acceso solo a su información personal
3. Confirma el cambio
4. **Importante**: Los cambios de rol toman efecto en el próximo inicio de sesión

### Suspender o Eliminar Usuarios

**Suspender temporalmente**:
1. Edita el usuario
2. Cambia estado a **"Suspended"**
3. El usuario no podrá iniciar sesión
4. Los datos se conservan

**Eliminar permanentemente**:
1. Haz clic en **"Delete"** junto al usuario
2. **Advertencia**: Esto eliminará toda la información asociada
3. Confirma la eliminación
4. Para cumplir normativas, considera anonimizar en lugar de eliminar

### Buscar y Filtrar Usuarios

- **Búsqueda por texto**: Nombre o email
- **Filtro por rol**: Admin, Doctor, Patient
- **Filtro por estado**: Active, Inactive, Suspended
- **Ordenar por**: Nombre, Fecha de registro, Último acceso

---

## Gestión de Médicos

### Registrar Nuevo Médico

1. **"Users"** → **"+ New User"**
2. Selecciona rol **"Doctor"**
3. Información adicional para médicos:
   - **Especialidad**: Cardiología, Pediatría, etc.
   - **Número de licencia médica**: Requerido
   - **Años de experiencia**
   - **Horario de atención**:
     - Días disponibles
     - Horas de inicio/fin
   - **Límite de pacientes**: Máximo de pacientes asignados
4. **Permisos especiales**:
   - Acceso a AI Assistant
   - Puede crear prescripciones
   - Puede acceder a Analytics
5. Haz clic en **"Create Doctor"**

### Asignar Pacientes a Médicos

**Asignación Manual**:
1. Ve a **"Doctors"** → Selecciona médico
2. Sección **"Assigned Patients"**
3. Haz clic en **"+ Assign Patient"**
4. Busca y selecciona paciente
5. Confirma asignación

**Asignación Automática**:
1. **"Settings"** → **"Auto-Assignment Rules"**
2. Configura reglas:
   - Por especialidad
   - Por disponibilidad
   - Por carga de trabajo
   - Por ubicación geográfica

### Monitorear Actividad de Médicos

1. **"Doctors"** → Selecciona médico
2. Vista **"Activity Dashboard"**:
   - Citas atendidas (hoy, semana, mes)
   - Pacientes activos
   - Prescripciones emitidas
   - Tiempo promedio de consulta
   - Calificación de pacientes (si está habilitado)

### Gestionar Horarios

1. Selecciona médico → **"Schedule"**
2. Configura:
   - **Horario regular**: Lunes a Viernes, 9am-5pm
   - **Días libres**: Vacaciones, conferencias
   - **Bloques no disponibles**: Reuniones, procedimientos
   - **Horario extendido**: Guardias, emergencias
3. Guarda cambios

---

## Gestión de Pacientes

### Ver Todos los Pacientes

1. **"Patients"** en el menú
2. Lista completa con:
   - Nombre
   - Email
   - Médico asignado
   - Última visita
   - Estado de salud (si se ha configurado)

### Registrar Nuevo Paciente

1. **"+ New Patient"**
2. **Información Personal**:
   - Nombre completo
   - Fecha de nacimiento
   - Sexo
   - Email y teléfono
   - Dirección
3. **Información Médica**:
   - Tipo de sangre
   - Alergias conocidas
   - Condiciones crónicas
   - Medicación actual
   - Seguro médico
4. **Asignación**:
   - Médico de cabecera
   - Médicos secundarios (especialistas)
5. Haz clic en **"Create Patient"**

### Transferir Paciente a Otro Médico

1. Ve al perfil del paciente
2. Sección **"Assigned Doctor"**
3. Haz clic en **"Transfer"**
4. Selecciona nuevo médico
5. Razón de transferencia (opcional pero recomendado)
6. Confirma transferencia
7. Ambos médicos (antiguo y nuevo) reciben notificación

### Acceso a Expedientes

Como admin, puedes acceder a cualquier expediente:

1. **"Patients"** → Selecciona paciente
2. Verás todo el historial médico
3. **Importante**:
   - Solo accede cuando sea necesario administrativamente
   - Todos los accesos quedan registrados en auditoría
   - Respeta la privacidad del paciente

---

## Configuración del Sistema

### Configuración General

**"Settings"** → **"General"**:

- **Nombre de la institución**: Aparece en emails y reportes
- **Logo**: Sube logo institucional (PNG, max 500KB)
- **Zona horaria**: Importante para citas y logs
- **Idioma predeterminado**: Español, Inglés, etc.
- **Formato de fecha**: DD/MM/YYYY o MM/DD/YYYY
- **Moneda**: Para facturación si aplica

### Variables de Entorno

**Configuración crítica en archivo `.env`**:

```bash
# Servidor
NODE_ENV=production
PORT=3000

# Sesiones
SESSION_SECRET=<genera-clave-segura-64-caracteres>

# Base de Datos
USE_POSTGRES=true  # o false para JSON
DATABASE_URL=postgres://user:pass@host:5432/mediconnect

# AI Services (opcional)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Email (para notificaciones)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@mediconnect.com
SMTP_PASS=<contraseña-app>

# Redis (para sesiones en producción)
REDIS_URL=redis://localhost:6379
```

**Importante**: Nunca compartas ni commitas el archivo `.env` a control de versiones.

### Configuración de Seguridad

**"Settings"** → **"Security"**:

#### Políticas de Contraseñas
- **Longitud mínima**: 8 caracteres (recomendado: 12+)
- **Requerir mayúsculas**: Sí/No
- **Requerir números**: Sí/No
- **Requerir símbolos**: Sí/No
- **Expiración**: 90 días, 180 días, Nunca
- **Historial de contraseñas**: No reutilizar últimas 5

#### Sesiones
- **Tiempo de inactividad**: 30 minutos por defecto
- **Sesión máxima**: 8 horas
- **Sesiones concurrentes**: Permitir 1, 2 o ilimitadas

#### Rate Limiting
- **Login attempts**: 5 intentos por 15 minutos
- **API calls**: 100 requests por minuto
- **Bloqueo por IP**: Automático tras intentos excesivos

#### Autenticación de Dos Factores (2FA)
- **Requerido para**: Admins, Médicos, Todos
- **Método**: TOTP (Google Authenticator), SMS, Email
- **Códigos de backup**: 10 códigos de un solo uso

### Configuración de Email

Para envío de notificaciones:

1. **"Settings"** → **"Email Configuration"**
2. Configura SMTP:
   - **Host**: smtp.gmail.com (ejemplo)
   - **Port**: 587 (TLS) o 465 (SSL)
   - **Usuario**: noreply@tudominio.com
   - **Contraseña**: Contraseña de aplicación
3. **Plantillas de Email**:
   - Bienvenida
   - Restablecimiento de contraseña
   - Confirmación de cita
   - Recordatorio de cita
   - Prescripción lista
4. Haz clic en **"Test Email"** para verificar
5. Guarda configuración

### Configuración de Backups

**"Settings"** → **"Backup"**:

- **Frecuencia**: Diaria, Semanal, Mensual
- **Hora de ejecución**: 2:00 AM (baja actividad)
- **Retención**: Mantener últimos 30 backups
- **Ubicación**:
  - Local: `/backups/`
  - Cloud: AWS S3, Google Cloud Storage, Azure
- **Incluir**:
  - ✅ Base de datos
  - ✅ Archivos subidos
  - ✅ Configuración
  - ❌ Logs (solo últimos 7 días)

### Configuración de Notificaciones

Control de notificaciones automáticas:

- **Recordatorios de citas**:
  - 24 horas antes: Email
  - 1 hora antes: SMS (si está configurado)
- **Resultados de laboratorio**: Notificar al paciente
- **Prescripción lista**: Notificar cuando esté lista en farmacia
- **Signos vitales anormales**: Alertar al médico inmediatamente
- **Mensajes nuevos**: Notificación en tiempo real

---

## Seguridad y Auditoría

### Logs de Auditoría

**"Security"** → **"Audit Logs"**:

Todos los eventos importantes quedan registrados:
- Inicios de sesión (exitosos y fallidos)
- Cambios de contraseña
- Creación/edición/eliminación de usuarios
- Acceso a expedientes médicos
- Modificaciones en configuración del sistema
- Exportación de datos

**Campos de cada log**:
- Timestamp (fecha y hora exacta)
- Usuario (quién realizó la acción)
- Acción (qué se hizo)
- Recurso (sobre qué)
- IP Address (desde dónde)
- Resultado (éxito o error)

### Buscar en Logs

1. Filtra por:
   - **Rango de fechas**: Última hora, día, semana, mes
   - **Usuario**: Busca por email
   - **Acción**: Login, Update, Delete, etc.
   - **IP Address**: Detectar accesos sospechosos
2. Exporta resultados a CSV para análisis

### Alertas de Seguridad

Configurar alertas automáticas:

1. **"Security"** → **"Alerts"**
2. Tipos de alertas:
   - **Múltiples intentos fallidos de login**: 5+ en 10 minutos
   - **Acceso desde nueva ubicación**: IP no reconocida
   - **Acceso fuera de horario**: 11pm - 6am
   - **Cambios en roles**: Cualquier cambio de permisos
   - **Eliminación masiva**: 10+ registros eliminados
3. Método de alerta:
   - Email al administrador
   - SMS (si está configurado)
   - Webhook a sistema de monitoreo

### Gestión de IPs Bloqueadas

**"Security"** → **"Blocked IPs"**:

- Ver lista de IPs bloqueadas automáticamente
- Desbloquear IP manualmente
- Agregar IP a lista negra permanente
- Agregar IP a lista blanca (nunca bloquear)

### Cumplimiento Normativo

#### HIPAA Compliance
- ✅ Encriptación en tránsito (HTTPS/TLS)
- ✅ Encriptación en reposo (database encryption)
- ✅ Control de acceso basado en roles
- ✅ Logs de auditoría completos
- ✅ Backup y recuperación ante desastres
- ✅ Política de retención de datos

#### GDPR (si aplica en Europa)
- ✅ Consentimiento informado
- ✅ Derecho al olvido (eliminar datos)
- ✅ Portabilidad de datos (exportar)
- ✅ Notificación de brechas en 72 horas

---

## Monitoreo y Logs

### Health Check del Sistema

**Dashboard** → **"System Health"**:

- **Status general**: Healthy, Degraded, Unhealthy
- **Uptime**: Tiempo sin interrupciones
- **Memoria**:
  - Heap usado: MB / Total
  - Porcentaje de uso
- **CPU**: Porcentaje de uso
- **Disco**: GB disponibles

### Endpoints de Monitoreo

Para integración con herramientas externas:

- `GET /health` - Estado completo del sistema
- `GET /health/live` - Liveness probe (Kubernetes)
- `GET /health/ready` - Readiness probe (Kubernetes)

Ejemplo de respuesta:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-07T10:30:00Z",
  "uptime": "5d 12h 34m",
  "memory": {
    "heapUsed": 120,
    "percentage": 35
  },
  "components": {
    "database": { "status": "up" },
    "redis": { "status": "up" },
    "ai_services": { "status": "degraded", "message": "OpenAI API slow" }
  }
}
```

### Logs del Sistema

**"Settings"** → **"System Logs"**:

#### Tipos de Logs

1. **Application Logs**: Eventos de la aplicación
   - Ubicación: `logs/app.log`
   - Formato: JSON en producción
   - Niveles: error, warn, info, http, debug

2. **Error Logs**: Solo errores
   - Ubicación: `logs/error.log`
   - Incluye stack traces
   - Prioridad para revisión

3. **HTTP Request Logs**: Todas las peticiones
   - Ubicación: `logs/http.log`
   - Formato: Combined Log Format
   - Campos: IP, usuario, método, URL, status, tiempo de respuesta

4. **Security Logs**: Eventos de seguridad
   - Ubicación: `logs/security.log`
   - Logins, cambios de permisos, accesos a datos sensibles

#### Ver Logs en Tiempo Real

Desde el servidor (SSH):
```bash
# Ver logs de aplicación
tail -f logs/app.log

# Ver solo errores
tail -f logs/error.log | grep ERROR

# Ver requests HTTP
tail -f logs/http.log
```

#### Rotación de Logs

Configuración automática:
- **Tamaño máximo por archivo**: 20 MB
- **Archivos a mantener**: Últimos 14 días
- **Compresión**: Archivos antiguos se comprimen (.gz)
- **Eliminación**: Archivos mayores a 30 días se eliminan

---

## Base de Datos

### Modo JSON (Desarrollo)

Por defecto, el sistema usa archivo JSON:
- **Ubicación**: `src/database/database.json`
- **Ventajas**: Fácil de inspeccionar, sin configuración
- **Desventajas**: No escalable, lento con muchos datos

**Importante**: NO usar JSON en producción con usuarios reales.

### Migrar a PostgreSQL (Producción)

#### Paso 1: Instalar PostgreSQL

**Con Docker** (recomendado):
```bash
npm run docker:postgres
```

**Instalación manual**:
- Descarga PostgreSQL 14+ desde postgresql.org
- Instala y configura
- Crea base de datos: `CREATE DATABASE mediconnect;`

#### Paso 2: Configurar Variables de Entorno

Edita `.env`:
```bash
USE_POSTGRES=true
DATABASE_URL=postgres://usuario:contraseña@localhost:5432/mediconnect
```

#### Paso 3: Ejecutar Migraciones

```bash
npm run db:migrate
```

Esto crea todas las tablas necesarias:
- `users`
- `patients`
- `vital_signs`
- `appointments`
- `prescriptions`
- `medical_records`
- `messages`

#### Paso 4: Migrar Datos Existentes

Si tienes datos en JSON:
```bash
node src/database/migrate-to-postgres.js
```

Este script:
1. Lee `database.json`
2. Convierte al formato PostgreSQL
3. Inserta en la base de datos
4. Crea backup del JSON original

### Gestión de Base de Datos

#### Ver Estado de Migraciones

```bash
npm run db:migrate:status
```

#### Revertir Última Migración

```bash
npm run db:migrate:rollback
```

#### Backup Manual de Base de Datos

**PostgreSQL**:
```bash
pg_dump -U usuario mediconnect > backup_$(date +%Y%m%d).sql
```

**Restaurar backup**:
```bash
psql -U usuario mediconnect < backup_20251207.sql
```

#### Limpiar Datos de Prueba

```bash
# Eliminar usuarios demo
DELETE FROM users WHERE email LIKE '%.demo';

# Eliminar citas antiguas (más de 1 año)
DELETE FROM appointments WHERE date < NOW() - INTERVAL '1 year';
```

---

## Reportes y Analytics

### Dashboard de Analytics

**"Analytics"** en el menú:

#### Métricas Clave
- **Total usuarios**: Crecimiento mes a mes
- **Sesiones activas**: Usuarios conectados ahora
- **Citas completadas**: Este mes vs. mes anterior
- **Prescripciones emitidas**: Tendencia

#### Gráficos Disponibles
- **Usuarios registrados por mes**: Línea de tiempo
- **Tipos de usuarios**: Pacientes vs. Médicos (pie chart)
- **Citas por día**: Bar chart
- **Horas pico de uso**: Heat map
- **Médicos más activos**: Top 10
- **Diagnósticos más frecuentes**: Top 20

### Generar Reportes Personalizados

1. **"Analytics"** → **"Generate Report"**
2. Selecciona:
   - **Tipo de reporte**:
     - Reporte de actividad general
     - Reporte de uso por médico
     - Reporte de satisfacción de pacientes
     - Reporte financiero (si facturación está habilitada)
   - **Período**: Última semana, mes, trimestre, año, personalizado
   - **Formato**: PDF, Excel, CSV
3. Haz clic en **"Generate"**
4. Descarga o envía por email

### Exportar Datos

Para análisis externo o cumplimiento:

1. **"Analytics"** → **"Export Data"**
2. Selecciona tablas:
   - Users
   - Patients
   - Appointments
   - Prescriptions
   - Vital Signs
   - Medical Records
3. Formato: CSV, JSON, Excel
4. **Importante**: Los datos exportados están anonimizados por defecto
5. Descarga

---

## Mantenimiento

### Actualizar el Sistema

#### Actualización Menor (Patches)

```bash
# 1. Hacer backup completo
npm run backup:full

# 2. Descargar actualizaciones
git pull origin main

# 3. Instalar dependencias
npm install

# 4. Ejecutar migraciones (si las hay)
npm run db:migrate

# 5. Reiniciar servidor
npm start
```

#### Actualización Mayor (Versiones)

1. **Leer notas de la versión**: CHANGELOG.md
2. **Revisar breaking changes**: Cambios que requieren acción
3. **Hacer backup completo**
4. **Probar en entorno de staging primero**
5. **Programar ventana de mantenimiento** (notificar usuarios)
6. **Ejecutar actualización**
7. **Verificar funcionalidad**

### Limpieza de Sistema

#### Limpiar Sesiones Expiradas

```bash
# Si usas Redis
redis-cli FLUSHDB

# Si usas base de datos para sesiones
DELETE FROM sessions WHERE expires < NOW();
```

#### Limpiar Logs Antiguos

```bash
# Eliminar logs mayores a 30 días
find logs/ -name "*.log" -mtime +30 -delete

# Comprimir logs mayores a 7 días
find logs/ -name "*.log" -mtime +7 -exec gzip {} \;
```

#### Limpiar Cache

```bash
# Limpiar cache de Node.js
npm cache clean --force

# Reiniciar para limpiar cache en memoria
npm restart
```

### Monitoreo de Recursos

#### Espacio en Disco

```bash
# Ver uso de disco
df -h

# Ver tamaño de base de datos
du -sh src/database/

# Ver tamaño de logs
du -sh logs/
```

#### Memoria y CPU

```bash
# Ver procesos de Node.js
ps aux | grep node

# Monitoreo en tiempo real
htop  # o top en sistemas sin htop
```

### Programar Tareas Automáticas

Usando `cron` (Linux/Mac) o Task Scheduler (Windows):

```bash
# Editar crontab
crontab -e

# Backup diario a las 2 AM
0 2 * * * cd /path/to/mediconnect && npm run backup:daily

# Limpiar logs semanalmente
0 3 * * 0 cd /path/to/mediconnect && npm run logs:clean

# Reportes mensuales
0 8 1 * * cd /path/to/mediconnect && npm run reports:monthly
```

---

## Solución de Problemas

### El Sistema no Inicia

1. **Verificar puerto**:
   ```bash
   # Ver si el puerto 3000 está ocupado
   netstat -ano | findstr :3000  # Windows
   lsof -i :3000  # Linux/Mac
   ```
   - Si está ocupado, detén el proceso o cambia el puerto en `.env`

2. **Verificar base de datos**:
   ```bash
   # PostgreSQL
   pg_isready -h localhost -p 5432
   ```
   - Si no responde, inicia PostgreSQL

3. **Ver logs de error**:
   ```bash
   tail -f logs/error.log
   ```

### Error de Conexión a Base de Datos

1. **Verificar credenciales** en `.env`:
   ```bash
   DATABASE_URL=postgres://user:pass@host:5432/dbname
   ```

2. **Verificar que PostgreSQL esté corriendo**:
   ```bash
   # Linux
   sudo systemctl status postgresql

   # Windows (Services)
   # Busca "PostgreSQL" en servicios
   ```

3. **Verificar firewall**:
   - Asegúrate de que el puerto 5432 esté abierto

### Usuarios no Pueden Iniciar Sesión

1. **Verificar estado del usuario** en la base de datos
2. **Revisar logs de autenticación**:
   ```bash
   grep "AUTH" logs/security.log
   ```
3. **Verificar secreto de sesión** en `.env`
4. **Limpiar sesiones antiguas**

### El AI Assistant no Funciona

1. **Verificar API keys** en `.env`:
   ```bash
   OPENAI_API_KEY=sk-...
   ANTHROPIC_API_KEY=sk-ant-...
   ```

2. **Verificar conectividad** a APIs:
   ```bash
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer $OPENAI_API_KEY"
   ```

3. **Revisar límites de uso**:
   - Las APIs pueden tener límites de requests o cuotas

### Sistema Lento

1. **Verificar recursos**:
   ```bash
   # CPU y memoria
   htop
   ```

2. **Verificar tamaño de base de datos**:
   ```sql
   SELECT pg_size_pretty(pg_database_size('mediconnect'));
   ```

3. **Optimizar base de datos**:
   ```sql
   VACUUM ANALYZE;
   REINDEX DATABASE mediconnect;
   ```

4. **Revisar queries lentas**:
   ```sql
   SELECT query, calls, total_time, mean_time
   FROM pg_stat_statements
   ORDER BY mean_time DESC
   LIMIT 10;
   ```

### Backup Falló

1. **Verificar espacio en disco**:
   ```bash
   df -h
   ```

2. **Verificar permisos** del directorio de backups:
   ```bash
   ls -la /backups/
   ```

3. **Probar backup manual**:
   ```bash
   npm run backup:manual
   ```

4. **Revisar logs de backup**:
   ```bash
   grep "BACKUP" logs/app.log
   ```

---

## Contacto y Soporte

### Soporte Técnico

**Para emergencias del sistema**:
- 📞 Teléfono: (123) 456-7890 (24/7)
- 📧 Email: admin-support@mediconnect.com

**Para actualizaciones y mantenimiento**:
- 📧 Email: devops@mediconnect.com
- 💬 Slack: #mediconnect-admins

### Recursos Adicionales

- 📚 **Documentación técnica**: docs.mediconnect.com
- 🎥 **Video tutoriales**: youtube.com/mediconnect
- 💻 **GitHub**: github.com/mediconnect/mediconnect-pro
- 📖 **Changelog**: CHANGELOG.md en el repositorio

---

## Checklist de Implementación

### Pre-Producción

- [ ] Cambiar todas las contraseñas por defecto
- [ ] Configurar PostgreSQL
- [ ] Migrar datos de JSON a PostgreSQL
- [ ] Configurar backups automáticos diarios
- [ ] Configurar SMTP para emails
- [ ] Configurar HTTPS/SSL
- [ ] Habilitar 2FA para admins
- [ ] Configurar monitoreo (New Relic, Datadog, etc.)
- [ ] Revisar políticas de seguridad
- [ ] Configurar rate limiting
- [ ] Probar recuperación de disaster

### Post-Producción

- [ ] Monitorear logs diariamente
- [ ] Revisar health checks
- [ ] Verificar backups semanalmente
- [ ] Actualizar sistema mensualmente
- [ ] Revisar métricas de uso
- [ ] Analizar feedback de usuarios
- [ ] Optimizar rendimiento según necesidad

---

**Versión del Manual**: 1.0
**Última Actualización**: Diciembre 2025
**MediConnect Pro** - Sistema de Administración

**¿Necesitas ayuda adicional?**
Contacta al equipo de soporte: admin-support@mediconnect.com
