@echo off
title EstoyAi - Estado del sistema
color 0F

set "INSTALL_DIR=%~dp0"
cd /d "%INSTALL_DIR%"

:: -- Rancher NO agrega docker al PATH del sistema: hay que apuntar a sus carpetas.
if exist "%USERPROFILE%\.rd\bin" set "PATH=%USERPROFILE%\.rd\bin;%PATH%"
if exist "%LOCALAPPDATA%\Programs\Rancher Desktop\resources\resources\win32\bin" set "PATH=%LOCALAPPDATA%\Programs\Rancher Desktop\resources\resources\win32\bin;%PATH%"
if exist "%ProgramFiles%\Rancher Desktop\resources\resources\win32\bin" set "PATH=%ProgramFiles%\Rancher Desktop\resources\resources\win32\bin;%PATH%"

cls
:: Modelo elegido por primera-vez.bat segun los recursos de la PC (ver .env)
set "OLLAMA_MODEL=gemma3:4b"
if exist "%INSTALL_DIR%.env" for /f "tokens=2 delims==" %%a in ('findstr /b /c:"OLLAMA_MODEL=" "%INSTALL_DIR%.env"') do set "OLLAMA_MODEL=%%a"

echo  =====================================================
echo    ESTOY AI - Estado del sistema       (build 1.4)
echo  =====================================================
echo.

:: -- Motor de contenedores --
docker info >nul 2>&1
if errorlevel 1 (
    echo  [X] El motor de contenedores NO esta corriendo.
    echo.
    echo      Abri "EstoyAi" desde el escritorio
    echo      y espera un minuto antes de revisar el estado.
    echo.
    pause
    exit /b 1
)
echo  [OK] Motor de contenedores: funcionando
echo.

:: -- Estado de cada servicio --
echo  SERVICIOS:
echo  -----------------------------------------------------
docker compose ps --format "table {{.Name}}\t{{.Status}}"
echo.

:: -- Conectividad --
echo  CONECTIVIDAD:
echo  -----------------------------------------------------
curl -s -o nul -w "  Sistema principal (3000): %%{http_code}\n" http://localhost:3000 2>nul
curl -s -o nul -w "  Procesador n8n    (5678): %%{http_code}\n" http://localhost:5678/healthz 2>nul
echo.
echo    (200 = funcionando correctamente)
echo.

:: -- Modelo de IA --
echo  MODELO DE IA:
echo  -----------------------------------------------------
docker compose exec -T ollama ollama list 2>nul | find "%OLLAMA_MODEL%" >nul
if errorlevel 1 (
    echo  [X] Modelo %OLLAMA_MODEL% NO instalado.
    echo      Ejecuta "EstoyAi" para descargarlo.
) else (
    echo  [OK] Modelo %OLLAMA_MODEL% instalado
)
echo.

:: -- Tunel Cloudflare --
echo  ACCESO REMOTO (tunel Cloudflare):
echo  -----------------------------------------------------
sc query cloudflared 2>nul | findstr "STATE" >nul
if errorlevel 1 (
    echo  [--] Tunel no configurado ^(acceso solo local^)
) else (
    sc query cloudflared | findstr "STATE"
)
echo.

echo  =====================================================
echo.
echo  Si algo aparece con [X], cerra esta ventana, abri
echo  "EstoyAi" desde el escritorio, espera un minuto
echo  y volve a revisar.
echo.
echo  Si el problema sigue, contacta a soporte
echo  (ver archivo LEEME.txt).
echo.
pause
