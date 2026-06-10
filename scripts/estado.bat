@echo off
chcp 65001 > nul
title Pequeños Pasos — Estado del sistema
color 0F

set "INSTALL_DIR=%~dp0"
cd /d "%INSTALL_DIR%"

cls
echo  ═══════════════════════════════════════════════════
echo    PEQUEÑOS PASOS — Estado del sistema
echo  ═══════════════════════════════════════════════════
echo.

:: ── Motor de contenedores ──────────────────────────────────────────
docker info >nul 2>&1
if errorlevel 1 (
    echo  [X] El motor de contenedores NO está corriendo.
    echo.
    echo      Abrí "Pequeños Pasos" desde el escritorio
    echo      y esperá un minuto antes de revisar el estado.
    echo.
    pause
    exit /b 1
)
echo  [OK] Motor de contenedores: funcionando
echo.

:: ── Estado de cada servicio ────────────────────────────────────────
echo  SERVICIOS:
echo  ─────────────────────────────────────────────────────
docker compose ps --format "table {{.Name}}\t{{.Status}}"
echo.

:: ── Conectividad ───────────────────────────────────────────────────
echo  CONECTIVIDAD:
echo  ─────────────────────────────────────────────────────
curl -s -o nul -w "  Sistema principal (3000): %%{http_code}\n" http://localhost:3000 2>nul
curl -s -o nul -w "  Procesador n8n    (5678): %%{http_code}\n" http://localhost:5678/healthz 2>nul
echo.
echo    (200 = funcionando correctamente)
echo.

:: ── Modelo de IA ───────────────────────────────────────────────────
echo  MODELO DE IA:
echo  ─────────────────────────────────────────────────────
docker compose exec -T ollama ollama list 2>nul | find "gemma3:4b" >nul
if errorlevel 1 (
    echo  [X] Modelo gemma3:4b NO instalado.
    echo      Ejecutá "Pequeños Pasos" para descargarlo.
) else (
    echo  [OK] Modelo gemma3:4b instalado
)
echo.

:: ── Túnel Cloudflare ───────────────────────────────────────────────
echo  ACCESO REMOTO (túnel Cloudflare):
echo  ─────────────────────────────────────────────────────
sc query cloudflared 2>nul | findstr "STATE" >nul
if errorlevel 1 (
    echo  [--] Túnel no configurado (acceso solo local)
) else (
    sc query cloudflared | findstr "STATE"
)
echo.

echo  ═══════════════════════════════════════════════════
echo.
echo  Si algo aparece con [X], cerrá esta ventana, abrí
echo  "Pequeños Pasos" desde el escritorio, esperá un
echo  minuto y volvé a revisar.
echo.
echo  Si el problema sigue, contactá a soporte
echo  (ver archivo LEEME.txt).
echo.
pause