@echo off
REM MediConnect Pro - Quick Setup Script for Windows
REM This script automates the setup process for development

setlocal enabledelayedexpansion

echo.
echo ========================================================
echo.
echo           MediConnect Pro - Setup Script
echo           Enterprise Telemedicine Platform
echo.
echo ========================================================
echo.

echo [INFO] Starting MediConnect Pro setup...
echo.

REM Check Docker
echo [INFO] Checking prerequisites...
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not installed or not in PATH
    echo Please install Docker Desktop from: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)
echo [SUCCESS] Docker is installed

REM Check Docker Compose
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker Compose is not installed
    pause
    exit /b 1
)
echo [SUCCESS] Docker Compose is installed

REM Check if Docker daemon is running
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker daemon is not running
    echo Please start Docker Desktop
    pause
    exit /b 1
)
echo [SUCCESS] Docker daemon is running
echo.

REM Setup environment file
echo [INFO] Setting up environment variables...
if not exist .env (
    if exist .env.example (
        copy .env.example .env >nul
        echo [SUCCESS] Created .env file from .env.example
        echo [WARNING] Please review .env file and update values if needed
    ) else (
        echo [ERROR] .env.example file not found
        pause
        exit /b 1
    )
) else (
    echo [WARNING] .env file already exists, skipping...
)
echo.

REM Create required directories
echo [INFO] Creating required directories...
if not exist config\ssl mkdir config\ssl
if not exist logs mkdir logs
echo [SUCCESS] Directories created
echo.

REM Ask if user wants to pull images
set /p PULL_IMAGES="Do you want to pull Docker images now? This will speed up the first run. [y/N]: "
if /i "%PULL_IMAGES%"=="y" (
    echo [INFO] Pulling Docker images... ^(this may take a few minutes^)
    docker-compose pull
    echo [SUCCESS] Docker images pulled
    echo.
)

REM Ask if user wants to start services
set /p START_SERVICES="Do you want to start all services now? [Y/n]: "
if /i not "%START_SERVICES%"=="n" (
    echo.
    echo [INFO] Starting all services...
    docker-compose up -d

    echo [INFO] Waiting for services to initialize... ^(this may take 2-3 minutes^)
    timeout /t 10 /nobreak >nul

    echo.
    echo [INFO] Checking service status...
    docker-compose ps

    echo.
    echo ========================================================
    echo [SUCCESS] Setup complete! 🎉
    echo ========================================================
    echo.
    echo Access Points:
    echo ------------------------------------------------
    echo   Web Application:      http://localhost
    echo   Web ^(direct^):         http://localhost:3100
    echo   API Gateway:          http://localhost:3000
    echo   API Documentation:    http://localhost:3000/api-docs
    echo.
    echo Service Endpoints:
    echo ------------------------------------------------
    echo   Auth Service:         http://localhost:3001
    echo   Patient Service:      http://localhost:3002
    echo   Vitals Service:       http://localhost:3003
    echo   Consultation Service: http://localhost:3004
    echo   ML Service:           http://localhost:8000
    echo.
    echo ========================================================
    echo.
    echo Useful Commands:
    echo   View logs:           docker-compose logs -f
    echo   Stop services:       docker-compose down
    echo   Restart services:    docker-compose restart
    echo   View service status: docker-compose ps
    echo.
    echo Next Steps:
    echo   1. Wait 1-2 minutes for all services to fully initialize
    echo   2. Visit http://localhost in your browser
    echo   3. Read QUICKSTART.md for API testing examples
    echo   4. Check README.md for complete documentation
    echo.

    REM Health check
    echo [INFO] Performing health check in 30 seconds...
    timeout /t 30 /nobreak >nul

    echo.
    echo [INFO] Testing service endpoints...

    REM Test endpoints
    curl -s -f -o nul http://localhost:3000/health 2>nul
    if !errorlevel! equ 0 (
        echo [SUCCESS] API Gateway is responding
    ) else (
        echo [WARNING] API Gateway is not responding yet ^(may still be starting^)
    )

    curl -s -f -o nul http://localhost:3001/health 2>nul
    if !errorlevel! equ 0 (
        echo [SUCCESS] Auth Service is responding
    ) else (
        echo [WARNING] Auth Service is not responding yet ^(may still be starting^)
    )

    curl -s -f -o nul http://localhost:3002/health 2>nul
    if !errorlevel! equ 0 (
        echo [SUCCESS] Patient Service is responding
    ) else (
        echo [WARNING] Patient Service is not responding yet ^(may still be starting^)
    )

    curl -s -f -o nul http://localhost:3003/health 2>nul
    if !errorlevel! equ 0 (
        echo [SUCCESS] Vitals Service is responding
    ) else (
        echo [WARNING] Vitals Service is not responding yet ^(may still be starting^)
    )

    curl -s -f -o nul http://localhost:3004/health 2>nul
    if !errorlevel! equ 0 (
        echo [SUCCESS] Consultation Service is responding
    ) else (
        echo [WARNING] Consultation Service is not responding yet ^(may still be starting^)
    )

    curl -s -f -o nul http://localhost:8000/health 2>nul
    if !errorlevel! equ 0 (
        echo [SUCCESS] ML Service is responding
    ) else (
        echo [WARNING] ML Service is not responding yet ^(may still be starting^)
    )

) else (
    echo [INFO] Setup complete! Services not started.
    echo.
    echo To start services manually, run:
    echo   docker-compose up -d
)

echo.
echo [INFO] For troubleshooting, check QUICKSTART.md
echo.
pause
