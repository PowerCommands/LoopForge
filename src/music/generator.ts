import { Note, Scale } from "tonal";
import { createBaseSequencePattern, createPatternForBar, getSequenceWindows } from "./sequence";
import type {
  ChordEvent,
  GeneratedLoop,
  LayerToggles,
  LoopLength,
  LoopSettings,
  Mood,
  ScaleType,
  TimedNote,
} from "./types";

type RomanDegree =
  | "I"
  | "ii"
  | "iii"
  | "IV"
  | "V"
  | "vi"
  | "vii"
  | "i"
  | "III"
  | "iv"
  | "v"
  | "VI"
  | "VII";

interface DegreeChord {
  roman: RomanDegree;
  root: string;
  triad: string[];
}

interface ProgressionTemplate {
  name: string;
  degrees: RomanDegree[];
}

interface MoodProfile {
  chordFamily: "standard" | "dark" | "bright" | "sparse" | "intense" | "calm";
  melodyStepwiseChance: number;
  melodyVelocity: number;
  melodyOctaves: number[];
  bassVelocity: number;
}

interface BassTarget {
  note: string;
  octave: number;
}

const MAJOR_DEGREE_ORDER: RomanDegree[] = ["I", "ii", "iii", "IV", "V", "vi", "vii"];
const MINOR_DEGREE_ORDER: RomanDegree[] = ["i", "ii", "III", "iv", "v", "VI", "VII"];

const MAJOR_TEMPLATES: Record<"standard" | "dark" | "bright" | "sparse" | "intense" | "calm", ProgressionTemplate[]> = {
  standard: [
    { name: "I-V-vi-IV", degrees: ["I", "V", "vi", "IV"] },
    { name: "I-IV-V-I", degrees: ["I", "IV", "V", "I"] },
    { name: "vi-IV-I-V", degrees: ["vi", "IV", "I", "V"] },
    { name: "I-vi-IV-V", degrees: ["I", "vi", "IV", "V"] },
  ],
  dark: [
    { name: "vi-IV-I-V", degrees: ["vi", "IV", "I", "V"] },
    { name: "vi-ii-IV-V", degrees: ["vi", "ii", "IV", "V"] },
    { name: "I-vi-IV-V", degrees: ["I", "vi", "IV", "V"] },
  ],
  bright: [
    { name: "I-IV-V-I", degrees: ["I", "IV", "V", "I"] },
    { name: "I-V-vi-IV", degrees: ["I", "V", "vi", "IV"] },
    { name: "I-V-IV-I", degrees: ["I", "V", "IV", "I"] },
  ],
  sparse: [
    { name: "I-I-IV-IV", degrees: ["I", "I", "IV", "IV"] },
    { name: "I-V-I-V", degrees: ["I", "V", "I", "V"] },
    { name: "I-IV-I-IV", degrees: ["I", "IV", "I", "IV"] },
  ],
  intense: [
    { name: "I-V-vi-IV", degrees: ["I", "V", "vi", "IV"] },
    { name: "I-V-IV-I", degrees: ["I", "V", "IV", "I"] },
    { name: "I-IV-V-I", degrees: ["I", "IV", "V", "I"] },
  ],
  calm: [
    { name: "I-I-IV-IV", degrees: ["I", "I", "IV", "IV"] },
    { name: "I-vi-IV-I", degrees: ["I", "vi", "IV", "I"] },
    { name: "I-IV-I-I", degrees: ["I", "IV", "I", "I"] },
  ],
};

