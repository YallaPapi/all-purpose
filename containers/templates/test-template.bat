@echo off
REM =============================================================================
REM UEP Dockerfile Template Testing Script (Windows)
REM =============================================================================
REM 
REM This batch script tests Dockerfile templates on Windows systems.
REM It performs basic validation and build testing.
REM
REM Usage:
REM   test-template.bat [dockerfile-name]
REM   test-template.bat Dockerfile.base-agent
REM
REM =============================================================================

setlocal enabledelayedexpansion

REM Colors for output (limited on Windows)
set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

REM Default Dockerfile to test
set "DOCKERFILE=%~1"
if "%DOCKERFILE%"=="" set "DOCKERFILE=Dockerfile.base-agent"

REM Counters
set /a PASS_COUNT=0
set /a FAIL_COUNT=0
set /a WARN_COUNT=0

echo %BLUE%[INFO]%NC% UEP Dockerfile Template Tester (Windows)
echo %BLUE%[INFO]%NC% Testing: %DOCKERFILE%
echo.

REM =============================================================================
REM Helper Functions
REM =============================================================================

:log_pass
echo %GREEN%[PASS]%NC% %~1
set /a PASS_COUNT+=1
goto :eof

:log_fail
echo %RED%[FAIL]%NC% %~1
set /a FAIL_COUNT+=1
goto :eof

:log_warn
echo %YELLOW%[WARN]%NC% %~1
set /a WARN_COUNT+=1
goto :eof

:log_info
echo %BLUE%[INFO]%NC% %~1
goto :eof

:log_header
echo.
echo %BLUE%=== %~1 ===%NC%
echo.
goto :eof

REM =============================================================================
REM Validation Functions
REM =============================================================================

:validate_file_exists
call :log_header "File Validation"

if exist "%DOCKERFILE%" (
    call :log_pass "Dockerfile exists: %DOCKERFILE%"
) else (
    call :log_fail "Dockerfile not found: %DOCKERFILE%"
    exit /b 2
)

REM Check for corresponding .dockerignore
set "DOCKERIGNORE_FILE=.dockerignore.base-agent"
if exist "%DOCKERIGNORE_FILE%" (
    call :log_pass ".dockerignore template exists"
) else (
    call :log_warn ".dockerignore template not found: %DOCKERIGNORE_FILE%"
)
goto :eof

:validate_dockerfile_syntax
call :log_header "Dockerfile Syntax Validation"

REM Check for basic Dockerfile instructions
findstr /c:"FROM " "%DOCKERFILE%" >nul
if !errorlevel! equ 0 (
    call :log_pass "Contains FROM instruction"
) else (
    call :log_fail "Missing FROM instruction"
)

findstr /c:"WORKDIR " "%DOCKERFILE%" >nul
if !errorlevel! equ 0 (
    call :log_pass "Sets WORKDIR"
) else (
    call :log_fail "Missing WORKDIR instruction"
)

findstr /c:"USER " "%DOCKERFILE%" >nul
if !errorlevel! equ 0 (
    call :log_pass "Sets USER"
) else (
    call :log_fail "Missing USER instruction"
)

goto :eof

:validate_security_practices
call :log_header "Security Best Practices"

REM Check for non-root user
findstr /c:"USER.*agent" "%DOCKERFILE%" >nul
if !errorlevel! equ 0 (
    call :log_pass "Uses non-root user (agent)"
) else (
    call :log_fail "Does not specify non-root user"
)

REM Check for Alpine base image
findstr /c:"FROM.*alpine" "%DOCKERFILE%" >nul
if !errorlevel! equ 0 (
    call :log_pass "Uses Alpine Linux base image"
) else (
    call :log_warn "Consider using Alpine Linux for smaller attack surface"
)

REM Check for security updates
findstr /c:"apk.*upgrade" "%DOCKERFILE%" >nul
if !errorlevel! equ 0 (
    call :log_pass "Includes security updates (apk upgrade)"
) else (
    call :log_warn "Should include security updates"
)

goto :eof

:validate_multi_stage_build
call :log_header "Multi-stage Build Validation"

REM Count FROM instructions (approximate)
for /f %%i in ('findstr /c:"^FROM " "%DOCKERFILE%" ^| find /c /v ""') do set FROM_COUNT=%%i
if !FROM_COUNT! gtr 1 (
    call :log_pass "Uses multi-stage build (!FROM_COUNT! stages)"
) else (
    call :log_fail "Should use multi-stage build for optimization"
)

REM Check for named stages
findstr /c:"FROM.*AS " "%DOCKERFILE%" >nul
if !errorlevel! equ 0 (
    call :log_pass "Uses named build stages"
) else (
    call :log_warn "Consider using named stages for clarity"
)

REM Check for production stage
findstr /c:"AS production" "%DOCKERFILE%" >nul
if !errorlevel! equ 0 (
    call :log_pass "Has production build stage"
) else (
    call :log_fail "Missing production build stage"
)

goto :eof

:validate_runtime_configuration
call :log_header "Runtime Configuration"

REM Check for health check
findstr /c:"HEALTHCHECK" "%DOCKERFILE%" >nul
if !errorlevel! equ 0 (
    call :log_pass "Includes health check configuration"
) else (
    call :log_fail "Missing HEALTHCHECK instruction"
)

REM Check for exposed ports
findstr /c:"EXPOSE " "%DOCKERFILE%" >nul
if !errorlevel! equ 0 (
    call :log_pass "Exposes application ports"
) else (
    call :log_warn "Consider documenting exposed ports with EXPOSE"
)

