@echo off
setlocal enabledelayedexpansion
title Pequenos Pasos — Primer arranque (configuración inicial)

echo.
echo  ╔═══════════════════════════════════════════════════════════╗
echo  ║   Pequeños Pasos — Configuración inicial (una sola vez)   ║
echo  ╚═══════════════════════════════════════════════════════════╝
echo.
echo  Este script solo se corre la primera vez.
echo  Para arranques diarios usá: scripts\arrancar-sede.bat
echo.

:: ── Verificar Docker ──────────────────────────────────────────────────────────
docker info >nul 2>&1
if errorlevel 1 (
    echo  [!] Docker no está iniciado.
    echo      Abrí Docker Desktop y esperá que el ícono de la ballena quede quieto.
    pause
    exit /b 1
)

cd /d "%~dp0.."

:: ── Verificar que existe .env ─────────────────────────────────────────────────
if not exist ".env" (
    echo  [!] No existe el archivo .env
    echo      Copiá .env.example a .env y configurá la contraseña de n8n antes de continuar.
    echo.
    echo      Comando: copy .env.example .env
    pause
    exit /b 1
)

echo  [1/5] Construyendo imágenes (puede tardar 10-20 min la primera vez)...
docker compose build
if errorlevel 1 (
    echo  [!] Falló la construcción de imágenes. Revisá el error arriba.
    pause
    exit /b 1
)

echo  [2/5] Iniciando todos los servicios...
docker compose up -d
if errorlevel 1 (
    echo  [!] Falló al iniciar los servicios.
    pause
    exit /b 1
)

:: ── Esperar que Ollama esté listo (healthcheck) ────────────────────────────────
echo  [3/5] Esperando que Ollama esté listo (puede tardar 1-2 min)...
set INTENTOS=0
:ESPERAR_OLLAMA
set /a INTENTOS+=1
if !INTENTOS! GTR 36 (
    echo  [!] Ollama tardó demasiado en arrancar.
    echo      Corré: docker compose logs ollama
    pause
    exit /b 1
)
timeout /t 5 /nobreak >nul
docker compose exec -T ollama ollama list >nul 2>&1
if errorlevel 1 goto ESPERAR_OLLAMA

echo  [4/5] Ollama listo. Descargando modelo de lenguaje (qwen3:4b, ~2.6 GB)...
echo        Esto puede tardar varios minutos según la velocidad de internet.
echo.
docker compose exec -T ollama ollama pull qwen3:4b
if errorlevel 1 (
    echo  [!] No se pudo descargar qwen3:4b.
    echo      Verificá la conexión a internet y volvé a correr este script.
    echo.
    echo      Alternativa más liviana (menos calidad):
    echo        docker compose exec ollama ollama pull qwen3:1.7b
    echo      Y en .env cambiá OLLAMA_MODEL=qwen3:1.7b
    pause
    exit /b 1
)

:: ── Verificar que el workflow de n8n esté importado ───────────────────────────
echo.
echo  [5/5] Configuración de n8n...
echo.
echo  ┌─────────────────────────────────────────────────────────────────┐
echo  │  Último paso manual: importar el workflow en n8n               │
echo  │                                                                  │
echo  │  1. Generá el archivo del workflow:                             │
echo  │       node scripts\gen-n8n-workflow.mjs                        │
echo  │                                                                  │
echo  │  2. Abrí http://localhost:5678 en el navegador                  │
echo  │                                                                  │
echo  │  3. Menú → Workflows → Import from file                        │
echo  │     Seleccioná: n8n\workflows\registro.json                    │
echo  │                                                                  │
echo  │  4. Activá el workflow (toggle arriba a la derecha)             │
echo  └─────────────────────────────────────────────────────────────────┘
echo.
echo  ✓ Configuración inicial completa.
echo    Para arranques diarios usá: scripts\arrancar-sede.bat
echo.
pause
