@echo off
title EstoyAi
color 0F
setlocal enabledelayedexpansion

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

echo ================================================
echo    EstoyAi                          (build 1.5)
echo ================================================
echo.

:: -- Red de seguridad: si la configuracion inicial nunca corrio (la tarea
:: -- programada post-reinicio puede fallar), la corremos desde aca.
:: -- El .env lo crea primera-vez.bat al detectar el hardware.
if exist "%INSTALL_DIR%.env" goto config_ok
if not exist "%INSTALL_DIR%primera-vez.bat" goto config_ok
echo  La configuracion inicial no se completo todavia.
echo  Se ejecuta ahora (acepta el permiso de administrador si aparece).
timeout /t 3 /nobreak > nul
call "%INSTALL_DIR%primera-vez.bat"
exit /b
:config_ok

docker info > nul 2>&1
if not errorlevel 1 goto ready

echo Iniciando motor de contenedores...
set "RANCHER="
if exist "%ProgramFiles%\Rancher Desktop\Rancher Desktop.exe" set "RANCHER=%ProgramFiles%\Rancher Desktop\Rancher Desktop.exe"
if exist "%LOCALAPPDATA%\Programs\Rancher Desktop\Rancher Desktop.exe" set "RANCHER=%LOCALAPPDATA%\Programs\Rancher Desktop\Rancher Desktop.exe"
if not defined RANCHER (
    echo  [X] No se encontro Rancher Desktop.
    echo      Ejecuta el instalador EstoyAi primero.
    echo.
    pause
    exit /b 1
)
start "" "%RANCHER%"

echo Esperando que este listo...
set INTENTOS=0
:wait_docker
set /a INTENTOS+=1
if !INTENTOS! gtr 120 (
    echo El motor tardo demasiado. Espera un minuto y volve a intentar.
    pause
    exit /b 1
)
timeout /t 5 /nobreak > nul
docker info > nul 2>&1
if errorlevel 1 (
    echo    Iniciando... ^(!INTENTOS!/120^)
    goto wait_docker
)

:ready
echo Motor listo.
echo.

echo Iniciando servicios...
docker compose up -d

docker compose exec -T ollama ollama list 2>nul | find "%OLLAMA_MODEL%" > nul
if errorlevel 1 (
    echo Descargando modelo de IA...
    docker compose exec -T ollama ollama pull %OLLAMA_MODEL%
)

timeout /t 15 /nobreak > nul
if exist "%INSTALL_DIR%update-workflow.bat" (
    call "%INSTALL_DIR%update-workflow.bat" > nul 2>&1
)

timeout /t 8 /nobreak > nul
start http://localhost:3000

cls
echo ================================================
echo    SISTEMA LISTO
echo ================================================
echo.
echo  Abierto en el navegador: http://localhost:3000
echo.
echo  Podes minimizar esta ventana.
echo ================================================
echo.
pause
