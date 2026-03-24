import { Note, Scale } from "tonal";
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

interface BassTarget {
  note: string;
  octave: number;
  duration: number;
  timeOffset: number;
}

interface MoodProfile {
  chordFamily: "standard" | "dark" | "bright" | "sparse" | "intense" | "calm";
  melodyBeats: number[];
  melodyStepwiseChance: number;
  melodyDuration: number;
  melodyVelocity: number;
  melodyOctaves: number[];
  bassPattern: "simple" | "steady" | "lifted" | "driving";
  bassVelocity: number;
  hookChance: number;
  hookVariationChance: number;
  hookLength: 2 | 3 | 4;
}

interface HookNote {
  beat: number;
  note: string;
  duration: number;
  velocity: number;
}

interface HookPlan {
  captureBar: number;
  reuseBar: number;
  varyReuse: boolean;
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
    melodyBeats: [0, 1, 2, 3],
    melodyStepwiseChance: 0.65,
    melodyDuration: 1,
    melodyVelocity: 0.76,
    melodyOctaves: [4, 4, 5, 5],
    bassPattern: "steady",
    bassVelocity: 0.86,
    hookChance: 0.45,
    hookVariationChance: 0.35,
    hookLength: 3,
  },
  Dark: {
    chordFamily: "dark",
    melodyBeats: [0, 1, 2, 3],
    melodyStepwiseChance: 0.82,
    melodyDuration: 0.95,
    melodyVelocity: 0.7,
    melodyOctaves: [4, 4, 4, 5],
    bassPattern: "steady",
    bassVelocity: 0.8,
    hookChance: 0.5,
    hookVariationChance: 0.3,
    hookLength: 3,
  },
  Bright: {
    chordFamily: "bright",
    melodyBeats: [0, 1, 2, 3],
    melodyStepwiseChance: 0.42,
    melodyDuration: 0.85,
    melodyVelocity: 0.82,
    melodyOctaves: [4, 5, 5, 5],
    bassPattern: "lifted",
    bassVelocity: 0.88,
    hookChance: 0.65,
    hookVariationChance: 0.45,
    hookLength: 4,
  },
  Sparse: {
    chordFamily: "sparse",
    melodyBeats: [0, 2],
    melodyStepwiseChance: 0.85,
    melodyDuration: 1.4,
    melodyVelocity: 0.62,
    melodyOctaves: [4, 4, 5],
    bassPattern: "simple",
    bassVelocity: 0.72,
    hookChance: 0.35,
    hookVariationChance: 0.2,
    hookLength: 2,
  },
  Intense: {
    chordFamily: "intense",
    melodyBeats: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5],
    melodyStepwiseChance: 0.35,
    melodyDuration: 0.45,
    melodyVelocity: 0.84,
    melodyOctaves: [4, 5, 5, 5],
    bassPattern: "driving",
    bassVelocity: 0.9,
    hookChance: 0.6,
    hookVariationChance: 0.6,
    hookLength: 4,
  },
  Calm: {
    chordFamily: "calm",
    melodyBeats: [0, 2],
    melodyStepwiseChance: 0.9,
    melodyDuration: 1.75,
    melodyVelocity: 0.6,
    melodyOctaves: [4, 4, 4, 5],
    bassPattern: "simple",
    bassVelocity: 0.7,
    hookChance: 0.4,
    hookVariationChance: 0.2,
    hookLength: 2,
  },
};

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
    melody: settings.layers.melody ? buildMelody(progression, scaleNotes, profile) : [],
    bass: settings.layers.bass ? buildBass(progression, scaleNotes, profile) : [],
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

function buildMelody(progression: ChordEvent[], scaleNotes: string[], profile: MoodProfile): TimedNote[] {
  const melody: TimedNote[] = [];
  const hookPlan = createHookPlan(progression.length, profile);
  let storedHook: HookNote[] | null = null;
  let previousPitchClass: string | null = null;

  progression.forEach((chord, barIndex) => {
    const shouldReuseHook = hookPlan !== null && storedHook !== null && hookPlan.reuseBar === barIndex;
    const activeHook = shouldReuseHook ? storedHook : null;
    const barNotes = shouldReuseHook
      ? buildHookBarNotes(chord, activeHook as HookNote[], scaleNotes, profile, hookPlan!.varyReuse)
      : buildMelodyBarNotes(chord, scaleNotes, profile, previousPitchClass);

    if (hookPlan !== null && hookPlan.captureBar === barIndex) {
      storedHook = captureHook(barNotes, profile.hookLength);
    }

    if (barNotes.length > 0) {
      previousPitchClass = Note.pitchClass(barNotes[barNotes.length - 1].note);
      melody.push(...barNotes);
    }
  });

  return melody;
}

