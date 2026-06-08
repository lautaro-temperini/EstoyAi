# QVAC OpenAI-compatible server for Railway.
#
# QVAC requires Node >= 22.17. node:22-bookworm-slim currently ships a 22.x
# release at or above that floor; if the base ever regresses, pin an explicit
# tag such as node:22.18-bookworm-slim instead.
FROM node:22-bookworm-slim

WORKDIR /app

# QVAC's native worker (bare runtime + Vulkan-backed llama.cpp/whisper.cpp
# addons) needs a full Vulkan runtime + a couple of shared libs the -slim image
# omits, or the worker fails to start and model preload times out. Per the QVAC
# Linux requirements: Vulkan loader + a Vulkan driver/ICD.
#   libatomic1           -> libatomic.so.1
#   libgomp1             -> OpenMP
#   libvulkan1           -> libvulkan.so.1 (Vulkan loader)
#   mesa-vulkan-drivers  -> a software Vulkan ICD (lavapipe) so a Vulkan device
#                           exists on this CPU-only/headless container
#   vulkan-tools         -> vulkaninfo, for debugging
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
     libatomic1 libgomp1 libvulkan1 mesa-vulkan-drivers vulkan-tools ffmpeg \
  && rm -rf /var/lib/apt/lists/*

# Install the QVAC CLI globally so `qvac` is on PATH.
RUN npm i -g @qvac/cli

# Model registry: maps friendly aliases -> QVAC model constants.
COPY infra/qvac/qvac.config.json /app/qvac.config.json

# Persistent model cache. By default qvac's registry-client stores downloaded
# models in a RANDOM /tmp dir per run, so every restart re-downloads the ~GBs.
# Pinning REGISTRY_STORAGE to a stable path keeps the cache warm across restarts
# — mount a Railway PERSISTENT VOLUME at /data so it actually survives deploys.
ENV REGISTRY_STORAGE=/data/qvac
RUN mkdir -p /data/qvac

# NOTE: Models are large (~GB each) and download on FIRST run, not at build
# time. On Railway: attach the volume at /data AND give the service enough
# MEMORY (several GB) so the models stay resident in RAM (no idle unload).

# Railway injects $PORT at runtime; default to 11434 locally.
EXPOSE 11434

# Shell-form CMD so $PORT / $QVAC_API_KEY expand. The --api-key flag is only
# appended when QVAC_API_KEY is non-empty (avoids passing an empty value).
CMD sh -c 'qvac serve openai \
  --config /app/qvac.config.json \
  -H 0.0.0.0 \
  -p "${PORT:-11434}" \
  --cors \
  ${QVAC_API_KEY:+--api-key "$QVAC_API_KEY"}'