const MINOR_TEMPLATES: Record<"standard" | "dark" | "bright" | "sparse" | "intense" | "calm", ProgressionTemplate[]> = {
  standard: [
    { name: "i-VI-III-VII", degrees: ["i", "VI", "III", "VII"] },
    { name: "i-iv-v-i", degrees: ["i", "iv", "v", "i"] },
    { name: "i-VII-VI-VII", degrees: ["i", "VII", "VI", "VII"] },
    { name: "i-VI-VII-i", degrees: ["i", "VI", "VII", "i"] },
  ],
  dark: [
    { name: "i-VI-III-VII", degrees: ["i", "VI", "III", "VII"] },
    { name: "i-VII-VI-VII", degrees: ["i", "VII", "VI", "VII"] },
    { name: "i-iv-v-i", degrees: ["i", "iv", "v", "i"] },
  ],
  bright: [
    { name: "i-iv-v-i", degrees: ["i", "iv", "v", "i"] },
    { name: "i-VI-VII-i", degrees: ["i", "VI", "VII", "i"] },
    { name: "i-VII-VI-VII", degrees: ["i", "VII", "VI", "VII"] },
  ],
  sparse: [
    { name: "i-i-VII-VII", degrees: ["i", "i", "VII", "VII"] },
    { name: "i-VI-i-VI", degrees: ["i", "VI", "i", "VI"] },
    { name: "i-v-i-v", degrees: ["i", "v", "i", "v"] },
  ],
  intense: [
    { name: "i-iv-v-i", degrees: ["i", "iv", "v", "i"] },
    { name: "i-VI-VII-i", degrees: ["i", "VI", "VII", "i"] },
    { name: "i-VII-VI-VII", degrees: ["i", "VII", "VI", "VII"] },
  ],
  calm: [
    { name: "i-i-VI-VI", degrees: ["i", "i", "VI", "VI"] },
    { name: "i-VI-i-i", degrees: ["i", "VI", "i", "i"] },
    { name: "i-VII-i-VII", degrees: ["i", "VII", "i", "VII"] },
  ],
};

const MOOD_PROFILES: Record<Mood, MoodProfile> = {
  Balanced: {
    chordFamily: "standard",
    melodyStepwiseChance: 0.65,
    melodyVelocity: 0.76,
    melodyOctaves: [4, 4, 5, 5],
    bassVelocity: 0.86,
  },
  Dark: {
    chordFamily: "dark",
    melodyStepwiseChance: 0.82,
    melodyVelocity: 0.7,
    melodyOctaves: [4, 4, 4, 5],
    bassVelocity: 0.8,
  },
  Bright: {
    chordFamily: "bright",
    melodyStepwiseChance: 0.42,
    melodyVelocity: 0.82,
    melodyOctaves: [4, 5, 5, 5],
    bassVelocity: 0.88,
  },
  Sparse: {
    chordFamily: "sparse",
    melodyStepwiseChance: 0.85,
    melodyVelocity: 0.62,
    melodyOctaves: [4, 4, 5],
    bassVelocity: 0.72,
  },
  Intense: {
    chordFamily: "intense",
    melodyStepwiseChance: 0.35,
    melodyVelocity: 0.84,
    melodyOctaves: [4, 5, 5, 5],
    bassVelocity: 0.9,
  },
  Calm: {
    chordFamily: "calm",
    melodyStepwiseChance: 0.9,
    melodyVelocity: 0.6,
    melodyOctaves: [4, 4, 4, 5],
    bassVelocity: 0.7,
  },
};

const MELODY_CONTOUR_POOLS = {
  straight: [0, 1, -1, 1, -1, 2, -2],
  syncopated: [0, 2, -2, 1, -1, 3, -3],
  flowing: [0, 1, 1, -1, 2, -2],
  "arp-like": [0, 2, 2, -1, -2, 1],
} as const;

const VARIATION_CHANGE_CHANCE = {
  low: 0.16,
  medium: 0.32,
  high: 0.5,
} as const;

export function generateLoop(settings: LoopSettings): GeneratedLoop {
  const profile = MOOD_PROFILES[settings.mood];
  const scaleNotes = getScaleNotes(settings.key, settings.scale);
  const degreeChords = getDegreeChords(scaleNotes, settings.scale);
  const progression = buildProgression(degreeChords, settings.scale, settings.mood, settings.length);

  return {
    id: `${Date.now()}`,
    settings,
    totalBeats: settings.length * 4,
    chords: settings.layers.chords ? progression : [],
    melody: settings.layers.melody ? buildMelody(progression, scaleNotes, settings, profile) : [],
    bass: settings.layers.bass ? buildBass(progression, scaleNotes, settings, profile) : [],
  };
}

function getScaleNotes(key: string, scale: ScaleType): string[] {
  const scaleName = `${key} ${scale.toLowerCase()}`;
  const notes = Scale.get(scaleName).notes;

  if (notes.length !== 7) {
    return Scale.get("C major").notes;
  }

  return notes;
}

