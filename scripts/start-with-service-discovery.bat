@echo off
REM UEP Meta-Agent Factory Startup Script for Windows
REM Task 191.4: Windows batch script for Docker Compose with service discovery

setlocal enabledelayedexpansion

REM Configuration
set COMPOSE_FILE=docker-compose-service-discovery.yml
set ENV_FILE=.env.service-discovery
set PROJECT_NAME=uep-factory

REM Colors (Windows doesn't support colors in batch, but we can use echo)
set "INFO=[INFO]"
set "SUCCESS=[SUCCESS]"
set "WARNING=[WARNING]"
set "ERROR=[ERROR]"

REM Print banner
echo ╔════════════════════════════════════════════════════════════════╗
echo ║                                                                ║
echo ║           UEP Meta-Agent Factory with Service Discovery        ║
echo ║                                                                ║
echo ║  🏭 Complete containerized meta-agent factory                  ║
echo ║  📡 Redis + Consul service discovery                           ║
echo ║  🔍 Real-time monitoring and observability                     ║
echo ║  🚀 Production-ready with health checks                        ║
echo ║                                                                ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

REM Check prerequisites
echo %INFO% Checking prerequisites...

REM Check Docker
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo %ERROR% Docker is not installed or not in PATH
    exit /b 1
)

REM Check Docker Compose
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    docker compose version >nul 2>&1
    if %errorlevel% neq 0 (
        echo %ERROR% Docker Compose is not installed
        exit /b 1
    )
)

echo %SUCCESS% Prerequisites check passed

REM Validate configuration
echo %INFO% Validating configuration...

if not exist "%COMPOSE_FILE%" (
    echo %ERROR% Docker Compose file not found: %COMPOSE_FILE%
    exit /b 1
)

if not exist "%ENV_FILE%" (
    echo %WARNING% Environment file not found: %ENV_FILE%
    echo %INFO% Please copy .env.service-discovery.example to %ENV_FILE%
)

echo %SUCCESS% Configuration validation passed

REM Create network if it doesn't exist
echo %INFO% Setting up Docker network...
docker network ls | findstr "uep-network" >nul
if %errorlevel% neq 0 (
    docker network create uep-network --driver bridge --subnet=172.20.0.0/16
    echo %SUCCESS% Created Docker network: uep-network
) else (
    echo %SUCCESS% Docker network already exists: uep-network
)

REM Handle command line arguments
set "COMMAND=%1"
if "%COMMAND%"=="" set "COMMAND=start"

if "%COMMAND%"=="start" goto :start
if "%COMMAND%"=="stop" goto :stop
if "%COMMAND%"=="restart" goto :restart
if "%COMMAND%"=="status" goto :status
if "%COMMAND%"=="health" goto :health
if "%COMMAND%"=="logs" goto :logs
if "%COMMAND%"=="clean" goto :clean
goto :usage

:start
echo %INFO% Starting UEP Meta-Agent Factory with Service Discovery...

REM Pull images
echo %INFO% Pulling Docker images...
docker-compose -f "%COMPOSE_FILE%" --env-file "%ENV_FILE%" pull --quiet
echo %SUCCESS% Docker images pulled successfully

REM Start infrastructure services
echo %INFO% Starting infrastructure services...
docker-compose -f "%COMPOSE_FILE%" --env-file "%ENV_FILE%" up -d redis-registry consul-server nats-broker

REM Wait for infrastructure
echo %INFO% Waiting for infrastructure services...
timeout /t 10 /nobreak >nul

REM Start monitoring
echo %INFO% Starting monitoring services...
docker-compose -f "%COMPOSE_FILE%" --env-file "%ENV_FILE%" up -d service-discovery-monitor prometheus grafana observability

REM Start core services
echo %INFO% Starting core services...
docker-compose -f "%COMPOSE_FILE%" --env-file "%ENV_FILE%" up -d uep-service factory-core

REM Start agents
echo %INFO% Starting UEP agents...
docker-compose -f "%COMPOSE_FILE%" --env-file "%ENV_FILE%" up -d infra-orchestrator prd-parser scaffold-generator backend-agent frontend-agent domain-agents

REM Start gateway
echo %INFO% Starting API gateway...
docker-compose -f "%COMPOSE_FILE%" --env-file "%ENV_FILE%" up -d api-gateway

REM Wait for services to start
timeout /t 15 /nobreak >nul

goto :show_status

:stop
echo %INFO% Stopping all services...
docker-compose -f "%COMPOSE_FILE%" --env-file "%ENV_FILE%" down
echo %SUCCESS% All services stopped
goto :end

:restart
echo %INFO% Restarting all services...
docker-compose -f "%COMPOSE_FILE%" --env-file "%ENV_FILE%" restart
echo %SUCCESS% All services restarted
goto :end

:status
:show_status
echo %INFO% Service status:
docker-compose -f "%COMPOSE_FILE%" --env-file "%ENV_FILE%" ps

echo.
echo %INFO% Access URLs:
echo 🏭 Factory Core:              http://localhost:3000
echo 📊 Service Discovery Monitor: http://localhost:8090
echo 🔍 Consul UI:                http://localhost:8500
echo 📈 Prometheus:               http://localhost:9090
echo 📊 Grafana:                  http://localhost:3031
echo 🎛️  Observability Dashboard:  http://localhost:3030
echo 🚪 API Gateway (Traefik):    http://localhost:8080
echo 📡 NATS Monitoring:          http://localhost:8222

echo.
echo %INFO% Quick commands:
echo 📋 View logs:    %~nx0 logs [service]
echo 🔄 Restart:      %~nx0 restart
echo 🛑 Stop all:     %~nx0 stop
echo 🧹 Clean up:     %~nx0 clean
goto :end

:health
echo %INFO% Performing health checks...

REM Check key services
echo %INFO% Checking Redis...
docker exec uep-redis-registry redis-cli ping >nul 2>&1
if %errorlevel% equ 0 (
    echo %SUCCESS% Redis is healthy
) else (
    echo %WARNING% Redis health check failed
)

echo %INFO% Checking Consul...
curl -s http://localhost:8500/v1/status/leader >nul 2>&1
if %errorlevel% equ 0 (
    echo %SUCCESS% Consul is healthy
) else (
    echo %WARNING% Consul health check failed
)

echo %INFO% Checking Factory Core...
curl -f http://localhost:3000/health >nul 2>&1
if %errorlevel% equ 0 (
    echo %SUCCESS% Factory Core is healthy
) else (
    echo %WARNING% Factory Core health check failed
)

goto :end

:logs
if "%2"=="" (
    docker-compose -f "%COMPOSE_FILE%" --env-file "%ENV_FILE%" logs -f
) else (
    docker-compose -f "%COMPOSE_FILE%" --env-file "%ENV_FILE%" logs -f %2
)
goto :end

:clean
echo %INFO% Cleaning up all resources...
docker-compose -f "%COMPOSE_FILE%" --env-file "%ENV_FILE%" down -v --remove-orphans
docker system prune -f
echo %SUCCESS% Cleanup complete
goto :end

:usage
echo Usage: %~nx0 {start^|stop^|restart^|status^|health^|logs [service]^|clean}
echo.
echo Commands:
echo   start   - Start all services
echo   stop    - Stop all services
echo   restart - Restart all services
echo   status  - Show service status
echo   health  - Perform health checks
echo   logs    - Show logs (optionally for specific service)
echo   clean   - Clean up all resources
exit /b 1

:end
echo.
echo %SUCCESS% Operation completed!
pause