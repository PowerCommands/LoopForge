import { Note, Scale } from "tonal";
import { createBaseSequencePattern, createPatternForBar, getPatternStepDuration, getSequenceWindows, type SequenceWindow } from "./sequence";
import type {
  ChordEvent,
  GeneratedLoop,
  LayerToggles,
  LoopLength,
  LoopSettings,
  Mood,
  ScaleType,
  SequenceEvolution,
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

interface SequenceRenderWindow extends SequenceWindow {
  time: number;
  duration: number;
}

interface EvolutionBarContext {
  barIndex: number;
  totalBars: number;
  evolution: SequenceEvolution;
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
  staccato: [0, 1, -1, 0, 2, -2],
  legato: [0, 1, 1, -1, 2, -2, 3, -3],
  pulsing: [0, 0, 1, -1, 0, 2, -2],
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
  const totalBars = progression.length;
  const baseWindowCount = getBaseWindowCount(basePattern);
  const motifContour = createMelodyContour(Math.max(1, baseWindowCount), settings, profile);
  let previousPitchClass: string | null = null;

  progression.forEach((chord, barIndex) => {
    const evolutionContext: EvolutionBarContext = {
      barIndex,
      totalBars,
      evolution: settings.sequence.evolution,
    };
    const pattern = createPatternForBar(basePattern, "melody", settings.sequence, barIndex, totalBars);
    const windows = evolveMelodyWindows(
      renderSequenceWindows(getSequenceWindows(pattern), chord, "melody", settings),
      settings,
      evolutionContext,
    );

    if (windows.length === 0) {
      return;
    }

    const contour = evolveMelodyContour(motifContour, windows.length, settings, evolutionContext);

    windows.forEach((window, noteIndex) => {
      const beatInBar = window.time - chord.time;
      const strongAccent = isStrongAccent(beatInBar);
      const note = chooseMelodyNote(
        chord,
        scaleNotes,
        previousPitchClass,
        contour[noteIndex] ?? 0,
        noteIndex,
        windows.length,
        strongAccent,
        settings,
        profile,
        evolutionContext,
      );

      previousPitchClass = Note.pitchClass(note);

      melody.push({
        note,
        time: window.time,
        duration: Math.max(0.2, window.duration),
        velocity: chooseMelodyVelocity(beatInBar, noteIndex, settings, profile, evolutionContext),
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
  const totalBars = progression.length;

  progression.forEach((chord, barIndex) => {
    const evolutionContext: EvolutionBarContext = {
      barIndex,
      totalBars,
      evolution: settings.sequence.evolution,
    };
    const pattern = createPatternForBar(basePattern, "bass", settings.sequence, barIndex, totalBars);
    const windows = evolveBassWindows(
      renderSequenceWindows(getSequenceWindows(pattern), chord, "bass", settings),
      chord,
      settings,
      evolutionContext,
    );
    const nextChord = progression[(barIndex + 1) % progression.length] ?? chord;

    windows.forEach((window, noteIndex) => {
      const beatInBar = window.time - chord.time;
      const target = chooseBassTarget(chord, nextChord, scaleNotes, noteIndex, windows.length, beatInBar, settings, evolutionContext);

      bass.push({
        note: `${target.note}${target.octave}`,
        time: window.time,
        duration: Math.max(0.2, window.duration),
        velocity: chooseBassVelocity(beatInBar, noteIndex, profile, settings, evolutionContext),
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

function getBaseWindowCount(basePattern: ReturnType<typeof createBaseSequencePattern>): number {
  return getSequenceWindows(basePattern).length;
}

function evolveMelodyContour(
  baseContour: number[],
  noteCount: number,
  settings: LoopSettings,
  context: EvolutionBarContext,
): number[] {
  if (context.barIndex === 0) {
    return Array.from({ length: noteCount }, (_, index) => baseContour[index % baseContour.length] ?? 0);
  }

  const seededContour = varyMelodyContour(baseContour, noteCount, settings, getContourChangeChance(settings, context));
  const progress = getEvolutionProgress(context);

  switch (context.evolution) {
    case "subtle variation":
      if (context.barIndex === context.totalBars - 1 && seededContour.length > 0) {
        seededContour[seededContour.length - 1] = clampContourMotion((seededContour[seededContour.length - 1] ?? 0) + 1);
      }
      return seededContour;
    case "developing":
      return seededContour.map((value, index) => {
        if (index === 0) {
          return 0;
        }

        const growth = index >= Math.floor(seededContour.length / 2) ? Math.round(progress * 2) : 0;
        return clampContourMotion(value + growth);
      });
    case "call & response":
      return createCallResponseContour(seededContour, context);
    case "static":
    default:
      return seededContour;
  }
}

function varyMelodyContour(
  baseContour: number[],
  noteCount: number,
  settings: LoopSettings,
  changeChance: number,
): number[] {
  const pool = MELODY_CONTOUR_POOLS[settings.sequence.style];

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

function getContourChangeChance(settings: LoopSettings, context: EvolutionBarContext): number {
  const baseChance = VARIATION_CHANGE_CHANCE[settings.sequence.variation];
  const progress = getEvolutionProgress(context);

  switch (context.evolution) {
    case "subtle variation":
      return clampProbability(baseChance * 0.75 + progress * 0.08);
    case "developing":
      return clampProbability(baseChance + 0.12 + progress * 0.18);
    case "call & response":
      return clampProbability(baseChance + (context.barIndex % 2 === 1 ? 0.12 : 0.04));
    case "static":
    default:
      return baseChance;
  }
}

function evolveMelodyWindows(
  windows: SequenceRenderWindow[],
  settings: LoopSettings,
  context: EvolutionBarContext,
): SequenceRenderWindow[] {
  if (windows.length === 0 || context.evolution === "static") {
    return windows;
  }

  const progress = getEvolutionProgress(context);
  const evolved = windows.map((window, index) => {
    let nextTime = window.time;
    let nextDuration = window.duration;

    if (context.evolution === "subtle variation" && context.barIndex === context.totalBars - 1 && index === windows.length - 1) {
      nextDuration = Math.max(0.2, window.duration * 0.72);
    }

    if (context.evolution === "developing") {
      if (index >= Math.floor(windows.length / 2)) {
        nextDuration = Math.max(0.2, window.duration * (0.94 - progress * 0.18));
      }
    }

    if (context.evolution === "call & response" && context.barIndex % 2 === 1) {
      const delayAmount = index === 0 ? getPatternStepDuration(settings.sequence.patternLength) * 0.5 : 0;
      nextTime = Math.min(Math.floor(window.time / 4) * 4 + 3.5, window.time + delayAmount);
      nextDuration = Math.max(0.2, window.duration * 0.82);
    }

    return {
      ...window,
      time: nextTime,
      duration: nextDuration,
    };
  });

  return normalizeSequenceRenderWindows(evolved);
}

function evolveBassWindows(
  windows: SequenceRenderWindow[],
  chord: ChordEvent,
  settings: LoopSettings,
  context: EvolutionBarContext,
): SequenceRenderWindow[] {
  if (windows.length === 0 || context.evolution === "static") {
    return windows;
  }

  const evolved = windows.map((window, index) => {
    if (context.evolution === "subtle variation" && context.barIndex === context.totalBars - 1 && index === windows.length - 1) {
      return {
        ...window,
        duration: Math.max(0.2, window.duration * 0.76),
      };
    }

    if (context.evolution === "developing" && context.barIndex > 0 && index === windows.length - 1) {
      return {
        ...window,
        duration: Math.max(0.2, window.duration * 0.68),
      };
    }

    if (context.evolution === "call & response" && context.barIndex % 2 === 1 && index === 0) {
      return {
        ...window,
        time: Math.min(chord.time + 3.5, window.time + getPatternStepDuration(settings.sequence.patternLength) * 0.5),
        duration: Math.max(0.2, window.duration * 0.88),
      };
    }

    return window;
  });

  return normalizeSequenceRenderWindows(evolved);
}

function createCallResponseContour(contour: number[], context: EvolutionBarContext): number[] {
  const isResponseBar = context.barIndex % 2 === 1;

  if (!isResponseBar) {
    if (context.barIndex >= 2) {
      return contour.map((value, index) => (index === contour.length - 1 ? clampContourMotion(value + 1) : value));
    }

    return contour;
  }

  return contour.map((value, index) => {
    if (index === 0) {
      return 0;
    }

    const inverted = clampContourMotion(-value || -1);
    return index === contour.length - 1 ? clampContourMotion(inverted - 1) : inverted;
  });
}

function normalizeSequenceRenderWindows(windows: SequenceRenderWindow[]): SequenceRenderWindow[] {
  if (windows.length === 0) {
    return windows;
  }

  const normalized = [...windows]
    .sort((left, right) => left.time - right.time)
    .map((window) => ({
      ...window,
      duration: Math.max(0.2, Math.min(window.duration, 4 - (window.time % 4))),
    }));

  return normalized.filter((window, index) => {
    const previous = normalized[index - 1];
    return !previous || Math.abs(window.time - previous.time) > 0.001;
  });
}

function getEvolutionProgress(context: EvolutionBarContext): number {
  return context.totalBars > 1 ? context.barIndex / (context.totalBars - 1) : 0;
}

function clampContourMotion(value: number): number {
  return Math.max(-4, Math.min(4, value));
}

function chooseMelodyNote(
  chord: ChordEvent,
  scaleNotes: string[],
  previousPitchClass: string | null,
  contourMotion: number,
  noteIndex: number,
  windowCount: number,
  isStrongAccent: boolean,
  settings: LoopSettings,
  profile: MoodProfile,
  context: EvolutionBarContext,
): string {
  const chordTones = chord.notes.map((note) => Note.pitchClass(note));

  if (settings.sequence.style === "arp-like") {
    const arpTone = chordTones[noteIndex % chordTones.length] ?? chordTones[0] ?? scaleNotes[0];
    const resolvedArpTone = isStrongAccent ? arpTone : keepScaleTone(arpTone, scaleNotes);
    return `${resolvedArpTone}${chooseMelodyOctave(noteIndex, chord.bar, contourMotion, settings, profile)}`;
  }

  if (settings.sequence.style === "pulsing" && previousPitchClass && noteIndex % 2 === 1 && Math.random() < 0.7) {
    const repeatedPitchClass = isStrongAccent
      ? resolveChordToneTarget(previousPitchClass, chordTones, scaleNotes)
      : previousPitchClass;
    return `${repeatedPitchClass}${chooseMelodyOctave(noteIndex, chord.bar, 0, settings, profile)}`;
  }

  const previousIndex = previousPitchClass ? scaleNotes.indexOf(previousPitchClass) : -1;
  const seedIndex = previousIndex >= 0 ? previousIndex : scaleNotes.indexOf(chordTones[0] ?? scaleNotes[0]);
  let adjustedMotion =
    settings.sequence.style === "pulsing" && noteIndex > 0 && noteIndex < windowCount - 1 ? 0 : contourMotion;
  if (context.evolution === "developing" && noteIndex === windowCount - 1) {
    adjustedMotion += 1;
  } else if (context.evolution === "call & response" && context.barIndex % 2 === 1) {
    adjustedMotion = adjustedMotion > 0 ? -adjustedMotion : adjustedMotion - 1;
  }
  const nextPitchClass = scaleNotes[wrapScaleIndex(seedIndex + adjustedMotion, scaleNotes.length)] ?? scaleNotes[0];
  const resolvedPitchClass = isStrongAccent
    ? resolveChordToneTarget(nextPitchClass, chordTones, scaleNotes)
    : keepScaleTone(nextPitchClass, scaleNotes);

  return `${resolvedPitchClass}${chooseMelodyOctave(noteIndex, chord.bar, adjustedMotion, settings, profile)}`;
}

function chooseMelodyOctave(
  noteIndex: number,
  barIndex: number,
  contourMotion: number,
  settings: LoopSettings,
  profile: MoodProfile,
): number {
  if (settings.sequence.style === "arp-like") {
    if (settings.sequence.register === "low") {
      return noteIndex % 3 === 2 ? 4 : 3;
    }

    if (settings.sequence.register === "high") {
      return 5;
    }

    return noteIndex % 3 === 2 ? 5 : 4;
  }

  if (settings.sequence.register === "low") {
    return 4;
  }

  if (settings.sequence.register === "high") {
    return 5;
  }

  if (settings.sequence.register === "wide") {
    const widePool = [3, 4, 5, 4, 5];
    return widePool[(noteIndex + barIndex + Math.abs(contourMotion)) % widePool.length] ?? 4;
  }

  return profile.melodyOctaves[(noteIndex + barIndex) % profile.melodyOctaves.length];
}

function chooseMelodyVelocity(
  beat: number,
  noteIndex: number,
  settings: LoopSettings,
  profile: MoodProfile,
  context: EvolutionBarContext,
): number {
  const accent = isStrongAccent(beat) ? 0.05 : -0.03;
  const styleBoost = settings.sequence.style === "syncopated" && beat % 1 !== 0 ? 0.03 : 0;
  const motifBoost = noteIndex % 4 === 0 || settings.sequence.style === "pulsing" ? 0.02 : 0;
  const evolutionBoost =
    context.evolution === "developing"
      ? getEvolutionProgress(context) * 0.05
      : context.evolution === "call & response" && context.barIndex % 2 === 1
        ? -0.03
        : 0;
  return clampVelocity(profile.melodyVelocity + accent + styleBoost + motifBoost + evolutionBoost);
}

function chooseBassTarget(
  chord: ChordEvent,
  nextChord: ChordEvent,
  scaleNotes: string[],
  noteIndex: number,
  windowCount: number,
  beat: number,
  settings: LoopSettings,
  context: EvolutionBarContext,
): BassTarget {
  const root = Note.pitchClass(chord.root);
  const nextRoot = Note.pitchClass(nextChord.root);
  const rootIndex = scaleNotes.indexOf(root);
  const chordTones = chord.notes.map((note) => Note.pitchClass(note));
  const fifth = rootIndex >= 0 ? scaleNotes[(rootIndex + 4) % scaleNotes.length] : root;
  const octaveRoot = createBassTarget(root, "octave", settings.sequence.register);
  const lowRoot = createBassTarget(root, "root", settings.sequence.register);
  const fifthTarget = createBassTarget(fifth, "fifth", settings.sequence.register);
  const passingTarget = createBassTarget(choosePassingNote(root, nextRoot, scaleNotes), "passing", settings.sequence.register);
  const thirdTarget = createBassTarget(chordTones[1] ?? root, "third", settings.sequence.register);
  const strongAccent = isStrongAccent(beat);
  const isLastWindow = noteIndex === windowCount - 1;

  if (noteIndex === 0) {
    return lowRoot;
  }

  if (context.evolution === "call & response" && context.barIndex % 2 === 1) {
    if (isLastWindow && root !== nextRoot && Math.random() < 0.35) {
      return passingTarget;
    }

    return strongAccent ? lowRoot : pickRandom([lowRoot, fifthTarget]);
  }

  if (settings.sequence.style === "pulsing") {
    return noteIndex % 2 === 0 ? lowRoot : pickRandom([lowRoot, fifthTarget, octaveRoot]);
  }

  switch (settings.sequence.style) {
    case "arp-like":
      return [lowRoot, thirdTarget, fifthTarget, octaveRoot][noteIndex % 4] ?? lowRoot;
    case "staccato":
      if (isLastWindow && root !== nextRoot && Math.random() < 0.45) {
        return passingTarget;
      }

      return strongAccent ? lowRoot : pickRandom([lowRoot, fifthTarget]);
    case "legato":
      if (strongAccent) {
        return Math.random() < 0.78 ? lowRoot : fifthTarget;
      }

      return pickRandom([lowRoot, fifthTarget, octaveRoot]);
    case "syncopated":
      if (isLastWindow && root !== nextRoot && Math.random() < 0.55) {
        return passingTarget;
      }

      return strongAccent ? lowRoot : pickRandom([lowRoot, fifthTarget, passingTarget]);
    case "flowing":
      if (strongAccent && Math.random() < 0.7) {
        return lowRoot;
      }

      if (context.evolution === "developing" && noteIndex >= Math.max(1, windowCount - 2)) {
        return pickRandom([fifthTarget, octaveRoot, passingTarget]);
      }

      return pickRandom([lowRoot, fifthTarget, octaveRoot]);
    case "straight":
    default:
      if (strongAccent) {
        return Math.random() < 0.75 ? lowRoot : fifthTarget;
      }

      if (isLastWindow && root !== nextRoot && Math.random() < 0.35) {
        return passingTarget;
      }

      if (context.evolution === "developing" && noteIndex >= Math.max(1, windowCount - 2) && Math.random() < 0.35) {
        return pickRandom([passingTarget, octaveRoot]);
      }

      return pickRandom([lowRoot, fifthTarget, octaveRoot]);
  }
}

function chooseBassVelocity(
  beat: number,
  noteIndex: number,
  profile: MoodProfile,
  settings: LoopSettings,
  context: EvolutionBarContext,
): number {
  const accent = isStrongAccent(beat) ? 0.05 : -0.04;
  const styleBoost =
    settings.sequence.style === "arp-like" && noteIndex % 2 === 1
      ? 0.02
      : settings.sequence.style === "pulsing"
        ? 0.03
        : 0;
  const evolutionBoost =
    context.evolution === "developing"
      ? getEvolutionProgress(context) * 0.04
      : context.evolution === "call & response" && context.barIndex % 2 === 1
        ? -0.02
        : 0;
  return clampVelocity(profile.bassVelocity + accent + styleBoost + evolutionBoost);
}

// Groove shifts rhythmic placement after the step pattern is created, while register
// biases the octave span used for melody and bass without changing chord generation.
function renderSequenceWindows(
  windows: SequenceWindow[],
  chord: ChordEvent,
  layer: "melody" | "bass",
  settings: LoopSettings,
): SequenceRenderWindow[] {
  return windows
    .map((window, index) => {
      const startBeat = applyGrooveToBeat(window.startBeat, settings);
      const nextWindow = windows[index + 1];
      const nextBeat = nextWindow ? applyGrooveToBeat(nextWindow.startBeat, settings) : 4;
      const availableDuration = Math.max(0.2, nextBeat - startBeat);

      return {
        ...window,
        time: chord.time + startBeat,
        duration: Math.min(shapeDurationByStyle(availableDuration, settings, layer), Math.max(0.2, 4 - startBeat)),
      };
    })
    .filter((window) => window.time < chord.time + 4);
}

function applyGrooveToBeat(beat: number, settings: LoopSettings): number {
  switch (settings.sequence.groove) {
    case "swing":
      return Math.abs((beat % 1) - 0.5) < 0.001 ? beat + 0.14 : beat;
    case "triplet":
      return Math.round(beat * 3) / 3;
    case "straight":
    default:
      return beat;
  }
}

function shapeDurationByStyle(duration: number, settings: LoopSettings, layer: "melody" | "bass"): number {
  const minimumDuration = settings.sequence.groove === "triplet" ? 1 / 3 : 0.25;

  switch (settings.sequence.style) {
    case "staccato":
      return Math.max(minimumDuration * 0.75, duration * (layer === "bass" ? 0.52 : 0.44));
    case "legato":
      return Math.max(minimumDuration, duration * 0.95);
    case "pulsing":
      return Math.max(minimumDuration, duration * 0.7);
    case "flowing":
      return Math.max(minimumDuration, duration * 0.9);
    default:
      return Math.max(minimumDuration, duration * 0.82);
  }
}

function createBassTarget(
  note: string,
  role: "root" | "octave" | "fifth" | "third" | "passing",
  register: LoopSettings["sequence"]["register"],
): BassTarget {
  const octaveMap = {
    low: { root: 2, octave: 2, fifth: 2, third: 2, passing: 2 },
    mid: { root: 2, octave: 3, fifth: 2, third: 2, passing: 2 },
    high: { root: 3, octave: 3, fifth: 3, third: 3, passing: 3 },
    wide: { root: 2, octave: 3, fifth: 2, third: 3, passing: 2 },
  } as const;

  return {
    note,
    octave: octaveMap[register][role],
  };
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

function isStrongAccent(beat: number): boolean {
  return Math.abs((beat % 4) - 0) < 0.001 || Math.abs((beat % 4) - 2) < 0.001;
}

function wrapScaleIndex(index: number, size: number): number {
  return ((index % size) + size) % size;
}

function clampVelocity(value: number): number {
  return Math.min(0.95, Math.max(0.35, value));
}

function clampProbability(value: number): number {
  return Math.min(0.95, Math.max(0.05, value));
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
