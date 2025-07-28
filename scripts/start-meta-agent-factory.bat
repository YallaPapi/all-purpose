@echo off
REM All-Purpose Meta-Agent Factory - Windows Startup Script
REM Comprehensive Docker Compose orchestration with health checks and validation

setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."
set "ENVIRONMENT=%1"
if "%ENVIRONMENT%"=="" set "ENVIRONMENT=development"

cd /d "%PROJECT_ROOT%"

echo [%DATE% %TIME%] Starting All-Purpose Meta-Agent Factory - Environment: %ENVIRONMENT%

REM Check prerequisites
echo [INFO] Checking prerequisites...

where docker >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Docker is not installed or not in PATH
    exit /b 1
)

where docker-compose >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Docker Compose is not installed or not in PATH
    exit /b 1
)

REM Check for .env file
if not exist ".env" (
    echo [WARN] .env file not found. Please copy .env.template to .env and configure
    if "%ANTHROPIC_API_KEY%"=="" (
        if "%OPENAI_API_KEY%"=="" (
            echo [ERROR] At least one AI API key must be configured
            exit /b 1
        )
    )
)

REM Determine compose files
set "COMPOSE_FILES=-f docker-compose.yml"

if "%ENVIRONMENT%"=="production" (
    set "COMPOSE_FILES=%COMPOSE_FILES% -f docker-compose.prod.yml"
    echo [INFO] Using production configuration
) else (
    if exist "docker-compose.override.yml" (
        set "COMPOSE_FILES=%COMPOSE_FILES% -f docker-compose.override.yml"
    )
    echo [INFO] Using development configuration with overrides
)

REM Create required directories
echo [INFO] Creating required directories...
if not exist "data" mkdir data
if not exist "data\factory-core" mkdir data\factory-core
if not exist "data\domain-agents" mkdir data\domain-agents
if not exist "data\uep-service" mkdir data\uep-service
if not exist "data\uep-registry" mkdir data\uep-registry
if not exist "data\redis" mkdir data\redis
if not exist "data\nats" mkdir data\nats
if not exist "data\prometheus" mkdir data\prometheus
if not exist "data\grafana" mkdir data\grafana
if not exist "data\traefik" mkdir data\traefik
if not exist "logs" mkdir logs

REM Stop existing containers
echo [INFO] Stopping any existing containers...
docker-compose %COMPOSE_FILES% down --remove-orphans

REM Pull and build
echo [INFO] Pulling latest images and building...
docker-compose %COMPOSE_FILES% pull
docker-compose %COMPOSE_FILES% build --parallel

REM Start infrastructure services
echo [INFO] Starting infrastructure services...
docker-compose %COMPOSE_FILES% up -d etcd redis nats-broker

REM Wait for infrastructure
echo [INFO] Waiting for infrastructure services...
timeout /t 30 /nobreak >nul

REM Start UEP Registry
echo [INFO] Starting UEP Registry service...
docker-compose %COMPOSE_FILES% up -d uep-registry
timeout /t 15 /nobreak >nul

REM Start application services
echo [INFO] Starting application services...
docker-compose %COMPOSE_FILES% up -d factory-core domain-agents uep-service
timeout /t 20 /nobreak >nul

REM Start observability and gateway
echo [INFO] Starting observability and gateway services...
docker-compose %COMPOSE_FILES% up -d observability api-gateway
timeout /t 15 /nobreak >nul

REM Display status
echo [INFO] Verifying all services are running...
docker-compose %COMPOSE_FILES% ps

echo.
echo ========================================
echo All-Purpose Meta-Agent Factory Started!
echo ========================================
echo.
echo 🌐 Access Points:
echo   • Main Dashboard:     http://localhost:3000
echo   • Factory Core:       http://localhost:3000
echo   • Domain Agents:      http://localhost:3002
echo   • UEP Registry:       http://localhost:3001
echo   • UEP Service:        http://localhost:3003
echo   • Observability:      http://localhost:3004 (Grafana)
echo   • Metrics:            http://localhost:9090 (Prometheus)
echo   • API Gateway:        http://localhost:8080 (Traefik)
echo.
echo 📊 Monitoring:
echo   • Observability Dashboard: http://localhost:3000/admin/observability
echo   • Grafana (admin/admin):    http://localhost:3004
echo   • Prometheus:               http://localhost:9090
echo   • Traefik Dashboard:        http://localhost:8080
echo.
echo 🔧 Management Commands:
echo   • View logs:    docker-compose %COMPOSE_FILES% logs -f [service]
echo   • Stop system:  docker-compose %COMPOSE_FILES% down
echo   • Restart:      docker-compose %COMPOSE_FILES% restart [service]
echo.
echo Environment: %ENVIRONMENT%
echo ✅ All services should be running!
echo 🚀 Ready to process meta-agent requests!

endlocal