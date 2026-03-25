import type {
  LoopSettings,
  SequenceDensity,
  SequenceGroove,
  SequencePatternLength,
  SequenceRegister,
  SequenceSettings,
  SequenceStyle,
  SequenceVariation,
} from "./types";

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

export const SEQUENCE_PATTERN_LENGTH_OPTIONS: SequencePatternLength[] = [8, 16];
export const SEQUENCE_DENSITY_OPTIONS: SequenceDensity[] = ["low", "medium", "high"];
export const SEQUENCE_VARIATION_OPTIONS: SequenceVariation[] = ["low", "medium", "high"];
export const SEQUENCE_STYLE_OPTIONS: SequenceStyle[] = ["straight", "syncopated", "flowing", "arp-like", "staccato", "legato", "pulsing"];
export const SEQUENCE_GROOVE_OPTIONS: SequenceGroove[] = ["straight", "swing", "triplet"];
export const SEQUENCE_REGISTER_OPTIONS: SequenceRegister[] = ["low", "mid", "high", "wide"];

export const DEFAULT_SEQUENCE_SETTINGS: SequenceSettings = {
  patternLength: 16,
  density: "medium",
  variation: "medium",
  style: "straight",
  groove: "straight",
  register: "mid",
};

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
  sequence: DEFAULT_SEQUENCE_SETTINGS,
};

export function normalizeSequenceSettings(sequence?: Partial<SequenceSettings> | null): SequenceSettings {
  return {
    patternLength: sequence?.patternLength === 8 || sequence?.patternLength === 16
      ? sequence.patternLength
      : DEFAULT_SEQUENCE_SETTINGS.patternLength,
    density: sequence?.density && SEQUENCE_DENSITY_OPTIONS.includes(sequence.density)
      ? sequence.density
      : DEFAULT_SEQUENCE_SETTINGS.density,
    variation: sequence?.variation && SEQUENCE_VARIATION_OPTIONS.includes(sequence.variation)
      ? sequence.variation
      : DEFAULT_SEQUENCE_SETTINGS.variation,
    style: sequence?.style && SEQUENCE_STYLE_OPTIONS.includes(sequence.style)
      ? sequence.style
      : DEFAULT_SEQUENCE_SETTINGS.style,
    groove: sequence?.groove && SEQUENCE_GROOVE_OPTIONS.includes(sequence.groove)
      ? sequence.groove
      : DEFAULT_SEQUENCE_SETTINGS.groove,
    register: sequence?.register && SEQUENCE_REGISTER_OPTIONS.includes(sequence.register)
      ? sequence.register
      : DEFAULT_SEQUENCE_SETTINGS.register,
  };
}

export function normalizeLoopSettings(settings?: Partial<LoopSettings> | null): LoopSettings {
  return {
    key: settings?.key ?? DEFAULT_SETTINGS.key,
    scale: settings?.scale === "Minor" ? "Minor" : settings?.scale === "Major" ? "Major" : DEFAULT_SETTINGS.scale,
    tempo:
      typeof settings?.tempo === "number" && Number.isFinite(settings.tempo) && settings.tempo >= 60 && settings.tempo <= 180
        ? settings.tempo
        : DEFAULT_SETTINGS.tempo,
    length: settings?.length === 2 || settings?.length === 4 ? settings.length : DEFAULT_SETTINGS.length,
    mood: settings?.mood ?? DEFAULT_SETTINGS.mood,
    layers: {
      chords: settings?.layers?.chords ?? DEFAULT_SETTINGS.layers.chords,
      melody: settings?.layers?.melody ?? DEFAULT_SETTINGS.layers.melody,
      bass: settings?.layers?.bass ?? DEFAULT_SETTINGS.layers.bass,
    },
    sequence: normalizeSequenceSettings(settings?.sequence),
  };
}
