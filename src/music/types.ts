export type ScaleType = "Major" | "Minor";
export type Mood = "Balanced" | "Dark" | "Bright" | "Sparse" | "Intense" | "Calm";
export type LoopLength = 2 | 4;
export type LayerName = "chords" | "melody" | "bass";

export interface LayerToggles {
  chords: boolean;
  melody: boolean;
  bass: boolean;
}

export interface LoopSettings {
  key: string;
  scale: ScaleType;
  tempo: number;
  length: LoopLength;
  mood: Mood;
  layers: LayerToggles;
}

export interface TimedNote {
  note: string;
  time: number;
  duration: number;
  velocity: number;
}

export interface ChordEvent {
  symbol: string;
  notes: string[];
  root: string;
  bar: number;
  time: number;
  duration: number;
}

export interface GeneratedLoop {
  id: string;
  settings: LoopSettings;
  totalBeats: number;
  chords: ChordEvent[];
  melody: TimedNote[];
  bass: TimedNote[];
}

export interface SavedLoop {
  id: string;
  name: string;
  loop: GeneratedLoop;
}