function buildProgression(
  degreeChords: DegreeChord[],
  scale: ScaleType,
  mood: Mood,
  length: LoopLength,
): ChordEvent[] {
  const template = pickTemplate(scale, mood);
  const degreeSequence = length === 2 ? compressTemplate(template.degrees) : template.degrees;

  return degreeSequence.map((roman, index) => {
    const chord = degreeChords.find((entry) => entry.roman === roman) ?? degreeChords[0];

    return {
      symbol: `${chord.roman} (${chord.triad.join("-")})`,
      notes: chord.triad.map((note) => `${note}4`),
      root: `${chord.root}2`,
      bar: index,
      time: index * 4,
      duration: 4,
    };
  });
}

function getDegreeChords(scaleNotes: string[], scale: ScaleType): DegreeChord[] {
  const degreeOrder = scale === "Major" ? MAJOR_DEGREE_ORDER : MINOR_DEGREE_ORDER;

  return degreeOrder.map((roman, index) => ({
    roman,
    root: scaleNotes[index],
    triad: [
      scaleNotes[index],
      scaleNotes[(index + 2) % scaleNotes.length],
      scaleNotes[(index + 4) % scaleNotes.length],
    ],
  }));
}

function pickTemplate(scale: ScaleType, mood: Mood): ProgressionTemplate {
  const templates = scale === "Major" ? MAJOR_TEMPLATES : MINOR_TEMPLATES;
  const profile = MOOD_PROFILES[mood];

  return pickRandom(templates[profile.chordFamily]);
}

function compressTemplate(degrees: RomanDegree[]): RomanDegree[] {
  const uniqueMotion = degrees[0] === degrees[2] && degrees[1] === degrees[3];

  if (uniqueMotion) {
    return [degrees[0], degrees[1]];
  }

  return [degrees[0], degrees[2]];
}

function buildMelody(
  progression: ChordEvent[],
  scaleNotes: string[],
  settings: LoopSettings,
  profile: MoodProfile,
): TimedNote[] {
  const melody: TimedNote[] = [];
  const basePattern = createBaseSequencePattern("melody", settings.sequence);
  let motifContour: number[] | null = null;
  let previousPitchClass: string | null = null;

  progression.forEach((chord, barIndex) => {
    const pattern = createPatternForBar(basePattern, "melody", settings.sequence, barIndex);
    const windows = getSequenceWindows(pattern);

    if (windows.length === 0) {
      return;
    }

    const contour = motifContour
      ? varyMelodyContour(motifContour, windows.length, settings)
      : createMelodyContour(windows.length, settings, profile);

    if (!motifContour) {
      motifContour = [...contour];
    }

    windows.forEach((window, noteIndex) => {
      const isStrongAccent = window.startBeat === 0 || window.startBeat === 2;
      const note = chooseMelodyNote(
        chord,
        scaleNotes,
        previousPitchClass,
        contour[noteIndex] ?? 0,
        noteIndex,
        isStrongAccent,
        settings,
        profile,
      );

      previousPitchClass = Note.pitchClass(note);

      melody.push({
        note,
        time: chord.time + window.startBeat,
        duration: Math.max(0.25, window.durationBeats),
        velocity: chooseMelodyVelocity(window.startBeat, noteIndex, settings, profile),
      });
    });
  });

  return melody;
}

function buildBass(
  progression: ChordEvent[],
  scaleNotes: string[],
  settings: LoopSettings,
  profile: MoodProfile,
): TimedNote[] {
  const bass: TimedNote[] = [];
  const basePattern = createBaseSequencePattern("bass", settings.sequence);

  progression.forEach((chord, barIndex) => {
    const pattern = createPatternForBar(basePattern, "bass", settings.sequence, barIndex);
    const windows = getSequenceWindows(pattern);
    const nextChord = progression[(barIndex + 1) % progression.length] ?? chord;

    windows.forEach((window, noteIndex) => {
      const target = chooseBassTarget(chord, nextChord, scaleNotes, noteIndex, windows.length, window.startBeat, settings);

      bass.push({
        note: `${target.note}${target.octave}`,
        time: chord.time + window.startBeat,
        duration: Math.max(0.25, window.durationBeats),
        velocity: chooseBassVelocity(window.startBeat, noteIndex, profile, settings),
      });
    });
  });

  return bass;
}

