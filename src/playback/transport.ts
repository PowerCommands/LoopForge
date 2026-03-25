import * as Tone from "tone";
import type { GeneratedLoop, SavedLoop, TimedNote } from "../music/types";
import type { ChordEvent } from "../music/types";

type ScheduledChordEvent = Omit<ChordEvent, "time"> & { time: string };
type ScheduledNoteEvent = Omit<TimedNote, "time"> & { time: string };

export interface LoopPlaybackInstrumentRack {
  output: Tone.Volume;
  chordSynth: Tone.PolySynth;
  melodySynth: Tone.Synth;
  bassSynth: Tone.MonoSynth;
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
  const output = new Tone.Volume(0).toDestination();
  const chordSynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "triangle" },
    envelope: { attack: 0.02, release: 0.8 },
  }).connect(output);
  const melodySynth = new Tone.Synth({
    oscillator: { type: "sine" },
    envelope: { attack: 0.01, decay: 0.15, sustain: 0.25, release: 0.3 },
  }).connect(output);
  const bassSynth = new Tone.MonoSynth({
    oscillator: { type: "square" },
    filter: { Q: 2, type: "lowpass", rolloff: -24 },
    envelope: { attack: 0.02, decay: 0.2, sustain: 0.6, release: 0.4 },
    filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.8, baseFrequency: 120, octaves: 2 },
  }).connect(output);

  return {
    output,
    chordSynth,
    melodySynth,
    bassSynth,
    dispose: () => {
      chordSynth.dispose();
      melodySynth.dispose();
      bassSynth.dispose();
      output.dispose();
    },
  };
}

export function createLoopParts(
  loop: GeneratedLoop,
  rack: Pick<LoopPlaybackInstrumentRack, "chordSynth" | "melodySynth" | "bassSynth">,
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
        rack.chordSynth.triggerAttackRelease(
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
        rack.melodySynth.triggerAttackRelease(
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
        rack.bassSynth.triggerAttackRelease(
          note.note,
          noteDurationToTransportTime(note.duration),
          time,
          note.velocity,
        );
      }, bassEvents),
    );
  }

  return parts;
}

class LoopPlaybackEngine {
  private rack = createLoopPlaybackInstrumentRack();

  private parts: Tone.Part[] = [];
  private scheduledEventIds: number[] = [];

  async play(loop: GeneratedLoop): Promise<void> {
    await Tone.start();
    this.stop();
    this.setTempo(loop.settings.tempo);
    Tone.Transport.loop = true;
    Tone.Transport.loopEnd = `${loop.settings.length}m`;
    this.parts = this.createParts(loop);
    this.parts.forEach((part) => part.start(0));
    Tone.Transport.start();
  }

  async playLoopOnce(loop: GeneratedLoop): Promise<void> {
    await Tone.start();
    this.stop();
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

    await Tone.start();
    this.stop();
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
  }

  stop(): void {
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    this.scheduledEventIds.forEach((eventId) => Tone.Transport.clear(eventId));
    this.scheduledEventIds = [];
    this.parts.forEach((part) => part.dispose());
    this.parts = [];
  }

  dispose(): void {
    this.stop();
    this.rack.dispose();
  }

  private createParts(loop: GeneratedLoop, startBeat = 0): Tone.Part[] {
    return createLoopParts(loop, this.rack, startBeat);
  }
}

export const playbackEngine = new LoopPlaybackEngine();

export function flattenLoopNotes(loop: GeneratedLoop): TimedNote[] {
  return [...loop.melody, ...loop.bass];
}
