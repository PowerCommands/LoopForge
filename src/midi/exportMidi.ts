import { Midi } from "@tonejs/midi";
import { Note } from "tonal";
import type { GeneratedLoop, SavedLoop, TimedNote } from "../music/types";

type LayerName = "chords" | "melody" | "bass";

interface MidiTrackMap {
  chords?: ReturnType<Midi["addTrack"]>;
  melody?: ReturnType<Midi["addTrack"]>;
  bass?: ReturnType<Midi["addTrack"]>;
}

function clampVelocity(value: number): number {
  return Math.min(0.95, Math.max(0.35, value));
}

function moodVelocityOffset(loop: GeneratedLoop): number {
  switch (loop.settings.mood) {
    case "Sparse":
      return -0.08;
    case "Calm":
      return -0.06;
    case "Dark":
      return -0.03;
    case "Bright":
      return 0.03;
    case "Intense":
      return 0.06;
    case "Balanced":
    default:
      return 0;
  }
}

function toTicks(beats: number, ppq: number): number {
  return Math.round(beats * ppq);
}

function addNotes(
  track: ReturnType<Midi["addTrack"]>,
  notes: TimedNote[],
  ppq: number,
  velocityForNote: (note: TimedNote, index: number) => number,
): void {
  notes.forEach((note, index) => {
    const midiValue = Note.midi(note.note);

    if (midiValue === null) {
      return;
    }

    track.addNote({
      midi: midiValue,
      ticks: toTicks(note.time, ppq),
      durationTicks: toTicks(note.duration, ppq),
      velocity: clampVelocity(velocityForNote(note, index)),
    });
  });
}

function createExportFilename(loop: GeneratedLoop): string {
  const key = loop.settings.key.replace("#", "sharp").replace("b", "flat");
  const scale = loop.settings.scale.toLowerCase();
  const mood = loop.settings.mood.toLowerCase();

  return `loop-forge_${key}_${scale}_${loop.settings.tempo}_${mood}.mid`;
}

function getArrangementSeconds(savedLoops: SavedLoop[]): number {
  return savedLoops.reduce((total, savedLoop) => total + savedLoop.seconds, 0);
}

function createArrangementExportFilename(savedLoops: SavedLoop[], filename: string): string {
  const safeBaseName = filename.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").replace(/\.+$/, "");
  const baseName = safeBaseName.length > 0 ? safeBaseName : "loop-forge-arrangement";
  const tempo = savedLoops[0]?.loop.settings.tempo ?? 120;
  const seconds = getArrangementSeconds(savedLoops);

  return sanitizeMidiFilename(`${baseName}_${tempo}_${seconds}sec`);
}

function sanitizeMidiFilename(filename: string): string {
  const trimmed = filename.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-");
  const withoutExtension = trimmed.toLowerCase().endsWith(".mid") ? trimmed.slice(0, -4) : trimmed;
  const safeName = withoutExtension.trim().replace(/\.+$/, "");

  return `${safeName.length > 0 ? safeName : "loop-forge-arrangement"}.mid`;
}

function getOrCreateTrack(midi: Midi, tracks: MidiTrackMap, layer: LayerName) {
  if (!tracks[layer]) {
    const track = midi.addTrack();
    track.name = layer.charAt(0).toUpperCase() + layer.slice(1);
    tracks[layer] = track;
  }

  return tracks[layer]!;
}

