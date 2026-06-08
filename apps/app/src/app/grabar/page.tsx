"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFlow } from "../flow-context";
import { useRecorder, type RecordingResult } from "@/lib/use-recorder";
import { useInferenceMode } from "@/lib/inference/mode";
import { inferTranscribe, inferExtract } from "@/lib/inference";
import {
  SYSTEM_PROMPT,
  EXTRACTION_JSON_SCHEMA,
  ASR_LANGUAGE,
  buildUserMessage,
  buildReport,
  isMeaningful,
} from "@/lib/reports/assemble";
import { putReport } from "@/lib/reports/store-client";
import { OfflineModelGate } from "../offline-model-gate";
import type { ReportMetadata } from "@/lib/reports/schema";

const WAVE_DELAYS = ["0.1s", "0.3s", "0.2s", "0.5s", "0.4s", "0.6s", "0.2s"];
const MAX_MS = 60_000;
const COUNTDOWN_FROM_MS = 10_000; // show the "quedan Ns" counter for the last 10s

function fmt(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60).toString().padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function RecordingPage() {
  const router = useRouter();
  const { tipo, beneficiario } = useFlow();
  const { mode } = useInferenceMode();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const upload = async (blob: Blob, durationMs: number, mimeType: string) => {
    setUploading(true);
    setUploadError(null);
    const ext = mimeType.includes("wav") ? "wav" : "webm";
    // Routed by mode: online → proxy upstream (ngrok/Railway); offline → local
    // qvac serve if it can do the job, else in-browser transformers.js. The
    // inference layer derives the actual model ids (and honors the level).
    const capturedAt = Date.now();
    const t0 = performance.now();
    try {
      // 1) Speech → text.
      console.log(`[grabar] transcribe (${mode}) — ${blob.size} bytes (${ext})…`);
      const transcript = await inferTranscribe(mode, blob, {
        language: ASR_LANGUAGE,
        filename: `registro.${ext}`,
      });
      console.log("[grabar] transcript:", JSON.stringify(transcript));
      if (!isMeaningful(transcript)) {
        setUploadError("No se detectó voz. Inténtalo de nuevo.");
        setUploading(false);
        return;
      }

      // 2) Text → structured report (LLM, grammar-constrained JSON).
      console.log(`[grabar] extracción (${mode})…`);
      const extraction = await inferExtract(
        mode,
        [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserMessage(transcript, capturedAt) },
        ],
        EXTRACTION_JSON_SCHEMA,
      );
      console.log("[grabar] extracción:", extraction);

      // 3) Assemble + persist locally (IndexedDB, offline-first).
      const metadata: ReportMetadata = {
        tipo: tipo ?? null,
        beneficiario:
          beneficiario?.nombre || beneficiario?.dni
            ? { nombre: beneficiario?.nombre ?? "", dni: beneficiario?.dni ?? "" }
            : null,
        sector: null,
        unidad: null,
        capturedAt,
        durationMs,
      };
      const report = buildReport(transcript, extraction, metadata);
      await putReport(report);
      console.log(
        `[grabar] guardado ${report.id} en ${Math.round(performance.now() - t0)}ms → /informe/${report.id}`,
      );
      router.push(`/informe/${report.id}`);
    } catch (e) {
      console.error("[grabar] inference failed:", e);
      setUploadError(
        "Fallo al procesar el informe. Verifica que el servidor QVAC esté activo.",
      );
      setUploading(false);
    }
  };

  // Single path for both manual stop and the 60s auto-stop, so reaching the
  // limit also sends the report (it used to stop without uploading).
  const handleResult = async (result: RecordingResult | null) => {
    console.log(
      "[grabar] recording result:",
      result
        ? { sizeBytes: result.blob.size, mimeType: result.mimeType, durationMs: result.durationMs }
        : null,
    );
    if (!result) {
      setUploadError("No se grabó audio. Inténtalo de nuevo.");
      return;
    }
    await upload(result.blob, result.durationMs, result.mimeType);
  };

  const { recording, elapsedMs, error, start, stop } = useRecorder(MAX_MS, handleResult);

  const showBeneficiary = tipo !== "grupal" && beneficiario?.nombre;
  const remainingMs = Math.max(0, MAX_MS - elapsedMs);
  const remainingSec = Math.ceil(remainingMs / 1000);
  const showCountdown = recording && remainingMs <= COUNTDOWN_FROM_MS;

  const onMicClick = async () => {
    if (uploading) return;
    if (!recording) {
      console.log("[grabar] mic tapped → start recording", { tipo, beneficiario });
      await start();
      return;
    }
    console.log("[grabar] mic tapped → stop recording");
    await handleResult(await stop());
  };

  const guidance = uploading
    ? "Procesando el informe en el dispositivo…"
    : "Habla con claridad sobre la atención brindada";

  return (
    <div className="min-h-screen flex flex-col">
      <header className="anim-fade fixed top-0 w-full z-50 flex justify-between items-center px-container-margin h-touch-target-min bg-surface border-b border-outline-variant">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            aria-label="Volver"
            className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-surface-container-low"
          >
            <span className="material-symbols-outlined text-primary">arrow_back</span>
          </button>
        </div>
      </header>

      <OfflineModelGate>
      <main className="flex-grow flex flex-col items-center justify-center px-container-margin pt-20 pb-24">
        {showBeneficiary && (
          <div className="w-full max-w-md rounded-xl p-4 mb-stack-lg flex items-center gap-3 bg-surface-container-low">
            <div className="bg-primary/10 text-primary p-2 rounded-full">
              <span className="material-symbols-outlined text-[20px]">person</span>
            </div>
            <div>
              <p className="font-label-md text-label-md text-on-surface-variant">
                Beneficiario
              </p>
              <p className="font-body-md text-body-md text-on-surface font-semibold">
                {beneficiario!.nombre}
              </p>
            </div>
          </div>
        )}

        <div className="anim-enter w-full max-w-md bg-surface-container-low border border-outline-variant rounded-xl p-8 flex flex-col items-center gap-8 relative overflow-hidden">
          <p className="font-body-lg text-body-lg text-on-surface-variant text-center px-4">
            {guidance}
          </p>

          <div className="relative flex items-center justify-center h-64 w-64">
            {recording && (
              <>
                <div className="absolute w-40 h-40 rounded-full bg-primary/20 recording-pulse" />
                <div
                  className="absolute w-40 h-40 rounded-full bg-primary/10 recording-pulse"
                  style={{ animationDelay: "0.5s" }}
                />
              </>
            )}
            <button
              onClick={onMicClick}
              disabled={uploading}
              aria-label={recording ? "Detener grabación" : "Iniciar grabación"}
              className="relative z-10 w-32 h-32 bg-primary rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform duration-150 disabled:opacity-60"
            >
              {uploading ? (
                <span className="material-symbols-outlined text-white text-[48px] animate-spin">
                  progress_activity
                </span>
              ) : (
                <span
                  className="material-symbols-outlined text-white text-[48px] fill"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {recording ? "stop" : "mic"}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-1.5 h-12">
            {WAVE_DELAYS.map((delay, i) => (
              <div
                key={i}
                className="w-1.5 bg-primary rounded-full"
                style={
                  recording
                    ? { animation: `wave 1.2s ease-in-out ${delay} infinite` }
                    : { height: "12px" }
                }
              />
            ))}
          </div>

          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full bg-error ${recording ? "animate-pulse" : "opacity-30"}`}
              />
              <span className="font-display-lg text-display-lg text-on-surface tracking-wider">
                {fmt(elapsedMs)}
              </span>
            </div>
            {showCountdown && (
              <span className="anim-fade font-caption text-caption text-error">
                Se enviará en {remainingSec} s
              </span>
            )}
          </div>

          {(error || uploadError) && (
            <p className="text-error text-body-md text-center">{error ?? uploadError}</p>
          )}
        </div>
      </main>
      </OfflineModelGate>
    </div>
  );
}
