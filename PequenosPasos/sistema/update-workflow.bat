@echo off
:: Importa y activa los workflows de n8n usando el CLI del contenedor.
:: No requiere Node en la PC: todo corre dentro del contenedor n8n.
:: Los .json estan montados en /home/node/workflows (ver docker-compose.yml).
:: Vive en sistema\ - el docker-compose.yml esta un nivel arriba.

set "INSTALL_DIR=%~dp0.."
cd /d "%INSTALL_DIR%"

:: -- Rancher NO agrega docker al PATH del sistema: hay que apuntar a sus carpetas.
if exist "%USERPROFILE%\.rd\bin" set "PATH=%USERPROFILE%\.rd\bin;%PATH%"
if exist "%LOCALAPPDATA%\Programs\Rancher Desktop\resources\resources\win32\bin" set "PATH=%LOCALAPPDATA%\Programs\Rancher Desktop\resources\resources\win32\bin;%PATH%"
if exist "%ProgramFiles%\Rancher Desktop\resources\resources\win32\bin" set "PATH=%ProgramFiles%\Rancher Desktop\resources\resources\win32\bin;%PATH%"

:: registro: audio -> transcripcion -> extraccion -> docx
docker compose exec -T n8n n8n import:workflow --input=/home/node/workflows/registro.json
docker compose exec -T n8n n8n update:workflow --id=pequenospasosregistro --active=true

:: subir-r2: docx -> Cloudflare R2 (requiere CF_* en .env; si no, queda inactivo sin molestar)
docker compose exec -T n8n n8n import:workflow --input=/home/node/workflows/subir-r2.json
docker compose exec -T n8n n8n update:workflow --id=estoyaisubirr2 --active=true

:: n8n registra los webhooks al arrancar; un restart asegura que queden vivos.
docker compose restart n8n
