@echo off
:: Regenera el workflow n8n y lo importa automáticamente.
:: Uso: doble clic o desde la raíz del repo: scripts\update-workflow.bat
node "%~dp0update-workflow.mjs"
if errorlevel 1 pause
