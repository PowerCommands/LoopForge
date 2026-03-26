import { Note } from "tonal";
import type { ChordEvent, GeneratedLoop, LayerName, LoopSettings, TimedNote } from "./types";

export const PIANO_ROLL_STEPS_PER_BEAT = 4;
const DEFAULT_CHORD_VELOCITY = 0.55;
const TRANSPOSE_LIMITS: Record<LayerName, { min: number; max: number }> = {
  chords: { min: 36, max: 84 },
  melody: { min: 48, max: 96 },
  bass: { min: 28, max: 72 },
};

export interface EditableLoopNote {
  id: string;
  layer: LayerName;
  pitch: number;
  startStep: number;
  durationSteps: number;
}

export interface EditableLoop {
  id: string;
  settings: LoopSettings;
  totalBeats: number;
  totalSteps: number;
  notes: EditableLoopNote[];
}

export function cloneEditableLoop(loop: EditableLoop): EditableLoop {
  return {
    ...loop,
    settings: {
      ...loop.settings,
      layers: { ...loop.settings.layers },
      sequence: { ...loop.settings.sequence },
    },
    notes: loop.notes.map((note) => ({ ...note })),
  };
}

export function editableLoopsEqual(left: EditableLoop, right: EditableLoop): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function createEditableNoteId(layer: LayerName, seed: string): string {
  return `${layer}-edit-${seed}`;
}

function getPitchName(midi: number): string {
  return Note.fromMidi(midi) ?? `C4`;
}

function roundToStep(beats: number): number {
  return Math.max(0, Math.round(beats * PIANO_ROLL_STEPS_PER_BEAT));
}

function noteToEditable(layer: LayerName, note: TimedNote, index: number): EditableLoopNote {
  const pitch = Note.midi(note.note) ?? 60;

  return {
    id: createEditableNoteId(layer, `${index}-${roundToStep(note.time)}`),
    layer,
    pitch,
    startStep: roundToStep(note.time),
    durationSteps: Math.max(1, roundToStep(note.duration)),
  };
}

function chordToEditable(chord: ChordEvent, chordIndex: number): EditableLoopNote[] {
  return chord.notes.flatMap((noteName, noteIndex) => {
    const pitch = Note.midi(noteName);

    if (pitch === null) {
      return [];
    }

    return {
      id: createEditableNoteId("chords", `${chordIndex}-${noteIndex}-${roundToStep(chord.time)}`),
      layer: "chords",
      pitch,
      startStep: roundToStep(chord.time),
      durationSteps: Math.max(1, roundToStep(chord.duration)),
    };
  });
}

function editableToTimedNote(note: EditableLoopNote): TimedNote {
  return {
    note: getPitchName(note.pitch),
    time: note.startStep / PIANO_ROLL_STEPS_PER_BEAT,
    duration: note.durationSteps / PIANO_ROLL_STEPS_PER_BEAT,
    velocity: note.layer === "bass" ? 0.84 : 0.76,
  };
}

function buildChordSymbol(noteNames: string[]): string {
  const pitchClasses = noteNames
    .map((note) => Note.pitchClass(note))
    .filter((value): value is string => Boolean(value));

  return pitchClasses.length > 0 ? pitchClasses.join("-") : "Edited";
}

function groupChordNotes(notes: EditableLoopNote[]): ChordEvent[] {
  const grouped = new Map<string, EditableLoopNote[]>();

  notes.forEach((note) => {
    const key = `${note.startStep}:${note.durationSteps}`;
    const current = grouped.get(key);

    if (current) {
      current.push(note);
    } else {
      grouped.set(key, [note]);
    }
  });

  return [...grouped.entries()]
    .sort(([left], [right]) => {
      const [leftStart] = left.split(":").map(Number);
      const [rightStart] = right.split(":").map(Number);

      return leftStart - rightStart;
    })
    .map(([key, group], index) => {
      const [startStep, durationSteps] = key.split(":").map(Number);
      const sortedNotes = [...group].sort((left, right) => left.pitch - right.pitch);
      const noteNames = sortedNotes.map((note) => getPitchName(note.pitch));
      const root = noteNames[0] ?? "C3";

      return {
        symbol: buildChordSymbol(noteNames),
        notes: noteNames,
        root,
        bar: Math.floor(startStep / (PIANO_ROLL_STEPS_PER_BEAT * 4)),
        time: startStep / PIANO_ROLL_STEPS_PER_BEAT,
        duration: durationSteps / PIANO_ROLL_STEPS_PER_BEAT,
      };
    });
}

export function createEditableLoopFromGeneratedLoop(loop: GeneratedLoop): EditableLoop {
  return {
    id: loop.id,
    settings: loop.settings,
    totalBeats: loop.totalBeats,
    totalSteps: loop.totalBeats * PIANO_ROLL_STEPS_PER_BEAT,
    notes: [
      ...loop.chords.flatMap((chord, index) => chordToEditable(chord, index)),
      ...loop.melody.map((note, index) => noteToEditable("melody", note, index)),
      ...loop.bass.map((note, index) => noteToEditable("bass", note, index)),
    ],
  };
}

export function createGeneratedLoopFromEditableLoop(editableLoop: EditableLoop, tempoOverride?: number): GeneratedLoop {
  const chordNotes = editableLoop.notes.filter((note) => note.layer === "chords");
  const melody = editableLoop.notes
    .filter((note) => note.layer === "melody")
    .sort((left, right) => left.startStep - right.startStep || left.pitch - right.pitch)
    .map((note) => ({
      ...editableToTimedNote(note),
      velocity: editableToTimedNote(note).velocity,
    }));
  const bass = editableLoop.notes
    .filter((note) => note.layer === "bass")
    .sort((left, right) => left.startStep - right.startStep || left.pitch - right.pitch)
    .map((note) => ({
      ...editableToTimedNote(note),
      velocity: 0.84,
    }));

  return {
    id: editableLoop.id,
    settings: {
      ...editableLoop.settings,
      tempo: tempoOverride ?? editableLoop.settings.tempo,
    },
    totalBeats: editableLoop.totalBeats,
    chords: groupChordNotes(chordNotes),
    melody,
    bass,
  };
}

export function clampEditableNoteToLoop(note: EditableLoopNote, totalSteps: number): EditableLoopNote {
  const safeDuration = Math.max(1, note.durationSteps);
  const maxStartStep = Math.max(0, totalSteps - safeDuration);
  const pitchLimits = TRANSPOSE_LIMITS[note.layer];

  return {
    ...note,
    pitch: Math.max(pitchLimits.min, Math.min(pitchLimits.max, note.pitch)),
    startStep: Math.max(0, Math.min(maxStartStep, note.startStep)),
    durationSteps: Math.min(Math.max(1, safeDuration), totalSteps),
  };
}

export function createNewEditableNote(layer: LayerName, pitch: number, startStep: number, totalSteps: number): EditableLoopNote {
  return clampEditableNoteToLoop(
    {
      id: createEditableNoteId(layer, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
      layer,
      pitch,
      startStep,
      durationSteps: 1,
    },
    totalSteps,
  );
}

export function transposeEditableLoop(loop: EditableLoop, semitones: number): EditableLoop {
  if (semitones === 0) {
    return cloneEditableLoop(loop);
  }

  return {
    ...loop,
    notes: loop.notes.map((note) =>
      // Clamp each transposed note so global shifts stay usable at the edges of the piano roll.
      clampEditableNoteToLoop(
        {
          ...note,
          pitch: note.pitch + semitones,
        },
        loop.totalSteps,
      ),
    ),
  };
}
