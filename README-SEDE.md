# Manual de la sede — Pequeños Pasos

## ¿Qué hace este sistema?

Los promotores graban sus informes de campo en el celular. El audio llega a esta computadora, se transcribe y se convierte en un documento Word (.docx) que el promotor puede descargar.

**Esta computadora necesita estar encendida y con internet para que los promotores puedan usarla.**

---

## Arranque diario

1. Encendé la computadora normalmente.
2. Abrí **Docker Desktop** (ícono de ballena azul en la barra de tareas). Esperá hasta que el ícono quede quieto (sin animación).
3. Hacé doble clic en `scripts\arrancar-sede.bat`.
4. Cuando aparezca "La app está corriendo", el sistema está listo.

> Si Docker Desktop ya estaba abierto, saltá directo al paso 3.

---

## ¿Cómo sé que todo funciona?

Corrés `scripts\estado.bat`. Te muestra:

- El estado de cada parte del sistema (verde = bien, rojo = problema).
- Los modelos de inteligencia artificial instalados.
- Si el túnel que conecta a los celulares está activo.

---

## Problemas comunes

### "Docker no está iniciado"
→ Abrí Docker Desktop. Esperá a que el ícono de la ballena deje de animarse. Después volvé a correr `arrancar-sede.bat`.

### "Algo falló al iniciar los servicios"
→ Corré `estado.bat` para ver cuál servicio falló. Reiniciá Docker Desktop y probá de nuevo. Si sigue fallando, mandá una captura de pantalla al soporte.

### El promotor dice que el informe no llega
1. Fijate que la computadora tenga internet.
2. Corré `estado.bat` y fijate que todos los servicios digan "running".
3. Si Ollama dice que no tiene modelos instalados, seguí las instrucciones de la sección "Primera vez" más abajo.

### La app carga muy lento la primera vez
Es normal. La primera vez que se genera un informe, el sistema descarga las inteligencias artificiales (puede tardar varios minutos). Los siguientes son más rápidos.

---

## Apagar el sistema

Cuando terminás de usar el sistema (al final del día o si necesitás apagar la computadora):

```
docker compose down
```

O simplemente apagás la computadora — Docker frena los servicios solo.

---

## Primera vez: instalación del sistema

> **Solo hacer esto una vez.** Si el sistema ya funciona, saltá esta sección.

### 1. Requisitos previos
- Docker Desktop instalado ([descargar acá](https://www.docker.com/products/docker-desktop/))
- Node.js 22 instalado (para el generador del workflow n8n)
- Cuenta en Cloudflare (gratuita) con un dominio

### 2. Clonar el repositorio
```
git clone <URL_DEL_REPO> C:\PequenhosPasos
cd C:\PequenhosPasos
```

### 3. Configurar variables de entorno
```
copy .env.example .env
```
Abrí `.env` con el Bloc de Notas y cambiá:
- `N8N_PASSWORD` → una contraseña segura para el editor n8n

> `N8N_API_KEY` se completa después, solo si vas a actualizar el workflow por línea de comandos (ver sección "Actualizar el workflow"). Dejala vacía por ahora.

### 4. Correr el script de primer arranque

Hacé doble clic en `scripts\primer-arranque.bat`.

El script hace todo en orden:
- Construye las imágenes Docker (10-20 min la primera vez)
- Inicia los servicios
- **Espera que Ollama esté listo** antes de intentar descargar el modelo
- Descarga el modelo de lenguaje qwen3:4b (~2.6 GB — puede tardar según la conexión)
- Te indica el único paso manual que queda: importar el workflow en n8n

Si la computadora es muy lenta con qwen3:4b, al terminar el script podés cambiar al modelo más chico:
```
docker compose exec ollama ollama pull qwen3:1.7b
```
Y en `.env` cambiá `OLLAMA_MODEL=qwen3:1.7b`, luego reiniciá: `docker compose restart n8n`.

### 5. Importar el workflow en n8n (único paso manual restante)

1. Generá el archivo del workflow:
   ```
   node scripts\gen-n8n-workflow.mjs
   ```
2. Abrí n8n en el navegador: `http://localhost:5678`
3. Ingresá con el usuario y contraseña que configuraste en `.env`.
4. Menú → **Workflows** → **Import from file**.
5. Seleccioná `n8n\workflows\registro.json`.
6. Activá el workflow (toggle arriba a la derecha).

### 7. Configurar el túnel Cloudflare

1. Instalá cloudflared:
   ```
   winget install Cloudflare.cloudflared
   ```
2. Autenticarte:
   ```
   cloudflared tunnel login
   ```
3. Crear el túnel:
   ```
   cloudflared tunnel create pequenos-pasos
   ```
   Anotá el UUID que aparece.

4. Editá `cloudflared\config.yml`:
   - Reemplazá `<TUNNEL_UUID>` con el UUID anotado.
   - Reemplazá `<USUARIO>` con tu nombre de usuario de Windows.
   - Reemplazá `<TUDOMINIO.COM>` con tu dominio de Cloudflare.

5. Copiá el config al directorio de cloudflared:
   ```
   copy cloudflared\config.yml %USERPROFILE%\.cloudflared\config.yml
   ```

6. Configurá el DNS en Cloudflare dashboard:
   - DNS → Add record → CNAME
   - Name: `registro`
   - Target: `<TUNNEL_UUID>.cfargotunnel.com`
   - Proxy: ON (naranja)

7. Instalá como servicio de Windows (arranca con la PC, sin login):
   ```
   cloudflared service install
   ```

8. Verificá que esté corriendo:
   ```
   sc query cloudflared
   ```
   Debe decir `STATE: RUNNING`.

---

## Acceso desde el celular de los promotores

La URL de la app es:
```
https://registro.<TUDOMINIO.COM>
```

Para agregar al escritorio del celular como una app:
1. Abrí la URL en Chrome.
2. Menú (tres puntos) → "Agregar a la pantalla de inicio".
3. Confirmar.

---

## Actualizar el workflow

Si alguien modificó el prompt o el schema del informe (archivos `assemble.ts` o `schema.ts`), hay que aplicar el cambio a n8n. Corrés este script y listo:

```
scripts\update-workflow.bat
```

El script regenera el archivo del workflow, lo sube a n8n y lo deja activo. No hace falta abrir n8n ni hacer nada a mano.

> **Solo la primera vez:** el script necesita una "API key" de n8n. Abrí `http://localhost:5678` → **Settings** → **API** → **Create API Key**, copiá la key y pegala en el archivo `.env` en la línea `N8N_API_KEY=`. Después de eso, el script funciona siempre sin pedir nada.

> Si dice "No se pudo conectar", verificá que n8n esté corriendo con `estado.bat`.
> Si dice "API key inválida", generá una nueva en n8n y actualizá `.env`.

---

## Datos y backups

Los informes, audios y documentos se guardan en el volumen Docker `data`:
- `data/audio/` — archivos de audio WAV originales
- `data/docx/` — documentos Word generados
- `data/sqlite/` — base de datos con todos los registros

Para ver dónde están físicamente esos archivos:
```
docker volume inspect pequenospasos_data
```

**Se recomienda hacer un backup periódico del volumen `data`.**

---

## Contacto de soporte

Si algo no funciona y este manual no lo resuelve:
- Mandá una captura de pantalla del resultado de `estado.bat`
- Contá qué paso estabas haciendo cuando se rompió