function createMelodyContour(noteCount: number, settings: LoopSettings, profile: MoodProfile): number[] {
  const pool = MELODY_CONTOUR_POOLS[settings.sequence.style];

  return Array.from({ length: noteCount }, (_, index) => {
    if (index === 0) {
      return 0;
    }

    if (Math.random() < profile.melodyStepwiseChance) {
      return pickRandom([0, 1, -1, 1, -1, 2, -2]);
    }

    return pickRandom([...pool]);
  });
}

function varyMelodyContour(baseContour: number[], noteCount: number, settings: LoopSettings): number[] {
  const pool = MELODY_CONTOUR_POOLS[settings.sequence.style];
  const changeChance = VARIATION_CHANGE_CHANCE[settings.sequence.variation];

  return Array.from({ length: noteCount }, (_, index) => {
    const baseValue = baseContour[index % baseContour.length] ?? 0;

    if (index === 0) {
      return 0;
    }

    if (Math.random() < changeChance) {
      return pickRandom([...pool]);
    }

    return baseValue;
  });
}

function chooseMelodyNote(
  chord: ChordEvent,
  scaleNotes: string[],
  previousPitchClass: string | null,
  contourMotion: number,
  noteIndex: number,
  isStrongAccent: boolean,
  settings: LoopSettings,
  profile: MoodProfile,
): string {
  const chordTones = chord.notes.map((note) => Note.pitchClass(note));

  if (settings.sequence.style === "arp-like") {
    const arpTone = chordTones[noteIndex % chordTones.length] ?? chordTones[0] ?? scaleNotes[0];
    const resolvedArpTone = isStrongAccent ? arpTone : keepScaleTone(arpTone, scaleNotes);
    return `${resolvedArpTone}${chooseMelodyOctave(noteIndex, chord.bar, settings, profile)}`;
  }

  const previousIndex = previousPitchClass ? scaleNotes.indexOf(previousPitchClass) : -1;
  const seedIndex = previousIndex >= 0 ? previousIndex : scaleNotes.indexOf(chordTones[0] ?? scaleNotes[0]);
  const nextPitchClass = scaleNotes[wrapScaleIndex(seedIndex + contourMotion, scaleNotes.length)] ?? scaleNotes[0];
  const resolvedPitchClass = isStrongAccent
    ? resolveChordToneTarget(nextPitchClass, chordTones, scaleNotes)
    : keepScaleTone(nextPitchClass, scaleNotes);

  return `${resolvedPitchClass}${chooseMelodyOctave(noteIndex, chord.bar, settings, profile)}`;
}

function chooseMelodyOctave(
  noteIndex: number,
  barIndex: number,
  settings: LoopSettings,
  profile: MoodProfile,
): number {
  if (settings.sequence.style === "arp-like") {
    return noteIndex % 3 === 2 ? 5 : 4;
  }

  return profile.melodyOctaves[(noteIndex + barIndex) % profile.melodyOctaves.length];
}

function chooseMelodyVelocity(
  beat: number,
  noteIndex: number,
  settings: LoopSettings,
  profile: MoodProfile,
): number {
  const accent = beat === 0 || beat === 2 ? 0.05 : -0.03;
  const styleBoost = settings.sequence.style === "syncopated" && beat % 1 !== 0 ? 0.03 : 0;
  const motifBoost = noteIndex % 4 === 0 ? 0.02 : 0;
  return clampVelocity(profile.melodyVelocity + accent + styleBoost + motifBoost);
}

