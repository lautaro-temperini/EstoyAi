@echo off
title Pequenos Pasos — Estado del sistema

echo.
echo  ═══════════════════════════════════════════════════
echo   Pequeños Pasos — Estado del sistema
echo  ═══════════════════════════════════════════════════
echo.

:: ── Docker ────────────────────────────────────────────────────────────────────
docker info >nul 2>&1
if errorlevel 1 (
    echo  [!] Docker no está corriendo.
    echo      Iniciá Docker Desktop primero.
    echo.
    pause
    exit /b 1
)
echo  Docker: OK
echo.

cd /d "%~dp0.."

:: ── Estado de cada contenedor ─────────────────────────────────────────────────
echo  Servicios:
echo  ─────────────────────────────────────────────────────
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
echo.

:: ── Healthchecks ──────────────────────────────────────────────────────────────
echo  Conectividad interna:
echo  ─────────────────────────────────────────────────────

curl -s -o nul -w "  app-pwa   (puerto 3000): %%{http_code}\n" http://localhost:3000
curl -s -o nul -w "  n8n       (puerto 5678): %%{http_code}\n" http://localhost:5678/healthz

echo.

:: ── Modelos Ollama instalados ─────────────────────────────────────────────────
echo  Modelos instalados en Ollama:
echo  ─────────────────────────────────────────────────────
docker compose exec -T ollama ollama list 2>nul || echo  (Ollama no está corriendo)
echo.

:: ── Túnel Cloudflare ──────────────────────────────────────────────────────────
echo  Túnel Cloudflare:
echo  ─────────────────────────────────────────────────────
sc query cloudflared 2>nul | findstr "STATE" || echo  (servicio cloudflared no instalado)
echo.

echo  Para ver logs de un servicio:
echo    docker compose logs --tail=50 app-pwa
echo    docker compose logs --tail=50 n8n
echo    docker compose logs --tail=50 whisper
echo    docker compose logs --tail=50 ollama
echo.
pause
