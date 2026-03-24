import type { LoopSettings } from "./types";

export const KEY_OPTIONS = [
  "C",
  "C#",
  "D",
  "Eb",
  "E",
  "F",
  "F#",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
] as const;

export const DEFAULT_SETTINGS: LoopSettings = {
  key: "C",
  scale: "Major",
  tempo: 110,
  length: 4,
  mood: "Balanced",
  layers: {
    chords: true,
    melody: true,
    bass: true,
  },
};
