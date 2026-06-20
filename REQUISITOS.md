# Requisitos de la PC de sede

EstoyAi corre entero en la PC de la sede (transcribe el audio y genera los informes con IA local, sobre Docker/WSL2). Mínimos para instalar:

- **Sistema operativo:** Windows 10 64-bit, build 19041 o superior (o Windows 11).
- **Procesador:** 4 núcleos (8 recomendado), con **virtualización activada en el BIOS** (VT-x / SVM).
- **RAM:** **16 GB mínimo.** El modelo de IA (gemma3:4b) satura una PC de 8 GB y la tilda al procesar varios audios seguidos.
- **Disco:** al menos **25 GB libres**.
- **Internet:** para la primera instalación (descarga ~7 GB).
- **Administrador:** instalar con una cuenta admin.
