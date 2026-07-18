// Browser-side helpers for Taylor Voice: record → WAV blob for STT, and play TTS audio.

export const VOICE_AUTOSPEAK_KEY = "taylor.voice.autospeak";

export function voiceSupported(): boolean {
  if (typeof window === "undefined") return false;
  return !!navigator.mediaDevices?.getUserMedia && typeof window.AudioContext !== "undefined";
}

export function getAutoSpeak(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(VOICE_AUTOSPEAK_KEY) === "1";
}

export function setAutoSpeak(on: boolean) {
  if (typeof window === "undefined") return;
  if (on) window.localStorage.setItem(VOICE_AUTOSPEAK_KEY, "1");
  else window.localStorage.removeItem(VOICE_AUTOSPEAK_KEY);
}

/** Recorder that captures mono PCM via Web Audio and encodes a complete 16-bit WAV blob. */
export class VoiceRecorder {
  private stream: MediaStream | null = null;
  private ctx: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private chunks: Float32Array[] = [];
  private sampleRate = 16000;

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AC();
    this.sampleRate = this.ctx.sampleRate;
    this.source = this.ctx.createMediaStreamSource(this.stream);
    // ScriptProcessor is deprecated but universally supported; AudioWorklet needs a separate module.
    this.processor = this.ctx.createScriptProcessor(4096, 1, 1);
    this.processor.onaudioprocess = (e) => {
      const data = e.inputBuffer.getChannelData(0);
      this.chunks.push(new Float32Array(data));
    };
    this.source.connect(this.processor);
    this.processor.connect(this.ctx.destination);
  }

  async stop(): Promise<Blob> {
    this.processor?.disconnect();
    this.source?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    const inSampleRate = this.sampleRate;
    const chunks = this.chunks;
    this.chunks = [];
    await this.ctx?.close();
    this.ctx = null;

    // Concatenate float samples.
    const total = chunks.reduce((n, c) => n + c.length, 0);
    const merged = new Float32Array(total);
    let o = 0;
    for (const c of chunks) {
      merged.set(c, o);
      o += c.length;
    }
    // Downsample to 16 kHz to shrink upload.
    const targetRate = 16000;
    const down = inSampleRate === targetRate ? merged : downsample(merged, inSampleRate, targetRate);
    return encodeWav(down, targetRate);
  }

  cancel() {
    try {
      this.processor?.disconnect();
      this.source?.disconnect();
      this.stream?.getTracks().forEach((t) => t.stop());
      void this.ctx?.close();
    } catch {
      /* ignore */
    }
    this.chunks = [];
    this.ctx = null;
  }
}

function downsample(input: Float32Array, from: number, to: number): Float32Array {
  if (to >= from) return input;
  const ratio = from / to;
  const outLen = Math.floor(input.length / ratio);
  const out = new Float32Array(outLen);
  let iOut = 0;
  let iIn = 0;
  while (iOut < outLen) {
    const next = Math.floor((iOut + 1) * ratio);
    let sum = 0;
    let count = 0;
    for (; iIn < next && iIn < input.length; iIn++) {
      sum += input[iIn];
      count++;
    }
    out[iOut++] = count > 0 ? sum / count : 0;
  }
  return out;
}

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeString = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // subchunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let off = 44;
  for (let i = 0; i < samples.length; i++, off += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

export async function transcribeBlob(blob: Blob): Promise<string> {
  const fd = new FormData();
  fd.append("file", blob, "recording.wav");
  const res = await fetch("/api/voice/transcribe", { method: "POST", body: fd });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || `Transcription failed (${res.status})`);
  }
  const json = (await res.json()) as { text?: string };
  return (json.text ?? "").trim();
}

let currentAudio: HTMLAudioElement | null = null;

/** Speak a text via the server TTS route. Cancels any playing utterance. */
export async function speakText(text: string, opts?: { voice?: string }): Promise<void> {
  stopSpeaking();
  const res = await fetch("/api/voice/speak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice: opts?.voice ?? "shimmer" }),
  });
  if (!res.ok) throw new Error(`Speech failed (${res.status})`);
  const buf = await res.arrayBuffer();
  const url = URL.createObjectURL(new Blob([buf], { type: "audio/mpeg" }));
  const audio = new Audio(url);
  currentAudio = audio;
  audio.onended = () => URL.revokeObjectURL(url);
  audio.onerror = () => URL.revokeObjectURL(url);
  await audio.play().catch(() => {
    URL.revokeObjectURL(url);
  });
}

export function stopSpeaking() {
  if (currentAudio) {
    try {
      currentAudio.pause();
    } catch {
      /* ignore */
    }
    currentAudio = null;
  }
}