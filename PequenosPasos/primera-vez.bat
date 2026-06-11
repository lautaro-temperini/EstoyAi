@echo off
title EstoyAi - Configuracion inicial
color 0F
setlocal enabledelayedexpansion

set "INSTALL_DIR=%~dp0"
cd /d "%INSTALL_DIR%"
set "LOG=%INSTALL_DIR%instalacion.log"

:: -- Permisos: lo lanza una tarea programada elevada. Si se ejecuta a mano
:: -- sin permisos de admin, se relanza pidiendo elevacion (un clic de UAC).
net session >nul 2>&1
if errorlevel 1 (
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

echo [%date% %time%] ===== primera-vez: inicio ===== >> "%LOG%"

:: -- Rancher NO agrega docker al PATH del sistema: hay que apuntar a sus carpetas.
if exist "%USERPROFILE%\.rd\bin" set "PATH=%USERPROFILE%\.rd\bin;%PATH%"
if exist "%LOCALAPPDATA%\Programs\Rancher Desktop\resources\resources\win32\bin" set "PATH=%LOCALAPPDATA%\Programs\Rancher Desktop\resources\resources\win32\bin;%PATH%"
if exist "%ProgramFiles%\Rancher Desktop\resources\resources\win32\bin" set "PATH=%ProgramFiles%\Rancher Desktop\resources\resources\win32\bin;%PATH%"

cls
echo ================================================
echo    EstoyAi - Configuracion inicial  (build 1.5)
echo ================================================
echo.
echo  Este proceso es automatico y tarda 15-20 min.
echo  No cierres esta ventana.
echo.
echo ================================================
echo.

:: ================================================================
:: [1/6] Eleccion de modelos segun los recursos de la PC.
::   - RAM alta + varios nucleos -> mejores modelos (mas calidad)
::   - PC modesta -> modelos livianos (tiempos de respuesta usables)
:: La eleccion queda en .env (junto a docker-compose.yml) y es
:: editable a mano. Si .env ya existe, se respeta y no se pisa.
:: ================================================================
echo [1/6] Detectando recursos de la PC...
set RAM_GB=12
for /f %%i in ('powershell -NoProfile -Command "[math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory/1GB)"') do set RAM_GB=%%i
set CORES=%NUMBER_OF_PROCESSORS%
set VRAM_GB=0
for /f %%i in ('powershell -NoProfile -Command "try { $v = (nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits | Select-Object -First 1); if ($v) { [math]::Round([int]$v/1024) } else { 0 } } catch { 0 }"') do set VRAM_GB=%%i

set "OLLAMA_MODEL=gemma3:4b"
set "WHISPER_MODEL=medium"
set "KEEP_ALIVE=24h"
if %RAM_GB% LSS 14 set "WHISPER_MODEL=small"
if %RAM_GB% LSS 14 set "KEEP_ALIVE=5m"
if %RAM_GB% LSS 10 set "OLLAMA_MODEL=gemma3:1b"
if %CORES% LEQ 2 set "OLLAMA_MODEL=gemma3:1b"
if %CORES% LEQ 2 set "WHISPER_MODEL=small"
if %CORES% LEQ 2 set "KEEP_ALIVE=5m"
:: Tier alto: PC potente -> mejores modelos (mas calidad, sigue siendo CPU).
if %RAM_GB% GEQ 24 if %CORES% GEQ 8 set "OLLAMA_MODEL=gemma3:12b"
if %RAM_GB% GEQ 24 if %CORES% GEQ 8 set "WHISPER_MODEL=large-v3-turbo"

if exist "%INSTALL_DIR%.env" goto env_existe
(
  echo # Generado por primera-vez.bat segun los recursos de esta PC.
  echo # RAM detectada: %RAM_GB% GB - Nucleos: %CORES% - VRAM: %VRAM_GB% GB
  echo # Nota: la GPU no se usa dentro de los contenedores por ahora
  echo # ^(el motor Rancher Desktop no la expone en Windows^). La VRAM
  echo # queda registrada para una futura version con GPU nativa.
  echo # Editable a mano. Para regenerar: borrar este archivo y
  echo # ejecutar primera-vez.bat de nuevo.
  echo OLLAMA_MODEL=%OLLAMA_MODEL%
  echo WHISPER_MODEL=%WHISPER_MODEL%
  echo OLLAMA_KEEP_ALIVE=%KEEP_ALIVE%
) > "%INSTALL_DIR%.env"
echo    RAM: %RAM_GB% GB, nucleos: %CORES%, VRAM: %VRAM_GB% GB
echo    Modelo de IA: %OLLAMA_MODEL% - Transcripcion: %WHISPER_MODEL%
echo [%date% %time%] deteccion: RAM=%RAM_GB%GB cores=%CORES% vram=%VRAM_GB%GB llm=%OLLAMA_MODEL% whisper=%WHISPER_MODEL% keepalive=%KEEP_ALIVE% >> "%LOG%"
goto env_listo

:env_existe
echo    Ya existe configuracion previa (.env^) - se respeta.
for /f "tokens=2 delims==" %%a in ('findstr /b /c:"OLLAMA_MODEL=" "%INSTALL_DIR%.env"') do set "OLLAMA_MODEL=%%a"
echo [%date% %time%] .env existente, llm=%OLLAMA_MODEL% >> "%LOG%"

:env_listo
echo.

echo [2/6] Preparando WSL...
wsl --update >> "%LOG%" 2>&1
wsl --set-default-version 2 >> "%LOG%" 2>&1
echo.

call :find_rancher
if defined RANCHER goto rancher_ok

echo [3/6] Instalando motor de contenedores ^(3-5 min^)...
echo [%date% %time%] instalando MSI >> "%LOG%"
start /wait msiexec.exe /i "%INSTALL_DIR%sistema\instalador-rancher.msi" /quiet /norestart /l*v "%INSTALL_DIR%msi-install.log"
echo [%date% %time%] msiexec exit=%errorlevel% >> "%LOG%"
call :find_rancher
if defined RANCHER goto rancher_ok

echo [%date% %time%] ERROR: Rancher no aparece tras instalar el MSI >> "%LOG%"
echo.
echo  [X] No se pudo instalar Rancher Desktop.
echo      Detalle tecnico en: msi-install.log ^(esta carpeta^)
echo.
echo  Al proximo inicio de sesion se reintenta solo.
echo.
pause
exit /b 1

:rancher_ok
echo [3/6] Motor de contenedores instalado.
echo [%date% %time%] rancher: !RANCHER! >> "%LOG%"

:: El MSI recien pudo crear estas carpetas: sumarlas al PATH ahora.
if exist "%ProgramFiles%\Rancher Desktop\resources\resources\win32\bin" set "PATH=%ProgramFiles%\Rancher Desktop\resources\resources\win32\bin;%PATH%"
if exist "%LOCALAPPDATA%\Programs\Rancher Desktop\resources\resources\win32\bin" set "PATH=%LOCALAPPDATA%\Programs\Rancher Desktop\resources\resources\win32\bin;%PATH%"
echo.

echo [4/6] Iniciando motor de contenedores...
start "" "%RANCHER%"
echo       Esperando que este listo ^(hasta 10 min^)...
echo.
set INTENTOS=0
:wait_docker
set /a INTENTOS+=1
if !INTENTOS! gtr 120 goto motor_fallo
timeout /t 5 /nobreak > nul
docker info > nul 2>&1
if errorlevel 1 (
    echo    Iniciando... ^(!INTENTOS!/120^)
    goto wait_docker
)
echo    Motor listo.
echo [%date% %time%] docker responde tras !INTENTOS! intentos >> "%LOG%"
echo.

echo [5/6] Descargando e iniciando servicios...
echo    (Primera vez: 10-15 minutos, descarga ~4 GB)
:: pull tolerante: refresca imagenes si hay internet; si falla, usa las locales.
docker compose pull >> "%LOG%" 2>&1
docker compose up -d
echo [%date% %time%] compose up exit=%errorlevel% >> "%LOG%"
echo.

echo    Verificando modelo de IA ^(%OLLAMA_MODEL%^)...
docker compose exec -T ollama ollama list 2>nul | find "%OLLAMA_MODEL%" > nul
if errorlevel 1 (
    echo    Descargando %OLLAMA_MODEL%...
    docker compose exec -T ollama ollama pull %OLLAMA_MODEL%
)
echo [%date% %time%] modelo %OLLAMA_MODEL% listo >> "%LOG%"
echo    Modelo listo.
echo.

echo [6/6] Configurando flujo de trabajo...
timeout /t 20 /nobreak > nul
if exist "%INSTALL_DIR%sistema\update-workflow.bat" (
    call "%INSTALL_DIR%sistema\update-workflow.bat" >> "%LOG%" 2>&1
)
echo [%date% %time%] workflow importado >> "%LOG%"
echo.

:: -- Exito: borrar la tarea programada de primer arranque y el MSI --
schtasks /delete /tn EstoyAiPrimeraVez /f >nul 2>&1
if exist "%INSTALL_DIR%sistema\instalador-rancher.msi" del "%INSTALL_DIR%sistema\instalador-rancher.msi" >nul 2>&1
echo [%date% %time%] ===== primera-vez: completado OK ===== >> "%LOG%"

echo Esperando que el sistema levante...
timeout /t 10 /nobreak > nul
start http://localhost:3000

cls
echo ================================================
echo    SISTEMA LISTO
echo ================================================
echo.
echo  El sistema se abrio en el navegador.
echo  Si no se abrio, entra a:  http://localhost:3000
echo.
echo  Para iniciarlo en el futuro, usa el icono
echo  "EstoyAi" del escritorio.
echo ================================================
echo.
pause
exit /b 0

:motor_fallo
echo [%date% %time%] ERROR: docker no respondio en 10 min >> "%LOG%"
wsl --status >> "%LOG%" 2>&1
wsl -l -v >> "%LOG%" 2>&1
echo.
echo  El motor de contenedores tardo demasiado.
echo.
echo  Posibles causas:
echo   - La PC es lenta: espera 5 minutos y proba el icono
echo     "EstoyAi" del escritorio.
echo   - La virtualizacion esta desactivada en el BIOS
echo     (buscar "VT-x", "SVM" o "Virtualization" y activarla).
echo.
echo  Al proximo inicio de sesion este proceso se
echo  reintenta automaticamente.
echo.
pause
exit /b 1

:: -- Subrutina: setea RANCHER si encuentra el ejecutable --
:find_rancher
set "RANCHER="
if exist "%ProgramFiles%\Rancher Desktop\Rancher Desktop.exe" set "RANCHER=%ProgramFiles%\Rancher Desktop\Rancher Desktop.exe"
if exist "%LOCALAPPDATA%\Programs\Rancher Desktop\Rancher Desktop.exe" set "RANCHER=%LOCALAPPDATA%\Programs\Rancher Desktop\Rancher Desktop.exe"
goto :eof
