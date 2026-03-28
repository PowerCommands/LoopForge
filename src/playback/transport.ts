import * as Tone from "tone";
import type { DrumEvent, DrumInstrument, GeneratedLoop, SavedLoop, TimedNote } from "../music/types";
import type { ChordEvent } from "../music/types";
import {
  disposeDrumSampler,
  ensureDrumSamplerLoaded,
  getDrumSamplerRack,
  type DrumSamplerRack,
} from "../lib/audio/drumSampler";
import {
  disposePianoSampler,
  ensurePianoSamplerLoaded,
  getPianoSamplerRack,
  type PianoSamplerRack,
} from "../lib/audio/pianoSampler";

type ScheduledChordEvent = Omit<ChordEvent, "time"> & { time: string };
type ScheduledNoteEvent = Omit<TimedNote, "time"> & { time: string };
type ScheduledDrumEvent = Omit<DrumEvent, "time"> & { time: string };

const DRUM_NOTE_MAP: Record<DrumInstrument, string> = {
  kick: "C1",
  snare: "D1",
  hihat: "F#1",
};

export interface LoopPlaybackInstrumentRack {
  output: Tone.Volume;
  drumsOutput: Tone.Volume;
  piano: Tone.Sampler;
  drums: Tone.Sampler;
  dispose: () => void;
}

function beatToTransportTime(beats: number): string {
  const bars = Math.floor(beats / 4);
  const beatsInBar = beats % 4;
  const quarters = Math.floor(beatsInBar);
  const sixteenths = Math.round((beatsInBar - quarters) * 4);

  return `${bars}:${quarters}:${sixteenths}`;
}

function noteDurationToTransportTime(beats: number): string {
  const quarters = Math.floor(beats);
  const sixteenths = Math.round((beats - quarters) * 4);

  if (quarters === 0) {
    return `0:0:${sixteenths}`;
  }

  return `0:${quarters}:${sixteenths}`;
}

function normalizeVolume(volume: number): number {
  return Math.min(1, Math.max(0, volume));
}

export function getLoopDurationSeconds(loop: GeneratedLoop): number {
  return (loop.totalBeats * 60) / loop.settings.tempo;
}

export function setRackVolume(output: Tone.Volume, volume: number): void {
  const normalizedVolume = normalizeVolume(volume);
  output.volume.value = Tone.gainToDb(normalizedVolume <= 0.001 ? 0.001 : normalizedVolume);
}

export function createLoopPlaybackInstrumentRack(): LoopPlaybackInstrumentRack {
  const pianoRack: PianoSamplerRack = getPianoSamplerRack();
  const drumRack: DrumSamplerRack = getDrumSamplerRack();

  return {
    output: pianoRack.output,
    drumsOutput: drumRack.output,
    piano: pianoRack.sampler,
    drums: drumRack.sampler,
    dispose: () => {
      disposePianoSampler();
      disposeDrumSampler();
    },
  };
}

export function createLoopParts(
  loop: GeneratedLoop,
  rack: Pick<LoopPlaybackInstrumentRack, "piano" | "drums">,
  startBeat = 0,
): Tone.Part[] {
  const parts: Tone.Part[] = [];

  if (loop.chords.length > 0) {
    const chordEvents: ScheduledChordEvent[] = loop.chords.map((chord) => ({
      ...chord,
      time: beatToTransportTime(chord.time + startBeat),
    }));

    parts.push(
      new Tone.Part<ScheduledChordEvent>((time, chord) => {
        rack.piano.triggerAttackRelease(
          chord.notes,
          noteDurationToTransportTime(chord.duration),
          time,
          0.55,
        );
      }, chordEvents),
    );
  }

  if (loop.melody.length > 0) {
    const melodyEvents: ScheduledNoteEvent[] = loop.melody.map((note) => ({
      ...note,
      time: beatToTransportTime(note.time + startBeat),
    }));

    parts.push(
      new Tone.Part<ScheduledNoteEvent>((time, note) => {
        rack.piano.triggerAttackRelease(
          note.note,
          noteDurationToTransportTime(note.duration),
          time,
          note.velocity,
        );
      }, melodyEvents),
    );
  }

  if (loop.bass.length > 0) {
    const bassEvents: ScheduledNoteEvent[] = loop.bass.map((note) => ({
      ...note,
      time: beatToTransportTime(note.time + startBeat),
    }));

    parts.push(
      new Tone.Part<ScheduledNoteEvent>((time, note) => {
        rack.piano.triggerAttackRelease(
          note.note,
          noteDurationToTransportTime(note.duration),
          time,
          note.velocity,
        );
      }, bassEvents),
    );
  }

  if (loop.drums.length > 0) {
    const drumEvents: ScheduledDrumEvent[] = loop.drums.map((event) => ({
      ...event,
      time: beatToTransportTime(event.time + startBeat),
    }));

    parts.push(
      new Tone.Part<ScheduledDrumEvent>((time, event) => {
        rack.drums.triggerAttackRelease(
          DRUM_NOTE_MAP[event.instrument],
          noteDurationToTransportTime(event.duration),
          time,
          event.velocity,
        );
      }, drumEvents),
    );
  }

  return parts;
}