function createHookPlan(barCount: number, profile: MoodProfile): HookPlan | null {
  if (barCount < 2 || Math.random() >= profile.hookChance) {
    return null;
  }

  const captureBar = 0;
  const reuseBar = barCount > 2 ? barCount - 1 : 1;

  return {
    captureBar,
    reuseBar,
    varyReuse: Math.random() < profile.hookVariationChance,
  };
}

function buildMelodyBarNotes(
  chord: ChordEvent,
  scaleNotes: string[],
  profile: MoodProfile,
  previousPitchClass: string | null,
): TimedNote[] {
  const barNotes: TimedNote[] = [];
  let currentPitchClass = previousPitchClass;

  profile.melodyBeats.forEach((beat, stepIndex) => {
    const isStrongBeat = beat === 0 || beat === 2;
    const chordTones = chord.notes.map((note) => Note.pitchClass(note));
    const noteName = chooseMelodyPitchClass(
      scaleNotes,
      chordTones,
      currentPitchClass,
      isStrongBeat,
      profile,
    );

    currentPitchClass = noteName;

    barNotes.push({
      note: `${noteName}${chooseMelodyOctave(stepIndex, profile)}`,
      time: chord.time + beat,
      duration: chooseMelodyDuration(beat, profile),
      velocity: chooseMelodyVelocity(isStrongBeat, profile),
    });
  });

  return barNotes;
}

function captureHook(barNotes: TimedNote[], hookLength: number): HookNote[] | null {
  const motif = barNotes.slice(0, Math.min(hookLength, barNotes.length)).map((note) => ({
    beat: note.time % 4,
    note: note.note,
    duration: note.duration,
    velocity: note.velocity,
  }));

  return motif.length >= 2 ? motif : null;
}

function buildHookBarNotes(
  chord: ChordEvent,
  hook: HookNote[],
  scaleNotes: string[],
  profile: MoodProfile,
  varyReuse: boolean,
): TimedNote[] {
  const chordTones = chord.notes.map((note) => Note.pitchClass(note));

  return hook.map((hookNote, index) => {
    const transformed = varyReuse
      ? varyHookNote(hookNote, index, hook.length, scaleNotes, chordTones, profile)
      : { ...hookNote };
    const beat = profile.melodyBeats.includes(transformed.beat) ? transformed.beat : profile.melodyBeats[index] ?? transformed.beat;

    return {
      note: transformed.note,
      time: chord.time + beat,
      duration: transformed.duration,
      velocity: transformed.velocity,
    };
  });
}

function varyHookNote(
  hookNote: HookNote,
  index: number,
  hookLength: number,
  scaleNotes: string[],
  chordTones: string[],
  profile: MoodProfile,
): HookNote {
  const pitchClass = Note.pitchClass(hookNote.note);
  const octave = Number(hookNote.note.slice(-1));
  const scaleIndex = scaleNotes.indexOf(pitchClass);

  if (scaleIndex === -1) {
    return hookNote;
  }

  const isStrongBeat = hookNote.beat === 0 || hookNote.beat === 2;
  const isLastNote = index === hookLength - 1;
  const direction = profile.melodyStepwiseChance >= 0.7 || Math.random() > 0.5 ? 1 : -1;
  let nextPitchClass = pitchClass;

  if (index === 0) {
    nextPitchClass = scaleNotes[(scaleIndex + direction + scaleNotes.length) % scaleNotes.length];
  } else if (index === 1 && profile.melodyStepwiseChance < 0.6) {
    nextPitchClass = scaleNotes[(scaleIndex - direction + scaleNotes.length) % scaleNotes.length];
  } else if (isLastNote) {
    nextPitchClass = chordTones[0] ?? pitchClass;
  }

  const resolvedPitchClass = isStrongBeat
    ? ensureChordTone(nextPitchClass, chordTones)
    : ensureScaleTone(nextPitchClass, scaleNotes);

  return {
    beat: hookNote.beat,
    note: `${resolvedPitchClass}${octave}`,
    duration: Math.max(0.35, hookNote.duration),
    velocity: hookNote.velocity + (profile.melodyVelocity > 0.8 ? 0.03 : -0.02),
  };
}

function ensureChordTone(note: string, chordTones: string[]): string {
  if (chordTones.includes(note)) {
    return note;
  }

  return chordTones[0] ?? note;
}

