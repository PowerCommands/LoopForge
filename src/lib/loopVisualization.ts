import { Note } from "tonal";
import type { LayerName } from "../music/types";
import type { EditableLoop, EditableLoopNote } from "../music/editor";
import { PIANO_ROLL_STEPS_PER_BEAT } from "../music/editor";

export type VisualizationLayer = LayerName;

export interface VisualizedNote {
  id: string;
  pitch: number;
  pitchName: string;
  startBeat: number;
  durationBeats: number;
  startStep: number;
  durationSteps: number;
  layer: VisualizationLayer;
}

export interface LoopVisualizationModel {
  notes: VisualizedNote[];
  activeLayers: VisualizationLayer[];
  minPitch: number;
  maxPitch: number;
  totalBeats: number;
  totalSteps: number;
}

const PITCH_PADDING = 2;
const MIN_VISIBLE_PITCH = 36;
const MAX_VISIBLE_PITCH = 84;

function clampPitch(pitch: number) {
  return Math.min(MAX_VISIBLE_PITCH, Math.max(MIN_VISIBLE_PITCH, pitch));
}

function mapEditableNote(note: EditableLoopNote): VisualizedNote {
  return {
    id: note.id,
    pitch: note.pitch,
    pitchName: Note.fromMidi(note.pitch) ?? `${note.pitch}`,
    startBeat: note.startStep / PIANO_ROLL_STEPS_PER_BEAT,
    durationBeats: note.durationSteps / PIANO_ROLL_STEPS_PER_BEAT,
    startStep: note.startStep,
    durationSteps: note.durationSteps,
    layer: note.layer,
  };
}

export function mapLoopToVisualization(editableLoop: EditableLoop | null): LoopVisualizationModel | null {
  if (!editableLoop) {
    return null;
  }

  const notes = editableLoop.notes.map(mapEditableNote);
  const activeLayers = (["chords", "melody", "bass"] as const).filter((layer) =>
    notes.some((note) => note.layer === layer),
  );

  if (notes.length === 0) {
    return {
      notes: [],
      activeLayers: [],
      minPitch: 48,
      maxPitch: 72,
      totalBeats: editableLoop.totalBeats,
      totalSteps: editableLoop.totalSteps,
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
    totalBeats: editableLoop.totalBeats,
    totalSteps: editableLoop.totalSteps,
  };
}