class LoopPlaybackEngine {
  private rack = createLoopPlaybackInstrumentRack();

  private parts: Tone.Part[] = [];
  private scheduledEventIds: number[] = [];
  private playbackRequestId = 0;

  async play(loop: GeneratedLoop): Promise<void> {
    const requestId = ++this.playbackRequestId;
    await Tone.start();
    const isReady = await this.ensureReady();

    if (!isReady || requestId !== this.playbackRequestId) {
      return;
    }

    this.resetTransportState();
    this.setTempo(loop.settings.tempo);
    Tone.Transport.loop = true;
    Tone.Transport.loopEnd = `${loop.settings.length}m`;
    this.parts = this.createParts(loop);
    this.parts.forEach((part) => part.start(0));
    Tone.Transport.start();
  }

  async playLoopOnce(loop: GeneratedLoop): Promise<void> {
    const requestId = ++this.playbackRequestId;
    await Tone.start();
    const isReady = await this.ensureReady();

    if (!isReady || requestId !== this.playbackRequestId) {
      return;
    }

    this.resetTransportState();
    this.setTempo(loop.settings.tempo);
    Tone.Transport.loop = false;
    this.parts = this.createParts(loop);
    this.parts.forEach((part) => part.start(0));

    const stopId = Tone.Transport.scheduleOnce(() => {
      this.stop();
    }, beatToTransportTime(loop.totalBeats));

    this.scheduledEventIds.push(stopId);
    Tone.Transport.start();
  }

  async playArrangement(savedLoops: SavedLoop[]): Promise<void> {
    if (savedLoops.length === 0) {
      return;
    }

    const requestId = ++this.playbackRequestId;
    await Tone.start();
    const isReady = await this.ensureReady();

    if (!isReady || requestId !== this.playbackRequestId) {
      return;
    }

    this.resetTransportState();
    this.setTempo(savedLoops[0].loop.settings.tempo);
    Tone.Transport.loop = false;

    let startBeat = 0;
    let previousTempo = savedLoops[0].loop.settings.tempo;

    savedLoops.forEach((savedLoop, index) => {
      if (index > 0 && savedLoop.loop.settings.tempo !== previousTempo) {
        const scheduledId = Tone.Transport.scheduleOnce((time) => {
          Tone.Transport.bpm.setValueAtTime(savedLoop.loop.settings.tempo, time);
        }, beatToTransportTime(startBeat));

        this.scheduledEventIds.push(scheduledId);
        previousTempo = savedLoop.loop.settings.tempo;
      }

      this.parts.push(...this.createParts(savedLoop.loop, startBeat));
      startBeat += savedLoop.loop.totalBeats;
    });

    this.parts.forEach((part) => part.start(0));

    const stopId = Tone.Transport.scheduleOnce(() => {
      this.stop();
    }, beatToTransportTime(startBeat));

    this.scheduledEventIds.push(stopId);
    Tone.Transport.start();
  }

  setTempo(tempo: number): void {
    Tone.Transport.bpm.value = tempo;
  }

  setVolume(volume: number): void {
    setRackVolume(this.rack.output, volume);
    setRackVolume(this.rack.drumsOutput, volume);
  }

  preload(): Promise<boolean> {
    return this.ensureReady();
  }

  stop(): void {
    this.playbackRequestId += 1;
    this.resetTransportState();
  }

  dispose(): void {
    this.stop();
    this.rack.dispose();
  }

  private createParts(loop: GeneratedLoop, startBeat = 0): Tone.Part[] {
    return createLoopParts(loop, this.rack, startBeat);
  }

  private async ensureReady(): Promise<boolean> {
    try {
      await Promise.all([ensurePianoSamplerLoaded(), ensureDrumSamplerLoaded()]);
      return true;
    } catch {
      return false;
    }
  }

  private resetTransportState(): void {
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    this.scheduledEventIds.forEach((eventId) => Tone.Transport.clear(eventId));
    this.scheduledEventIds = [];
    this.parts.forEach((part) => part.dispose());
    this.parts = [];
    this.rack.piano.releaseAll();
    this.rack.drums.releaseAll();
  }
}

export const playbackEngine = new LoopPlaybackEngine();

export function flattenLoopNotes(loop: GeneratedLoop): TimedNote[] {
  return [...loop.melody, ...loop.bass];
}
