"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFlow } from "../flow-context";
import { Stepper } from "@/components/stepper";
import { useRecorder, type RecordingResult } from "@/lib/use-recorder";
import { enqueueRegistro } from "@/lib/queue/enqueue";

const WAVE_DELAYS = ["0.1s", "0.3s", "0.2s", "0.5s", "0.4s", "0.6s", "0.2s"];
const MAX_MS = 60_000;
const AMBER_FROM_MS = 10_000; // últimos 10 s: el ring vira a amber

const RING_R = 82;
const RING_C = 2 * Math.PI * RING_R;

export default function RecordingPage() {
  const router = useRouter();
  const { tipo, beneficiario, programa } = useFlow();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // The audio never blocks on the network here: we save it to the offline queue
  // and hand off to the status screen. The Service Worker uploads when it can.
  const handleResult = async (result: RecordingResult | null) => {
    if (!result) {
      setSaveError("No se grabó audio. Inténtalo de nuevo.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const id = await enqueueRegistro({
        wavBlob: result.blob,
        durationMs: result.durationMs,
        tipo: tipo ?? null,
        programa: programa ?? null,
        beneficiario:
          beneficiario?.nombre || beneficiario?.dni
            ? {
                nombre: beneficiario?.nombre ?? "",
                apellido: beneficiario?.apellido ?? "",
                dni: beneficiario?.dni ?? "",
              }
            : null,
      });
      setSaving(false);
      router.push(`/estado/${id}`);
    } catch (e) {
      console.error("[grabar] enqueue failed:", e);
      setSaveError("No se pudo guardar el registro. Inténtalo de nuevo.");
      setSaving(false);
    }
  };

  const { recording, elapsedMs, error, start, stop } = useRecorder(MAX_MS, handleResult);

  const nombreCompleto =
    beneficiario?.apellido && beneficiario?.nombre
      ? `${beneficiario.apellido} ${beneficiario.nombre}`
      : beneficiario?.nombre ?? "";
  const showBeneficiary = tipo !== "grupal" && nombreCompleto;
  const remainingMs = Math.max(0, MAX_MS - elapsedMs);
  const remainingSec = Math.ceil(remainingMs / 1000);
  const progress = Math.min(1, elapsedMs / MAX_MS);
  const amber = recording && remainingMs <= AMBER_FROM_MS;

  const onMicClick = async () => {
    if (saving) return;
    if (!recording) {
      await start();
      return;
    }
    await handleResult(await stop());
  };

  const guidance = saving
    ? "Guardando el registro en el dispositivo…"
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

      <main className="flex-grow flex flex-col items-center justify-center px-container-margin pt-20 pb-24">
        <div className="w-full max-w-md mb-stack-lg">
          <Stepper current={3} />
        </div>

        {showBeneficiary && (
          <div className="w-full max-w-md rounded-xl p-4 mb-stack-lg flex items-center gap-3 bg-surface-container-low">
            <div className="bg-primary/10 text-primary p-2 rounded-full">
              <span className="material-symbols-outlined text-[20px]">person</span>
            </div>
            <div>
              <p className="font-label-md text-label-md text-on-surface-variant">Beneficiario</p>
              <p className="font-body-md text-body-md text-on-surface font-semibold">
                {nombreCompleto}
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

            {/* Ring de progreso: se llena durante los 60 s; vira a amber al final. */}
            <svg
              className="absolute z-0 -rotate-90"
              width="176"
              height="176"
              viewBox="0 0 176 176"
              aria-hidden="true"
            >
              <circle
                cx="88"
                cy="88"
                r={RING_R}
                fill="none"
                strokeWidth="6"
                className="stroke-surface-container-highest"
              />
              <circle
                cx="88"
                cy="88"
                r={RING_R}
                fill="none"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={RING_C}
                strokeDashoffset={RING_C * (1 - progress)}
                style={{
                  stroke: amber
                    ? "var(--color-tertiary-fixed-dim)"
                    : "var(--color-primary)",
                  transition: "stroke 700ms linear, stroke-dashoffset 200ms linear",
                }}
              />
            </svg>

            <button
              onClick={onMicClick}
              disabled={saving}
              aria-label={recording ? "Detener grabación" : "Iniciar grabación"}
              className="relative z-10 w-32 h-32 bg-primary rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform duration-150 disabled:opacity-60"
            >
              {saving ? (
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

          {/* Segundos restantes — solo mientras graba, texto pequeño. */}
          {recording && (
            <span className="font-caption text-caption text-on-surface-variant tabular-nums">
              {remainingSec} s
            </span>
          )}

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

          {(error || saveError) && (
            <p className="text-error text-body-md text-center">{error ?? saveError}</p>
          )}
        </div>
      </main>
    </div>
  );
}
