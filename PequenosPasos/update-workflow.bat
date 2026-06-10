@echo off
:: Importa y activa el workflow de n8n usando el CLI del contenedor.
:: No requiere Node en la PC: todo corre dentro del contenedor n8n.
:: El registro.json esta montado en /home/node/workflows (ver docker-compose.yml).

set "INSTALL_DIR=%~dp0"
cd /d "%INSTALL_DIR%"

:: -- Rancher NO agrega docker al PATH del sistema: hay que apuntar a sus carpetas.
if exist "%USERPROFILE%\.rd\bin" set "PATH=%USERPROFILE%\.rd\bin;%PATH%"
if exist "%LOCALAPPDATA%\Programs\Rancher Desktop\resources\resources\win32\bin" set "PATH=%LOCALAPPDATA%\Programs\Rancher Desktop\resources\resources\win32\bin;%PATH%"
if exist "%ProgramFiles%\Rancher Desktop\resources\resources\win32\bin" set "PATH=%ProgramFiles%\Rancher Desktop\resources\resources\win32\bin;%PATH%"

set "WF_ID=pequenospasosregistro"
set "WF_FILE=/home/node/workflows/registro.json"

docker compose exec -T n8n n8n import:workflow --input=%WF_FILE%
docker compose exec -T n8n n8n update:workflow --id=%WF_ID% --active=true

:: n8n registra el webhook al arrancar; un restart asegura /webhook/registro vivo.
docker compose restart n8n