function chooseBassTarget(
  chord: ChordEvent,
  nextChord: ChordEvent,
  scaleNotes: string[],
  noteIndex: number,
  windowCount: number,
  beat: number,
  settings: LoopSettings,
): BassTarget {
  const root = Note.pitchClass(chord.root);
  const nextRoot = Note.pitchClass(nextChord.root);
  const rootIndex = scaleNotes.indexOf(root);
  const chordTones = chord.notes.map((note) => Note.pitchClass(note));
  const fifth = rootIndex >= 0 ? scaleNotes[(rootIndex + 4) % scaleNotes.length] : root;
  const octaveRoot: BassTarget = { note: root, octave: 3 };
  const lowRoot: BassTarget = { note: root, octave: 2 };
  const fifthTarget: BassTarget = { note: fifth, octave: 2 };
  const passingTarget: BassTarget = { note: choosePassingNote(root, nextRoot, scaleNotes), octave: 2 };
  const thirdTarget: BassTarget = { note: chordTones[1] ?? root, octave: 2 };
  const isStrongAccent = beat === 0 || beat === 2;
  const isLastWindow = noteIndex === windowCount - 1;

  if (noteIndex === 0) {
    return lowRoot;
  }

  switch (settings.sequence.style) {
    case "arp-like":
      return [lowRoot, thirdTarget, fifthTarget, octaveRoot][noteIndex % 4] ?? lowRoot;
    case "syncopated":
      if (isLastWindow && root !== nextRoot && Math.random() < 0.55) {
        return passingTarget;
      }

      return isStrongAccent ? lowRoot : pickRandom([lowRoot, fifthTarget, passingTarget]);
    case "flowing":
      if (isStrongAccent && Math.random() < 0.7) {
        return lowRoot;
      }

      return pickRandom([lowRoot, fifthTarget, octaveRoot]);
    case "straight":
    default:
      if (isStrongAccent) {
        return Math.random() < 0.75 ? lowRoot : fifthTarget;
      }

      if (isLastWindow && root !== nextRoot && Math.random() < 0.35) {
        return passingTarget;
      }

      return pickRandom([lowRoot, fifthTarget, octaveRoot]);
  }
}

function chooseBassVelocity(
  beat: number,
  noteIndex: number,
  profile: MoodProfile,
  settings: LoopSettings,
): number {
  const accent = beat === 0 || beat === 2 ? 0.05 : -0.04;
  const styleBoost = settings.sequence.style === "arp-like" && noteIndex % 2 === 1 ? 0.02 : 0;
  return clampVelocity(profile.bassVelocity + accent + styleBoost);
}

function choosePassingNote(currentRoot: string, nextRoot: string, scaleNotes: string[]): string {
  const currentIndex = scaleNotes.indexOf(currentRoot);
  const nextIndex = scaleNotes.indexOf(nextRoot);

  if (currentIndex === -1 || nextIndex === -1 || currentRoot === nextRoot) {
    return currentRoot;
  }

  const upwardDistance = (nextIndex - currentIndex + scaleNotes.length) % scaleNotes.length;
  const downwardDistance = (currentIndex - nextIndex + scaleNotes.length) % scaleNotes.length;
  const direction = upwardDistance <= downwardDistance ? 1 : -1;

  return scaleNotes[wrapScaleIndex(currentIndex + direction, scaleNotes.length)] ?? currentRoot;
}

function resolveChordToneTarget(candidate: string, chordTones: string[], scaleNotes: string[]): string {
  if (chordTones.includes(candidate)) {
    return candidate;
  }

  const candidateIndex = scaleNotes.indexOf(candidate);

  if (candidateIndex === -1) {
    return chordTones[0] ?? candidate;
  }

  const orderedTargets = [...chordTones].sort((left, right) => {
    const leftIndex = scaleNotes.indexOf(left);
    const rightIndex = scaleNotes.indexOf(right);
    return Math.abs(leftIndex - candidateIndex) - Math.abs(rightIndex - candidateIndex);
  });

  return orderedTargets[0] ?? candidate;
}

function keepScaleTone(candidate: string, scaleNotes: string[]): string {
  return scaleNotes.includes(candidate) ? candidate : scaleNotes[0];
}

function wrapScaleIndex(index: number, size: number): number {
  return ((index % size) + size) % size;
}

function clampVelocity(value: number): number {
  return Math.min(0.95, Math.max(0.35, value));
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function getLayerSummary(loop: GeneratedLoop, layers: LayerToggles): string[] {
  const parts: string[] = [];

  if (layers.chords) {
    parts.push(`Chords: ${loop.chords.map((chord) => chord.symbol).join(" | ")}`);
  }

  if (layers.melody) {
    parts.push(`Melody notes: ${loop.melody.length}`);
  }

  if (layers.bass) {
    parts.push(`Bass notes: ${loop.bass.length}`);
  }

  return parts;
}
