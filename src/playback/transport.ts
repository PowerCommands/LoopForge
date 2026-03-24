import * as Tone from "tone";
import type { GeneratedLoop, TimedNote } from "../music/types";
import type { ChordEvent } from "../music/types";

type ScheduledChordEvent = Omit<ChordEvent, "time"> & { time: string };
type ScheduledNoteEvent = Omit<TimedNote, "time"> & { time: string };

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

class LoopPlaybackEngine {
  private chordSynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "triangle" },
    envelope: { attack: 0.02, release: 0.8 },
  }).toDestination();

  private melodySynth = new Tone.Synth({
    oscillator: { type: "sine" },
    envelope: { attack: 0.01, decay: 0.15, sustain: 0.25, release: 0.3 },
  }).toDestination();

  private bassSynth = new Tone.MonoSynth({
    oscillator: { type: "square" },
    filter: { Q: 2, type: "lowpass", rolloff: -24 },
    envelope: { attack: 0.02, decay: 0.2, sustain: 0.6, release: 0.4 },
    filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.8, baseFrequency: 120, octaves: 2 },
  }).toDestination();

  private parts: Tone.Part[] = [];

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

  setTempo(tempo: number): void {
    Tone.Transport.bpm.value = tempo;
  }

  stop(): void {
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    this.parts.forEach((part) => part.dispose());
    this.parts = [];
  }

  dispose(): void {
    this.stop();
    this.chordSynth.dispose();
    this.melodySynth.dispose();
    this.bassSynth.dispose();
  }

  private createParts(loop: GeneratedLoop): Tone.Part[] {
    const parts: Tone.Part[] = [];

    if (loop.chords.length > 0) {
      const chordEvents: ScheduledChordEvent[] = loop.chords.map((chord) => ({
        ...chord,
        time: beatToTransportTime(chord.time),
      }));

      parts.push(
        new Tone.Part<ScheduledChordEvent>((time, chord) => {
          this.chordSynth.triggerAttackRelease(
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
        time: beatToTransportTime(note.time),
      }));

      parts.push(
        new Tone.Part<ScheduledNoteEvent>((time, note) => {
          this.melodySynth.triggerAttackRelease(
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
        time: beatToTransportTime(note.time),
      }));

      parts.push(
        new Tone.Part<ScheduledNoteEvent>((time, note) => {
          this.bassSynth.triggerAttackRelease(
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
}

export const playbackEngine = new LoopPlaybackEngine();

export function flattenLoopNotes(loop: GeneratedLoop): TimedNote[] {
  return [...loop.melody, ...loop.bass];
}
