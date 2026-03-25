import * as Tone from "tone";
import type { GeneratedLoop, SavedLoop } from "../music/types";
import {
  createLoopPlaybackInstrumentRack,
  getLoopDurationSeconds,
  setRackVolume,
} from "../playback/transport";

const EXPORT_TAIL_SECONDS = 0.35;
type RenderedAudioBuffer = {
  numberOfChannels: number;
  sampleRate: number;
  length: number;
  getChannelData: (channel: number) => Float32Array<ArrayBufferLike>;
};

function sanitizeFilenamePart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[#]/g, "sharp")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function writeString(view: DataView, offset: number, value: string): void {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

export function createLoopWavFilename(loop: GeneratedLoop): string {
  const key = sanitizeFilenamePart(loop.settings.key);
  const scale = sanitizeFilenamePart(loop.settings.scale);

  return `loop-forge_${key}_${scale}_${loop.settings.tempo}bpm.wav`;
}

export function createArrangementWavFilename(name: string, savedLoops: SavedLoop[]): string {
  const safeName = sanitizeFilenamePart(name).replace(/\.+$/, "");
  const tempo = savedLoops[0]?.loop.settings.tempo ?? 120;
  const seconds = savedLoops.reduce((total, savedLoop) => total + savedLoop.seconds, 0);

  return `${safeName.length > 0 ? safeName : "loop-forge-arrangement"}_${tempo}_${seconds}sec.wav`;
}

function beatToSeconds(beats: number, tempo: number): number {
  return (beats * 60) / tempo;
}

function scheduleLoopOffline(
  rack: ReturnType<typeof createLoopPlaybackInstrumentRack>,
  loop: GeneratedLoop,
  startSeconds: number,
): void {
  const tempo = loop.settings.tempo;

  loop.chords.forEach((chord) => {
    rack.chordSynth.triggerAttackRelease(
      chord.notes,
      beatToSeconds(chord.duration, tempo),
      startSeconds + beatToSeconds(chord.time, tempo),
      0.55,
    );
  });

  loop.melody.forEach((note) => {
    rack.melodySynth.triggerAttackRelease(
      note.note,
      beatToSeconds(note.duration, tempo),
      startSeconds + beatToSeconds(note.time, tempo),
      note.velocity,
    );
  });

  loop.bass.forEach((note) => {
    rack.bassSynth.triggerAttackRelease(
      note.note,
      beatToSeconds(note.duration, tempo),
      startSeconds + beatToSeconds(note.time, tempo),
      note.velocity,
    );
  });
}

async function renderLoopToAudioBuffer(
  loop: GeneratedLoop,
  volume: number,
  tailSeconds: number,
): Promise<RenderedAudioBuffer> {
  const renderDuration = getLoopDurationSeconds(loop) + tailSeconds;

  return Tone.Offline(({ transport }) => {
    const rack = createLoopPlaybackInstrumentRack();
    scheduleLoopOffline(rack, loop, 0);

    setRackVolume(rack.output, volume);
    transport.bpm.value = loop.settings.tempo;
    transport.loop = false;
    transport.start(0);

    transport.scheduleOnce(() => {
      rack.dispose();
    }, renderDuration);
  }, renderDuration);
}

export async function renderCurrentLoopToAudioBuffer(loop: GeneratedLoop, volume: number): Promise<RenderedAudioBuffer> {
  return renderLoopToAudioBuffer(loop, volume, EXPORT_TAIL_SECONDS);
}

function concatRenderedAudioBuffers(buffers: RenderedAudioBuffer[]): RenderedAudioBuffer {
  const sampleRate = buffers[0]?.sampleRate ?? 44100;
  const numberOfChannels = Math.max(...buffers.map((buffer) => buffer.numberOfChannels));
  const totalLength = buffers.reduce((sum, buffer) => sum + buffer.length, 0);
  const channels = Array.from({ length: numberOfChannels }, () => new Float32Array(totalLength));
  let writeOffset = 0;

  buffers.forEach((buffer) => {
    for (let channelIndex = 0; channelIndex < numberOfChannels; channelIndex += 1) {
      const sourceChannel = buffer.getChannelData(Math.min(channelIndex, buffer.numberOfChannels - 1));
      channels[channelIndex].set(sourceChannel, writeOffset);
    }

    writeOffset += buffer.length;
  });

  return {
    numberOfChannels,
    sampleRate,
    length: totalLength,
    getChannelData: (channel: number) => channels[channel] ?? channels[0] ?? new Float32Array(0),
  };
}

export async function renderArrangementToAudioBuffer(savedLoops: SavedLoop[], volume: number): Promise<RenderedAudioBuffer> {
  if (savedLoops.length === 0) {
    throw new Error("No arrangement loops are available for WAV export.");
  }

  const renderedSegments: RenderedAudioBuffer[] = [];

  for (let index = 0; index < savedLoops.length; index += 1) {
    const savedLoop = savedLoops[index];
    const tailSeconds = index === savedLoops.length - 1 ? EXPORT_TAIL_SECONDS : 0;
    const renderedSegment = await renderLoopToAudioBuffer(savedLoop.loop, volume, tailSeconds);

    renderedSegments.push(renderedSegment);
  }

  return concatRenderedAudioBuffers(renderedSegments);
}

export function audioBufferToWavBlob(audioBuffer: RenderedAudioBuffer): Blob {
  const numberOfChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const dataLength = audioBuffer.length * numberOfChannels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numberOfChannels * bytesPerSample, true);
  view.setUint16(32, numberOfChannels * bytesPerSample, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataLength, true);

  let offset = 44;

  for (let sampleIndex = 0; sampleIndex < audioBuffer.length; sampleIndex += 1) {
    for (let channelIndex = 0; channelIndex < numberOfChannels; channelIndex += 1) {
      const channelData = audioBuffer.getChannelData(channelIndex);
      const clampedSample = Math.max(-1, Math.min(1, channelData[sampleIndex] ?? 0));
      const pcmSample = clampedSample < 0 ? clampedSample * 0x8000 : clampedSample * 0x7fff;

      view.setInt16(offset, Math.round(pcmSample), true);
      offset += bytesPerSample;
    }
  }

  return new Blob([buffer], { type: "audio/wav" });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(url);
}
