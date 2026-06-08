"use client";

import { useEffect, useRef, useState } from "react";

export interface RecordingResult {
  blob: Blob;
  durationMs: number;
  mimeType: string;
}

const TARGET_RATE = 16000; // Whisper wants 16 kHz mono
const LOG = "[recorder]";

/**
 * Microphone recorder for push-to-talk.
 *
 * Captures raw PCM via WebAudio and encodes a 16 kHz mono 16-bit WAV. We use
 * WAV (not MediaRecorder's webm/opus) because QVAC's audio decoder supports
 * wav/mp3/m4a/ogg/flac/aac but NOT webm — sending webm produced garbled/empty
 * transcripts. WAV also makes server-side duration + the 60s clamp work.
 *
 * Plain functions (no useCallback) — the React Compiler memoizes them.
 */
export function useRecorder(
  maxMs = 60_000,
  onMaxDuration?: (result: RecordingResult | null) => void,
) {
  const [recording, setRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Keep the latest auto-stop callback without re-creating the recorder.
  const onMaxRef = useRef(onMaxDuration);
  useEffect(() => {
    onMaxRef.current = onMaxDuration;
  }, [onMaxDuration]);

  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const procRef = useRef<ScriptProcessorNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const rateRef = useRef(TARGET_RATE);
  const startedAtRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimers() {
    if (tickRef.current) clearInterval(tickRef.current);
    if (autoStopRef.current) clearTimeout(autoStopRef.current);
    tickRef.current = null;
    autoStopRef.current = null;
  }

  function teardownAudio() {
    procRef.current?.disconnect();
    sourceRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    void ctxRef.current?.close();
    procRef.current = null;
    sourceRef.current = null;
    streamRef.current = null;
    ctxRef.current = null;
  }

  async function start() {
    if (ctxRef.current) return;
    setError(null);
    console.log(`${LOG} start(): requesting microphone…`);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;

      const Ctx: typeof AudioContext =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx({ sampleRate: TARGET_RATE });
      ctxRef.current = ctx;
      rateRef.current = ctx.sampleRate;
      console.log(`${LOG} AudioContext sampleRate=${ctx.sampleRate}`);

      const source = ctx.createMediaStreamSource(stream);
      const proc = ctx.createScriptProcessor(4096, 1, 1);
      chunksRef.current = [];
      proc.onaudioprocess = (e) => {
        chunksRef.current.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      };
      source.connect(proc);
      proc.connect(ctx.destination);
      sourceRef.current = source;
      procRef.current = proc;

      startedAtRef.current = Date.now();
      setRecording(true);
      setElapsedMs(0);
      console.log(`${LOG} recording started`);

      tickRef.current = setInterval(() => setElapsedMs(Date.now() - startedAtRef.current), 200);
      autoStopRef.current = setTimeout(async () => {
        console.log(`${LOG} max duration ${maxMs}ms reached — auto-stopping + sending`);
        const result = await stop();
        onMaxRef.current?.(result);
      }, maxMs);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo acceder al micrófono";
      console.error(`${LOG} getUserMedia failed:`, e);
      setError(msg);
      teardownAudio();
    }
  }

  function stop(): Promise<RecordingResult | null> {
    if (!ctxRef.current) return Promise.resolve(null);
    clearTimers();
    const durationMs = Math.min(Date.now() - startedAtRef.current, maxMs);
    const sourceRate = rateRef.current;
    const chunks = chunksRef.current;
    chunksRef.current = [];
    teardownAudio();
    setRecording(false);

    const merged = mergeChunks(chunks);
    const pcm = sourceRate === TARGET_RATE ? merged : downsample(merged, sourceRate, TARGET_RATE);
    const blob = encodeWav(pcm, TARGET_RATE);
    console.log(
      `${LOG} stop(): durationMs=${durationMs} sourceRate=${sourceRate} samples=${pcm.length} wavBytes=${blob.size}`,
    );
    if (blob.size <= 44) {
      console.warn(`${LOG} empty recording (no audio captured)`);
      return Promise.resolve(null);
    }
    return Promise.resolve({ blob, durationMs, mimeType: "audio/wav" });
  }

  useEffect(() => {
    return () => {
      clearTimers();
      teardownAudio();
    };
  }, []);

  return { recording, elapsedMs, error, start, stop };
}

function mergeChunks(chunks: Float32Array[]): Float32Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Float32Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

function downsample(input: Float32Array, from: number, to: number): Float32Array {
  if (to >= from) return input;
  const ratio = from / to;
  const outLen = Math.floor(input.length / ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(input.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = start; j < end; j++) sum += input[j] ?? 0;
    out[i] = sum / Math.max(1, end - start);
  }
  return out;
}

/** Encode mono Float32 PCM as a 16-bit WAV blob. */
function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  const dataLen = samples.length * 2;
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataLen, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits/sample
  writeStr(36, "data");
  view.setUint32(40, dataLen, true);
  let off = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i] ?? 0));
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    off += 2;
  }
  return new Blob([buffer], { type: "audio/wav" });
}
