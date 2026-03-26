export type ScaleType = "Major" | "Minor";
export type Mood = "Balanced" | "Dark" | "Bright" | "Sparse" | "Intense" | "Calm";
export type LoopLength = 2 | 4;
export type Section = "intro" | "verse" | "chorus" | "bridge" | "outro";
export type LayerName = "chords" | "melody" | "bass";
export type SequencePatternLength = 8 | 16;
export type SequenceDensity = "low" | "medium" | "high";
export type SequenceVariation = "low" | "medium" | "high";
export type SequenceEvolution = "static" | "subtle variation" | "developing" | "call & response";
export type SequenceStyle = "straight" | "syncopated" | "flowing" | "arp-like" | "staccato" | "legato" | "pulsing";
export type SequenceGroove = "straight" | "swing" | "triplet";
export type SequenceRegister = "low" | "mid" | "high" | "wide";
export type SequenceStepState = "trigger" | "rest" | "hold";

export interface LayerToggles {
  chords: boolean;
  melody: boolean;
  bass: boolean;
}

export interface SequenceSettings {
  patternLength: SequencePatternLength;
  density: SequenceDensity;
  variation: SequenceVariation;
  evolution: SequenceEvolution;
  style: SequenceStyle;
  groove: SequenceGroove;
  register: SequenceRegister;
}

export interface SequencePattern {
  length: SequencePatternLength;
  steps: SequenceStepState[];
}

export interface LoopSettings {
  key: string;
  scale: ScaleType;
  tempo: number;
  length: LoopLength;
  mood: Mood;
  section: Section;
  layers: LayerToggles;
  sequence: SequenceSettings;
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
  seconds: number;
  loop: GeneratedLoop;
}