function ensureScaleTone(note: string, scaleNotes: string[]): string {
  if (scaleNotes.includes(note)) {
    return note;
  }

  return scaleNotes[0] ?? note;
}

function chooseMelodyPitchClass(
  scaleNotes: string[],
  chordTones: string[],
  previousNote: string | null,
  isStrongBeat: boolean,
  profile: MoodProfile,
): string {
  if (!previousNote) {
    return isStrongBeat ? chordTones[0] : pickRandom(scaleNotes);
  }

  const noteIndex = scaleNotes.indexOf(previousNote);

  if (noteIndex === -1) {
    return isStrongBeat ? pickRandom(chordTones) : pickRandom(scaleNotes);
  }

  const stepwiseCandidates = [
    scaleNotes[(noteIndex + 1) % scaleNotes.length],
    scaleNotes[(noteIndex + scaleNotes.length - 1) % scaleNotes.length],
  ];
  const leapCandidates = [
    scaleNotes[(noteIndex + 2) % scaleNotes.length],
    scaleNotes[(noteIndex + scaleNotes.length - 2) % scaleNotes.length],
    scaleNotes[(noteIndex + 3) % scaleNotes.length],
    scaleNotes[(noteIndex + scaleNotes.length - 3) % scaleNotes.length],
  ];
  const prefersStepwise = Math.random() < profile.melodyStepwiseChance;
  const motionCandidates = prefersStepwise ? stepwiseCandidates : leapCandidates;

  if (isStrongBeat) {
    const harmonicTargets = motionCandidates.filter((note) => chordTones.includes(note));

    if (harmonicTargets.length > 0) {
      return pickRandom(harmonicTargets);
    }

    return pickRandom(chordTones);
  }

  const passingTargets = motionCandidates.filter((note) => !chordTones.includes(note));

  if (passingTargets.length > 0) {
    return pickRandom(passingTargets);
  }

  return pickRandom(scaleNotes);
}

function chooseMelodyOctave(stepIndex: number, profile: MoodProfile): number {
  return profile.melodyOctaves[stepIndex % profile.melodyOctaves.length];
}

function chooseMelodyDuration(beat: number, profile: MoodProfile): number {
  const strongBeat = beat === 0 || beat === 2;
  const duration = strongBeat ? profile.melodyDuration : profile.melodyDuration * 0.85;

  return Math.max(0.35, Math.min(duration, 2));
}

function chooseMelodyVelocity(isStrongBeat: boolean, profile: MoodProfile): number {
  return isStrongBeat ? profile.melodyVelocity + 0.04 : profile.melodyVelocity - 0.04;
}

function buildBass(progression: ChordEvent[], scaleNotes: string[], profile: MoodProfile): TimedNote[] {
  return progression.flatMap((chord) => {
    const rootPitchClass = Note.pitchClass(chord.root);
    const rootIndex = scaleNotes.indexOf(rootPitchClass);
    const fifthPitchClass = rootIndex >= 0 ? scaleNotes[(rootIndex + 4) % scaleNotes.length] : rootPitchClass;
    const bassTargets = chooseBassPattern(rootPitchClass, fifthPitchClass, chord.bar, profile);

    return bassTargets.map((target, index) => ({
      note: `${target.note}${target.octave}`,
      time: chord.time + target.timeOffset,
      duration: target.duration,
      velocity: index === 0 ? profile.bassVelocity + 0.04 : profile.bassVelocity - 0.04,
    }));
  });
}

function chooseBassPattern(
  root: string,
  fifth: string,
  bar: number,
  profile: MoodProfile,
): BassTarget[] {
  switch (profile.bassPattern) {
    case "simple":
      return [
        { note: root, octave: 2, duration: 4, timeOffset: 0 },
      ];
    case "lifted":
      return [
        { note: root, octave: 2, duration: 2, timeOffset: 0 },
        { note: root, octave: 3, duration: 2, timeOffset: 2 },
      ];
    case "driving":
      return [
        { note: root, octave: 2, duration: 1, timeOffset: 0 },
        { note: fifth, octave: 2, duration: 1, timeOffset: 1 },
        { note: root, octave: 3, duration: 1, timeOffset: 2 },
        { note: fifth, octave: 2, duration: 1, timeOffset: 3 },
      ];
    case "steady":
    default:
      return [
        { note: root, octave: 2, duration: 2, timeOffset: 0 },
        { note: bar % 2 === 0 ? fifth : root, octave: 2, duration: 2, timeOffset: 2 },
      ];
  }
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