function appendLoopToTracks(
  midi: Midi,
  tracks: MidiTrackMap,
  loop: GeneratedLoop,
  startBeat: number,
): void {
  const ppq = midi.header.ppq;
  const velocityOffset = moodVelocityOffset(loop);

  if (loop.chords.length > 0) {
    const chordsTrack = getOrCreateTrack(midi, tracks, "chords");
    loop.chords.forEach((chord, chordIndex) => {
      const chordVelocity = clampVelocity(0.62 + velocityOffset + (chordIndex % 2 === 0 ? 0.03 : -0.02));
      const chordDuration = Math.max(1, chord.duration - 0.25);

      chord.notes.forEach((noteName) => {
        const midiValue = Note.midi(noteName);

        if (midiValue === null) {
          return;
        }

        chordsTrack.addNote({
          midi: midiValue,
          ticks: toTicks(startBeat + chord.time, ppq),
          durationTicks: toTicks(chordDuration, ppq),
          velocity: chordVelocity,
        });
      });
    });
  }

  if (loop.melody.length > 0) {
    const melodyTrack = getOrCreateTrack(midi, tracks, "melody");
    addNotes(
      melodyTrack,
      loop.melody.map((note) => ({ ...note, time: note.time + startBeat })),
      ppq,
      (note, index) => {
        const beatInBar = note.time % 4;
        const beatAccent = beatInBar === 0 || beatInBar === 2 ? 0.04 : -0.02;
        const phraseMotion = index % 4 === 0 ? 0.02 : 0;

        return note.velocity + velocityOffset + beatAccent + phraseMotion;
      },
    );
  }

  if (loop.bass.length > 0) {
    const bassTrack = getOrCreateTrack(midi, tracks, "bass");
    addNotes(
      bassTrack,
      loop.bass.map((note) => ({ ...note, time: note.time + startBeat })),
      ppq,
      (note, index) => {
        const firstHitInBar = note.time % 4 === 0;
        const accent = firstHitInBar ? 0.03 : -0.03;
        const cycleVariation = index % 4 === 2 ? 0.02 : 0;

        return note.velocity + velocityOffset + accent + cycleVariation;
      },
    );
  }
}

function downloadMidiFile(midi: Midi, filename: string): void {
  const bytes = midi.toArray();
  const safeBytes = new Uint8Array(bytes.length);
  safeBytes.set(bytes);
  const blob = new Blob([safeBytes], { type: "audio/midi" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function createArrangementMidi(savedLoops: SavedLoop[]): Midi {
  const midi = new Midi();
  const ppq = midi.header.ppq;
  const tracks: MidiTrackMap = {};
  let startBeat = 0;

  midi.header.tempos = [
    {
      ticks: 0,
      bpm: savedLoops[0].loop.settings.tempo,
    },
  ];
  midi.header.timeSignatures.push({
    measures: 0,
    ticks: 0,
    timeSignature: [4, 4],
  });

  savedLoops.forEach((savedLoop, index) => {
    if (index > 0 && savedLoops[index - 1].loop.settings.tempo !== savedLoop.loop.settings.tempo) {
      midi.header.tempos.push({
        ticks: toTicks(startBeat, ppq),
        bpm: savedLoop.loop.settings.tempo,
      });
    }

    appendLoopToTracks(midi, tracks, savedLoop.loop, startBeat);
    startBeat += savedLoop.loop.totalBeats;
  });

  midi.header.update();

  return midi;
}

export function exportLoopToMidi(loop: GeneratedLoop): void {
  const midi = new Midi();
  midi.header.setTempo(loop.settings.tempo);
  midi.header.timeSignatures.push({
    measures: 0,
    ticks: 0,
    timeSignature: [4, 4],
  });

  appendLoopToTracks(midi, {}, loop, 0);
  midi.header.update();
  downloadMidiFile(midi, createExportFilename(loop));
}

export function exportArrangementToMidi(savedLoops: SavedLoop[]): void {
  if (savedLoops.length === 0) {
    return;
  }

  const requestedName = window.prompt("Arrangement MIDI filename", "loop-forge-arrangement")?.trim();

  if (requestedName === undefined) {
    return;
  }

  downloadMidiFile(createArrangementMidi(savedLoops), sanitizeMidiFilename(requestedName ?? "loop-forge-arrangement"));
}

export function downloadArrangementMidi(savedLoops: SavedLoop[], filename: string): void {
  if (savedLoops.length === 0) {
    return;
  }

  downloadMidiFile(createArrangementMidi(savedLoops), createArrangementExportFilename(savedLoops, filename));
}
