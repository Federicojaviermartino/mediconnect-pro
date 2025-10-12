# Instrucciones para Subir MediConnect Pro a GitHub

Este documento contiene las instrucciones paso a paso para subir el proyecto a GitHub.

## Requisitos Previos

- Tener una cuenta en [GitHub](https://github.com)
- Tener Git instalado en tu computadora
- Estar autenticado en Git (ver sección de configuración si no lo estás)

## Configuración Inicial de Git (Si es necesario)

Si aún no has configurado Git en tu computadora, ejecuta estos comandos:

```bash
# Configurar tu nombre
git config --global user.name "Tu Nombre"

# Configurar tu email (usa el mismo email de tu cuenta de GitHub)
git config --global user.email "tu-email@ejemplo.com"
```

## Pasos para Subir el Proyecto a GitHub

### 1. Crear un Nuevo Repositorio en GitHub

1. Ve a [GitHub](https://github.com) e inicia sesión
2. Haz clic en el botón **"+"** en la esquina superior derecha
3. Selecciona **"New repository"**
4. Configura el repositorio:
   - **Repository name**: `mediconnect-pro`
   - **Description**: "Enterprise-grade telemedicine platform with AI-powered risk prediction and remote patient monitoring"
   - **Visibility**: Elige "Public" o "Private" según prefieras
   - **NO marques** las opciones:
     - "Add a README file"
     - "Add .gitignore"
     - "Choose a license"
   (Ya tenemos estos archivos en el proyecto)
5. Haz clic en **"Create repository"**

### 2. Conectar tu Repositorio Local con GitHub

Después de crear el repositorio, GitHub te mostrará instrucciones. Usa las siguientes:

```bash
# Asegúrate de estar en la carpeta del proyecto
cd "c:\Users\feder\OneDrive\Escritorio\Federico 2025\Freelance_projects\mediconnect-pro"

# Agregar el repositorio remoto (reemplaza 'tu-usuario' con tu nombre de usuario de GitHub)
git remote add origin https://github.com/tu-usuario/mediconnect-pro.git

# Verificar que se agregó correctamente
git remote -v
```

### 3. Subir el Código a GitHub

```bash
# Cambiar el nombre de la rama principal a 'main' (estándar de GitHub)
git branch -M main

# Subir el código al repositorio remoto
git push -u origin main
```

Si te pide autenticación:
- **Username**: Tu nombre de usuario de GitHub
- **Password**: Un Personal Access Token (no uses tu contraseña de GitHub)

### 4. Crear un Personal Access Token (Si es necesario)

Si GitHub te pide contraseña y no funciona, necesitas crear un token:

1. Ve a GitHub → Settings (tu perfil) → Developer settings
2. Selecciona **"Personal access tokens"** → **"Tokens (classic)"**
3. Haz clic en **"Generate new token"** → **"Generate new token (classic)"**
4. Configura el token:
   - **Note**: "MediConnect Pro - Git Access"
   - **Expiration**: Elige un tiempo (30 días, 90 días, etc.)
   - **Scopes**: Marca "repo" (acceso completo a repositorios)
5. Haz clic en **"Generate token"**
6. **IMPORTANTE**: Copia el token inmediatamente (no podrás verlo después)
7. Usa este token como contraseña cuando Git te lo pida

### 5. Configurar Caché de Credenciales (Opcional pero Recomendado)

Para no tener que ingresar el token cada vez:

```bash
# En Windows
git config --global credential.helper wincred

# En Mac
git config --global credential.helper osxkeychain

# En Linux
git config --global credential.helper cache
```

### 6. Verificar que el Código se Subió Correctamente

1. Ve a tu repositorio en GitHub: `https://github.com/tu-usuario/mediconnect-pro`
2. Deberías ver todos los archivos del proyecto
3. El README.md se mostrará automáticamente en la página principal

## Comandos Útiles para el Futuro

### Subir Nuevos Cambios

Cuando hagas cambios en el código:

```bash
# Ver qué archivos cambiaron
git status

# Agregar todos los archivos modificados
git add .

# Crear un commit con un mensaje descriptivo
git commit -m "feat: descripción de los cambios"

# Subir los cambios a GitHub
git push
```

### Sincronizar con GitHub

Si trabajas desde múltiples computadoras:

```bash
# Descargar los últimos cambios
git pull
```

### Ver el Historial de Commits

```bash
# Ver historial de commits
git log --oneline

# Ver cambios específicos
git show <commit-hash>
```

### Crear y Trabajar con Ramas

```bash
# Crear una nueva rama
git checkout -b feature/nueva-funcionalidad

# Ver todas las ramas
git branch -a

# Cambiar de rama
git checkout main

# Subir una rama a GitHub
git push -u origin feature/nueva-funcionalidad
```

## Personalizar el Proyecto

### Actualizar URLs en el README

1. Abre [README.md](README.md)
2. Busca y reemplaza todas las instancias de:
   - `https://github.com/yourusername/mediconnect-pro.git`
   - Con: `https://github.com/tu-usuario/mediconnect-pro.git`

### Actualizar package.json

Ya está actualizado, pero verifica que tu información esté correcta en:
- [package.json](package.json:81) - Campo `author`
- [package.json](package.json:65) - Campo `repository.url`

### Configurar GitHub Repository Settings

Después de subir el código, considera configurar:

1. **About Section** (en la página principal del repo):
   - Website
   - Topics/Tags: `telemedicine`, `healthcare`, `nestjs`, `nextjs`, `typescript`, `microservices`
   - Description

2. **GitHub Actions** (CI/CD):
   - Puedes agregar workflows en `.github/workflows/` para automatizar tests y deploys

3. **Branch Protection Rules**:
   - Settings → Branches → Add rule para `main`
   - Require pull request reviews
   - Require status checks to pass

4. **Secrets** (para CI/CD):
   - Settings → Secrets and variables → Actions
   - Agrega tus tokens y API keys aquí

## Estructura del Repositorio

```
mediconnect-pro/
├── .github/              # GitHub workflows (CI/CD) - puede agregarse después
├── services/             # Microservicios
├── frontend/             # Aplicaciones frontend
├── shared/               # Código compartido
├── infrastructure/       # Docker, Kubernetes
├── config/               # Configuraciones
├── scripts/              # Scripts útiles
├── README.md             # Documentación principal
├── CONTRIBUTING.md       # Guía de contribución
├── LICENSE               # Licencia MIT
├── DEPLOYMENT.md         # Guía de despliegue
├── TESTING_GUIDE.md      # Guía de testing
└── PRODUCTION-CHECKLIST.md
```

## Próximos Pasos Recomendados

1. **Agregar un proyecto GitHub Projects**:
   - Para gestionar tareas y desarrollo

2. **Configurar GitHub Issues**:
   - Templates para bugs y feature requests

3. **Agregar GitHub Actions**:
   - CI/CD para tests automáticos
   - Deploy automático a staging/production

4. **Agregar Badges al README**:
   - Build status
   - Code coverage
   - Dependencies status

5. **Documentación adicional**:
   - Wiki de GitHub con tutoriales
   - GitHub Pages para documentación

## Recursos Adicionales

- [GitHub Docs](https://docs.github.com)
- [Git Cheat Sheet](https://education.github.com/git-cheat-sheet-education.pdf)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)

## Solución de Problemas

### Error: "failed to push some refs"

```bash
# Primero, descarga los cambios remotos
git pull origin main --rebase

# Luego, intenta subir de nuevo
git push
```

### Error: "Permission denied"

- Verifica que tu Personal Access Token tenga los permisos correctos
- Asegúrate de estar usando el token correcto como contraseña

### El archivo .env no se subió

Esto es correcto. El archivo `.env` contiene información sensible y está en `.gitignore`.
Solo se sube `.env.example` como plantilla.

## Soporte

Si tienes problemas:
1. Revisa la documentación de GitHub
2. Busca el error en Google/Stack Overflow
3. Abre un issue en el repositorio

---

**¡Felicidades! Tu proyecto ya está listo para ser compartido con el mundo.**

Para cualquier actualización futura:
```bash
git add .
git commit -m "descripción de cambios"
git push
```