REM Check for entrypoint
findstr /c:"ENTRYPOINT" "%DOCKERFILE%" >nul
if !errorlevel! equ 0 (
    call :log_pass "Defines ENTRYPOINT"
) else (
    call :log_warn "Consider defining ENTRYPOINT"
)

goto :eof

:validate_labels_and_metadata
call :log_header "Labels and Metadata"

REM Check for OCI labels
findstr /c:"org.opencontainers.image" "%DOCKERFILE%" >nul
if !errorlevel! equ 0 (
    call :log_pass "Uses OCI-compliant labels"
) else (
    call :log_warn "Consider adding OCI-compliant labels"
)

REM Check for UEP-specific labels
findstr /c:"uep.agent" "%DOCKERFILE%" >nul
if !errorlevel! equ 0 (
    call :log_pass "Includes UEP-specific labels"
) else (
    call :log_warn "Consider adding UEP-specific labels"
)

goto :eof

:validate_environment_variables
call :log_header "Environment Variables"

REM Check for NODE_ENV
findstr /c:"NODE_ENV" "%DOCKERFILE%" >nul
if !errorlevel! equ 0 (
    call :log_pass "Configures NODE_ENV"
) else (
    call :log_warn "Consider setting NODE_ENV"
)

REM Check for agent identification variables
findstr /c:"AGENT_TYPE" "%DOCKERFILE%" >nul
if !errorlevel! equ 0 (
    call :log_pass "Includes AGENT_TYPE environment variable"
) else (
    call :log_warn "Consider adding AGENT_TYPE environment variable"
)

goto :eof

:test_build
call :log_header "Build Test"

call :log_info "Testing if Dockerfile can be built..."

REM Create temporary directory
set "TEMP_DIR=%TEMP%\dockerfile-test-%RANDOM%"
mkdir "%TEMP_DIR%"

REM Copy Dockerfile
copy "%DOCKERFILE%" "%TEMP_DIR%\Dockerfile" >nul

REM Create minimal package.json
echo {> "%TEMP_DIR%\package.json"
echo   "name": "test-agent",>> "%TEMP_DIR%\package.json"
echo   "version": "1.0.0",>> "%TEMP_DIR%\package.json"
echo   "main": "src/index.js",>> "%TEMP_DIR%\package.json"
echo   "dependencies": {>> "%TEMP_DIR%\package.json"
echo     "express": "^4.18.2">> "%TEMP_DIR%\package.json"
echo   }>> "%TEMP_DIR%\package.json"
echo }>> "%TEMP_DIR%\package.json"

REM Create minimal source file
mkdir "%TEMP_DIR%\src"
echo const express = require('express');> "%TEMP_DIR%\src\index.js"
echo const app = express();>> "%TEMP_DIR%\src\index.js"
echo const port = process.env.SERVICE_PORT ^|^| 3000;>> "%TEMP_DIR%\src\index.js"
echo app.get('/health', (req, res) =^> {>> "%TEMP_DIR%\src\index.js"
echo   res.json({ status: 'healthy', timestamp: new Date().toISOString() });>> "%TEMP_DIR%\src\index.js"
echo });>> "%TEMP_DIR%\src\index.js"
echo app.listen(port, () =^> {>> "%TEMP_DIR%\src\index.js"
echo   console.log(`Test agent running on port ${port}`);>> "%TEMP_DIR%\src\index.js"
echo });>> "%TEMP_DIR%\src\index.js"

REM Create .dockerignore
echo node_modules> "%TEMP_DIR%\.dockerignore"
echo *.log>> "%TEMP_DIR%\.dockerignore"
echo .git>> "%TEMP_DIR%\.dockerignore"

REM Test build
pushd "%TEMP_DIR%"
docker build --target production -t test-dockerfile-validation . >nul 2>&1
if !errorlevel! equ 0 (
    call :log_pass "Dockerfile builds successfully"
    REM Clean up test image
    docker rmi test-dockerfile-validation >nul 2>&1
) else (
    call :log_fail "Dockerfile fails to build"
)
popd

REM Clean up
rmdir /s /q "%TEMP_DIR%"
goto :eof

REM =============================================================================
REM Main Execution
REM =============================================================================

REM Check if Docker is available
docker --version >nul 2>&1
if !errorlevel! neq 0 (
    call :log_fail "Docker is not available or not in PATH"
    exit /b 2
)

REM Run all validations
call :validate_file_exists
call :validate_dockerfile_syntax  
call :validate_security_practices
call :validate_multi_stage_build
call :validate_runtime_configuration
call :validate_labels_and_metadata
call :validate_environment_variables

REM Optional build test
if "%BUILD_TEST%"=="true" (
    call :test_build
)

REM Summary
call :log_header "Validation Summary"
echo ✅ Passed: %PASS_COUNT%
echo ❌ Failed: %FAIL_COUNT%
echo ⚠️  Warnings: %WARN_COUNT%

if %FAIL_COUNT% equ 0 (
    echo.
    call :log_info "🎉 All critical validations passed!"
    if %WARN_COUNT% gtr 0 (
        call :log_info "💡 Consider addressing warnings for optimal results"
    )
    exit /b 0
) else (
    echo.
    call :log_info "❌ %FAIL_COUNT% critical issues found. Please fix before using this template."
    exit /b 1
)

endlocal