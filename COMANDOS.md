# Referencia de comandos técnicos — EstoyAi

Comandos organizados por área. Para correrlos, abrir una terminal en la raíz del repo
(`D:\EstoyAi`) salvo que se indique otro directorio.

---

## Docker Compose (gestión de servicios de la sede)

```bat
docker compose up -d
```

Inicia todos los servicios en segundo plano (app-pwa, n8n, ollama, whisper).
Si los servicios ya están corriendo, no hace nada. Usar en el arranque diario.

```bat
docker compose up -d --build
```

Igual que el anterior, pero antes **reconstruye las imágenes** a partir del código fuente
local (Dockerfile de `app-pwa/` y `services/whisper/`). Usar después de cambiar código
que quiera verse en los contenedores. Solo aplica en modo desarrollo (el instalador de
la sede usa imágenes pre-construidas de GHCR, no buildea localmente).

```bat
docker compose pull
```

Baja las versiones más recientes de las imágenes desde GHCR / Docker Hub sin reiniciar
nada. Si hay una versión nueva publicada, aplicarla requiere un `docker compose up -d`
después. La versión 1.7 del instalador hace esto automáticamente en cada arranque.

```bat
docker compose down
```

Detiene y elimina los contenedores. Los **datos NO se pierden** porque están en volúmenes
nombrados (`data`, `n8n_data`, etc.) que sobreviven a este comando.
Usar al final del día si no se quiere dejar los servicios corriendo, o antes de liberar
recursos de la PC.

```bat
docker compose down -v
```

Igual que el anterior, pero **también elimina los volúmenes**. Esto **BORRA TODOS LOS
DATOS**: base de datos SQLite, audios, documentos Word, modelo de Ollama descargado y
configuración de n8n. Usar solo si se quiere arrancar desde cero (por ejemplo, antes de
entregar la PC a una ONG nueva o limpiar una instalación de prueba).

```bat
docker compose restart n8n
```

Reinicia únicamente el servicio n8n. Útil después de cambiar variables de entorno en
`.env` que afecten a n8n (como `OLLAMA_MODEL`).

```bat
docker compose ps
```

Muestra el estado de cada servicio (corriendo / detenido / con errores).

```bat
docker compose logs -f app-pwa
```

Muestra los logs en tiempo real del servicio indicado. Cambiar `app-pwa` por `n8n`,
`ollama` o `whisper` según lo que se quiera ver.

```bat
docker compose exec ollama ollama list
```

Lista los modelos de IA descargados dentro del contenedor de Ollama.

```bat
docker compose exec ollama ollama pull gemma3:4b
```

Descarga el modelo `gemma3:4b` dentro del contenedor. Reemplazar el nombre por el modelo
deseado. Este comando tarda varios minutos la primera vez.

---

## Imágenes Docker (publicar una release nueva)

> Correr con Docker corriendo en la PC de desarrollo. Requiere login a GHCR.

```bat
docker build -t ghcr.io/lautaro-temperini/pp-app-pwa:latest ./app-pwa
docker push ghcr.io/lautaro-temperini/pp-app-pwa:latest
```

Construye la imagen de la app (Next.js) a partir del código fuente y la publica en
GitHub Container Registry. La sede la baja la próxima vez que corra `docker compose pull`
(o en el siguiente arranque con la versión 1.7 del instalador).

```bat
docker build --build-arg WHISPER_MODEL=medium -t ghcr.io/lautaro-temperini/pp-whisper:latest ./services/whisper
docker push ghcr.io/lautaro-temperini/pp-whisper:latest
```

Igual para el servicio de transcripción de audio. Solo es necesario si se cambia algo en
`services/whisper/`.

---

## Next.js (desarrollo local sin Docker)

```bat
cd app-pwa
npm install
npm run dev
```

Inicia la app en modo desarrollo en `http://localhost:3000`. No requiere Docker ni el
resto de los servicios. Útil para iterar sobre la UI. La transcripción y el LLM no
funcionan en este modo.

```bat
npm run build
```

Compila la app para producción. Genera la carpeta `.next/`. El Dockerfile lo hace
internamente; este comando se usa para verificar que el build no tenga errores antes de
publicar.

```bat
npm run lint
```

Corre ESLint sobre el código fuente. Ejecutar antes de commitear cambios.

---

## n8n — workflow de procesamiento de audio

```bat
node scripts/gen-n8n-workflow.mjs
```

Regenera el archivo `n8n/workflows/registro.json` a partir del código fuente
(`assemble.ts`, `schema.ts`). Correr cada vez que se modifique el prompt del LLM o el
esquema JSON de extracción, y después importar el workflow en n8n.

```bat
scripts\update-workflow.bat
```

Regenera el workflow Y lo importa automáticamente a n8n sin abrir el navegador. Requiere
que el stack Docker esté corriendo. Al terminar, reinicia n8n (~30 segundos).

---

## Túnel Cloudflare (acceso remoto desde los celulares)

El túnel expone `localhost:3000` de la sede como `https://pequenospasos.estoyai.com`.
**Solo debe correr en una PC a la vez** (la de la sede). Si corre en dos PCs con el mismo
token, Cloudflare reparte el tráfico entre las dos — cada una tiene su propia base de
datos, así que los registros quedan repartidos y ninguna PC los ve todos.

### Ver el estado del servicio (PowerShell)

```powershell
sc query Cloudflared
```

`STATE: RUNNING` = túnel activo. `STATE: STOPPED` = apagado.

### Iniciar el túnel manualmente

```powershell
Start-Service Cloudflared
```

Útil si el servicio está en modo Manual y se quiere activarlo temporalmente.

### Apagar el túnel

```powershell
Stop-Service Cloudflared
```

Detiene el túnel hasta el próximo reinicio de Windows (si está en Automatic) o hasta que
se inicie a mano (si está en Manual).

### Cambiar el modo de arranque del servicio

```powershell
Set-Service Cloudflared -StartupType Automatic   # arranca solo con Windows (producción)
Set-Service Cloudflared -StartupType Manual      # no arranca solo, se inicia a mano
Set-Service Cloudflared -StartupType Disabled    # no puede arrancarse hasta habilitarlo
```

En la PC de la sede: `Automatic` (siempre disponible).
En la PC de desarrollo: `Manual` o `Disabled` para no competir con la sede.

---

## Instalador (compilar una nueva release)

```bat
"D:\Inno Setup 6\ISCC.exe" PequenosPasos\installer.iss
```

Compila el instalador `.exe` en `PequenosPasos\Output\`. Requiere Inno Setup 6 instalado.
Antes de compilar: actualizar el número de versión en `installer.iss`, `iniciar-sistema.bat`,
`primera-vez.bat`, `diagnostico.bat` y `LEEME.txt`.

El instalador empaqueta todo lo necesario: Rancher Desktop MSI, cloudflared MSI,
`docker-compose.yml`, scripts `.bat` y el workflow de n8n. **No incluye las imágenes
Docker** — esas se bajan de GHCR en el primer arranque.

---

## Git — flujo habitual

```bat
git status
git add -p           # agregar cambios selectivamente
git commit -m "..."
git push
```

```bat
git log --oneline -10    # últimos 10 commits
```
