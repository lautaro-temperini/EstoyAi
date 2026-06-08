"""
faster-whisper microservice for Pequeños Pasos.

POST /transcribe accepts either:
  - JSON { "path": "/data/audio/<id>.wav" }  (n8n / producción)
  - multipart form-data with field "file"      (pruebas manuales)

Returns { "text": "...", "language": "es" }.
"""

from __future__ import annotations

import logging
import os
import tempfile
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel, Field

logger = logging.getLogger("whisper")

MODEL_NAME = os.getenv("WHISPER_MODEL", "base")
LANGUAGE = os.getenv("WHISPER_LANGUAGE", "es")
DATA_ROOT = Path(os.getenv("DATA_DIR", "/data")).resolve()
AUDIO_ROOT = (DATA_ROOT / "audio").resolve()

_model = None


def _load_model():
    from faster_whisper import WhisperModel

    logger.info("Cargando modelo %s (cpu, int8)…", MODEL_NAME)
    return WhisperModel(MODEL_NAME, device="cpu", compute_type="int8")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    global _model
    _model = _load_model()
    logger.info("Modelo listo.")
    yield


app = FastAPI(title="Pequeños Pasos Whisper", lifespan=lifespan)


class TranscribePathBody(BaseModel):
    path: str = Field(..., description="Ruta absoluta al WAV en el volumen compartido")


class TranscribeResponse(BaseModel):
    text: str
    language: str


def _assert_path_in_audio_dir(path: str) -> Path:
    resolved = Path(path).resolve()
    audio_root = str(AUDIO_ROOT)
    resolved_str = str(resolved)
    if not resolved_str.startswith(audio_root + os.sep) and resolved_str != audio_root:
        raise HTTPException(status_code=400, detail="path fuera del directorio de audio")
    if not resolved.is_file():
        raise HTTPException(status_code=404, detail="archivo de audio no encontrado")
    return resolved


def _transcribe_file(audio_path: Path) -> TranscribeResponse:
    if _model is None:
        raise HTTPException(status_code=503, detail="modelo no cargado")

    lang = None if LANGUAGE in ("", "auto") else LANGUAGE
    try:
        segments, info = _model.transcribe(
            str(audio_path),
            language=lang,
            beam_size=5,
            vad_filter=True,
        )
    except Exception as exc:
        logger.error("No se pudo decodificar %s: %s", audio_path, exc)
        raise HTTPException(status_code=400, detail="audio inválido o no se pudo decodificar") from exc
    text = "".join(seg.text for seg in segments).strip()
    language = info.language or LANGUAGE or "es"
    logger.info(
        "Transcrito %s — %d chars, idioma=%s",
        audio_path.name,
        len(text),
        language,
    )
    return TranscribeResponse(text=text, language=language)


@app.get("/health")
def health() -> dict:
    return {"ok": True, "model": MODEL_NAME, "device": "cpu"}


@app.post("/transcribe", response_model=TranscribeResponse)
async def transcribe(request: Request) -> TranscribeResponse:
    content_type = request.headers.get("content-type", "")

    if content_type.startswith("application/json"):
        body = TranscribePathBody.model_validate(await request.json())
        audio_path = _assert_path_in_audio_dir(body.path)
        return _transcribe_file(audio_path)

    if content_type.startswith("multipart/form-data"):
        form = await request.form()
        upload = form.get("file")
        if upload is None or not hasattr(upload, "read"):
            raise HTTPException(status_code=400, detail="falta el campo file")
        filename = getattr(upload, "filename", "") or ""
        if not filename.lower().endswith(".wav"):
            raise HTTPException(status_code=400, detail="se espera un archivo .wav")
        data = await upload.read()
        if len(data) <= 44:
            raise HTTPException(status_code=400, detail="archivo vacío o demasiado pequeño")
        tmp: str | None = None
        try:
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
                f.write(data)
                tmp = f.name
            return _transcribe_file(Path(tmp))
        finally:
            if tmp:
                Path(tmp).unlink(missing_ok=True)

    raise HTTPException(
        status_code=400,
        detail="Content-Type debe ser application/json o multipart/form-data",
    )
