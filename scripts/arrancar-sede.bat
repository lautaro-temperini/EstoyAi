@echo off
setlocal enabledelayedexpansion
title Pequenos Pasos — Arranque de sede

echo.
echo  ╔═══════════════════════════════════════════╗
echo  ║   Pequeños Pasos — Sistema de la sede     ║
echo  ╚═══════════════════════════════════════════╝
echo.

:: ── Verificar que Docker esté corriendo ───────────────────────────────────────
docker info >nul 2>&1
if errorlevel 1 (
    echo  [!] Docker no está iniciado.
    echo      Abrí Docker Desktop y esperá que el ícono de la ballena quede quieto.
    echo      Después volvé a correr este script.
    pause
    exit /b 1
)

echo  [1/4] Docker OK.

:: ── Ir al directorio del proyecto ─────────────────────────────────────────────
cd /d "%~dp0.."

:: ── Levantar todos los servicios ──────────────────────────────────────────────
echo  [2/4] Iniciando servicios (puede tardar 1-2 minutos la primera vez)...
docker compose up -d
if errorlevel 1 (
    echo.
    echo  [!] Algo falló al iniciar los servicios.
    echo      Corré scripts\estado.bat para ver qué pasó.
    pause
    exit /b 1
)

echo  [3/4] Servicios iniciados. Esperando que estén listos...

:: ── Esperar que app-pwa responda (máx 120 seg) ────────────────────────────────
set INTENTOS=0
:ESPERAR
set /a INTENTOS+=1
if !INTENTOS! GTR 24 (
    echo.
    echo  [!] La app tardó demasiado en arrancar.
    echo      Corré scripts\estado.bat para ver el estado detallado.
    pause
    exit /b 1
)
timeout /t 5 /nobreak >nul
curl -s -o nul -w "%%{http_code}" http://localhost:3000 2>nul | findstr /r "^[23]" >nul
if errorlevel 1 goto ESPERAR

echo  [4/4] Sistema listo.
echo.
echo  ┌─────────────────────────────────────────────────────┐
echo  │   ✓  La app está corriendo en http://localhost:3000  │
echo  │   ✓  Los promotores pueden conectarse ahora          │
echo  └─────────────────────────────────────────────────────┘
echo.
echo  Para apagar el sistema: docker compose down
echo.
pause
