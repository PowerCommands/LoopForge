import { Note } from "tonal";
import type { GeneratedLoop, LayerName } from "../music/types";

export type VisualizationLayer = LayerName;

export interface VisualizedNote {
  id: string;
  pitch: number;
  pitchName: string;
  startBeat: number;
  durationBeats: number;
  layer: VisualizationLayer;
}

export interface LoopVisualizationModel {
  notes: VisualizedNote[];
  activeLayers: VisualizationLayer[];
  minPitch: number;
  maxPitch: number;
  totalBeats: number;
}

const PITCH_PADDING = 2;
const MIN_VISIBLE_PITCH = 36;
const MAX_VISIBLE_PITCH = 84;

export function mapLoopToVisualization(loop: GeneratedLoop | null): LoopVisualizationModel | null {
  if (!loop) {
    return null;
  }

  const chordNotes = loop.chords.flatMap((chord, chordIndex) =>
    chord.notes.flatMap((noteName, noteIndex) => {
      const pitch = Note.midi(noteName);

      if (pitch === null) {
        return [];
      }

      return {
        id: `chord-${chordIndex}-${noteIndex}`,
        pitch,
        pitchName: noteName,
        startBeat: chord.time,
        durationBeats: chord.duration,
        layer: "chords" as const,
      };
    }),
  );

  const melodyNotes = loop.melody.flatMap((note, index) => {
    const pitch = Note.midi(note.note);

    if (pitch === null) {
      return [];
    }

    return {
      id: `melody-${index}`,
      pitch,
      pitchName: note.note,
      startBeat: note.time,
      durationBeats: note.duration,
      layer: "melody" as const,
    };
  });

  const bassNotes = loop.bass.flatMap((note, index) => {
    const pitch = Note.midi(note.note);

    if (pitch === null) {
      return [];
    }

    return {
      id: `bass-${index}`,
      pitch,
      pitchName: note.note,
      startBeat: note.time,
      durationBeats: note.duration,
      layer: "bass" as const,
    };
  });

  const notes = [...chordNotes, ...melodyNotes, ...bassNotes];
  const activeLayers = (["chords", "melody", "bass"] as const).filter((layer) =>
    notes.some((note) => note.layer === layer),
  );

  if (notes.length === 0) {
    return {
      notes: [],
      activeLayers: [],
      minPitch: 48,
      maxPitch: 72,
      totalBeats: loop.totalBeats,
    };
  }

  const pitches = notes.map((note) => note.pitch);
  const minPitch = clampPitch(Math.min(...pitches) - PITCH_PADDING);
  const maxPitch = clampPitch(Math.max(...pitches) + PITCH_PADDING);

  return {
    notes,
    activeLayers,
    minPitch: Math.min(minPitch, maxPitch),
    maxPitch: Math.max(minPitch, maxPitch),
    totalBeats: loop.totalBeats,
  };
}

function clampPitch(pitch: number) {
  return Math.min(MAX_VISIBLE_PITCH, Math.max(MIN_VISIBLE_PITCH, pitch));
}
