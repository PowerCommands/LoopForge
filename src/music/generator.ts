import { Note, Scale } from "tonal";
import { createBaseSequencePattern, createPatternForBar, getPatternStepDuration, getSequenceWindows, type SequenceWindow } from "./sequence";
import type {
  ChordEvent,
  GeneratedLoop,
  LayerName,
  LayerToggles,
  LoopLength,
  LoopSettings,
  Mood,
  ScaleType,
  Section,
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

interface SectionProfile {
  melodyDensityMultiplier: number;
  bassDensityMultiplier: number;
  chordDensityMultiplier: number;
  contourChangeMultiplier: number;
  contourMotionLimit: number;
  rhythmOffsetBeats: number;
  melodyDurationMultiplier: number;
  bassDurationMultiplier: number;
  melodyVelocityOffset: number;
  bassVelocityOffset: number;
  repetitionChance: number;
  melodicHoldChance: number;
  repeatPitchChance: number;
  wideRangeChance: number;
  bassPassingChanceMultiplier: number;
  chordStyle: "baseline" | "held" | "driving" | "anticipation";
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

const SECTION_PROFILES: Record<Section, SectionProfile> = {
  intro: {
    melodyDensityMultiplier: 0.72,
    bassDensityMultiplier: 0.8,
    chordDensityMultiplier: 0.8,
    contourChangeMultiplier: 0.7,
    contourMotionLimit: 2,
    rhythmOffsetBeats: 0,
    melodyDurationMultiplier: 1.15,
    bassDurationMultiplier: 1.1,
    melodyVelocityOffset: -0.04,
    bassVelocityOffset: -0.03,
    repetitionChance: 0.32,
    melodicHoldChance: 0.18,
    repeatPitchChance: 0.12,
    wideRangeChance: 0.08,
    bassPassingChanceMultiplier: 0.65,
    chordStyle: "held",
  },
  verse: {
    melodyDensityMultiplier: 1,
    bassDensityMultiplier: 1,
    chordDensityMultiplier: 1,
    contourChangeMultiplier: 1,
    contourMotionLimit: 4,
    rhythmOffsetBeats: 0,
    melodyDurationMultiplier: 1,
    bassDurationMultiplier: 1,
    melodyVelocityOffset: 0,
    bassVelocityOffset: 0,
    repetitionChance: 0,
    melodicHoldChance: 0,
    repeatPitchChance: 0,
    wideRangeChance: 0,
    bassPassingChanceMultiplier: 1,
    chordStyle: "baseline",
  },
  chorus: {
    melodyDensityMultiplier: 1.2,
    bassDensityMultiplier: 1.12,
    chordDensityMultiplier: 1.18,
    contourChangeMultiplier: 1.08,
    contourMotionLimit: 5,
    rhythmOffsetBeats: 0.125,
    melodyDurationMultiplier: 0.92,
    bassDurationMultiplier: 0.94,
    melodyVelocityOffset: 0.04,
    bassVelocityOffset: 0.03,
    repetitionChance: 0.22,
    melodicHoldChance: 0,
    repeatPitchChance: 0.18,
    wideRangeChance: 0.3,
    bassPassingChanceMultiplier: 1.15,
    chordStyle: "driving",
  },
  bridge: {
    melodyDensityMultiplier: 1.08,
    bassDensityMultiplier: 1.02,
    chordDensityMultiplier: 1.08,
    contourChangeMultiplier: 1.28,
    contourMotionLimit: 5,
    rhythmOffsetBeats: 0.25,
    melodyDurationMultiplier: 0.9,
    bassDurationMultiplier: 0.95,
    melodyVelocityOffset: 0.01,
    bassVelocityOffset: 0.01,
    repetitionChance: 0.08,
    melodicHoldChance: 0,
    repeatPitchChance: 0.06,
    wideRangeChance: 0.35,
    bassPassingChanceMultiplier: 1.2,
    chordStyle: "anticipation",
  },
  outro: {
    melodyDensityMultiplier: 0.68,
    bassDensityMultiplier: 0.72,
    chordDensityMultiplier: 0.78,
    contourChangeMultiplier: 0.65,
    contourMotionLimit: 2,
    rhythmOffsetBeats: 0,
    melodyDurationMultiplier: 1.25,
    bassDurationMultiplier: 1.2,
    melodyVelocityOffset: -0.05,
    bassVelocityOffset: -0.04,
    repetitionChance: 0.26,
    melodicHoldChance: 0.24,
    repeatPitchChance: 0.1,
    wideRangeChance: 0.06,
    bassPassingChanceMultiplier: 0.6,
    chordStyle: "held",
  },
};

export function generateLoop(settings: LoopSettings): GeneratedLoop {
  const profile = MOOD_PROFILES[settings.mood];
  const sectionProfile = getSectionProfile(settings.section);
  const scaleNotes = getScaleNotes(settings.key, settings.scale);
  const degreeChords = getDegreeChords(scaleNotes, settings.scale);
  const progression = buildProgression(degreeChords, settings.scale, settings.mood, settings.length, settings.section);

  return {
    id: `${Date.now()}`,
    settings,
    totalBeats: settings.length * 4,
    chords: settings.layers.chords ? progression : [],
    melody: settings.layers.melody ? buildMelody(progression, scaleNotes, settings, profile, sectionProfile) : [],
    bass: settings.layers.bass ? buildBass(progression, scaleNotes, settings, profile, sectionProfile) : [],
  };
}

export function rerollGeneratedLoopLayer(existingLoop: GeneratedLoop, settings: LoopSettings, layer: LayerName): GeneratedLoop {
  const nextSettings: LoopSettings = {
    ...settings,
    layers: {
      ...settings.layers,
      [layer]: true,
    },
  };
  const profile = MOOD_PROFILES[nextSettings.mood];
  const sectionProfile = getSectionProfile(nextSettings.section);
  const scaleNotes = getScaleNotes(nextSettings.key, nextSettings.scale);
  const degreeChords = getDegreeChords(scaleNotes, nextSettings.scale);
  const rerolledProgression = buildProgression(
    degreeChords,
    nextSettings.scale,
    nextSettings.mood,
    nextSettings.length,
    nextSettings.section,
  );
  const progressionForSingleLayer = existingLoop.chords.length > 0 ? existingLoop.chords : rerolledProgression;

  return {
    id: `${Date.now()}`,
    settings: nextSettings,
    totalBeats: nextSettings.length * 4,
    chords:
      layer === "chords"
        ? rerolledProgression
        : nextSettings.layers.chords
          ? existingLoop.chords
          : [],
    melody:
      layer === "melody"
        ? buildMelody(progressionForSingleLayer, scaleNotes, nextSettings, profile, sectionProfile)
        : nextSettings.layers.melody
          ? existingLoop.melody
          : [],
    bass:
      layer === "bass"
        ? buildBass(progressionForSingleLayer, scaleNotes, nextSettings, profile, sectionProfile)
        : nextSettings.layers.bass
          ? existingLoop.bass
          : [],
  };
}

function getSectionProfile(section: Section): SectionProfile {
  return SECTION_PROFILES[section];
}

function applySectionChordRhythm(progression: ChordEvent[], sectionProfile: SectionProfile): ChordEvent[] {
  switch (sectionProfile.chordStyle) {
    case "driving":
      return progression.flatMap((chord) => [
        { ...chord, duration: 2 },
        { ...chord, time: chord.time + 2, duration: 2 },
      ]);
    case "anticipation":
      return progression.flatMap((chord, index) => {
        const nextChord = progression[index + 1];

        if (!nextChord) {
          return chord;
        }

        return [
          { ...chord, duration: 2 },
          {
            ...nextChord,
            bar: chord.bar,
            time: chord.time + 2,
            duration: 2,
          },
        ];
      });
    case "held":
    case "baseline":
    default:
      return progression;
  }
}

function reshapeWindowsByDensity(
  windows: SequenceRenderWindow[],
  densityMultiplier: number,
  settings: LoopSettings,
  layer: "melody" | "bass",
): SequenceRenderWindow[] {
  if (windows.length <= 1 || Math.abs(densityMultiplier - 1) < 0.01) {
    return windows;
  }

  const minimumDuration = settings.sequence.groove === "triplet" ? 2 / 3 : 0.5;
  const targetCount = Math.max(1, Math.round(windows.length * densityMultiplier));

  if (targetCount < windows.length) {
    const ranked = [...windows]
      .map((window, index) => ({
        window,
        score: (isStrongAccent(window.time % 4) ? 3 : 0) + window.duration + (index === 0 ? 1.5 : 0),
      }))
      .sort((left, right) => right.score - left.score)
      .slice(0, targetCount)
      .map(({ window }) => window)
      .sort((left, right) => left.time - right.time);

    return normalizeSequenceRenderWindows(ranked);
  }

  const expanded = [...windows];
  let splitsRemaining = targetCount - windows.length;

  for (const window of [...windows].sort((left, right) => right.duration - left.duration)) {
    if (splitsRemaining <= 0 || window.duration < minimumDuration) {
      continue;
    }

    const splitPoint = layer === "bass" ? window.duration * 0.5 : window.duration * 0.45;
    expanded.push({
      ...window,
      time: window.time + splitPoint,
      duration: Math.max(0.2, window.duration - splitPoint),
    });
    window.duration = Math.max(0.2, splitPoint);
    splitsRemaining -= 1;
  }

  return normalizeSequenceRenderWindows(expanded);
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
  section: Section,
): ChordEvent[] {
  const template = pickTemplate(scale, mood);
  const degreeSequence = length === 2 ? compressTemplate(template.degrees) : template.degrees;

  const progression = degreeSequence.map((roman, index) => {
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

  return applySectionChordRhythm(progression, getSectionProfile(section));
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
  sectionProfile: SectionProfile,
): TimedNote[] {
  const melody: TimedNote[] = [];
  const basePattern = createBaseSequencePattern("melody", settings.sequence);
  const totalBars = progression.length;
  const baseWindowCount = getBaseWindowCount(basePattern);
  const motifContour = createMelodyContour(Math.max(1, baseWindowCount), settings, profile, sectionProfile);
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
      sectionProfile,
    );

    if (windows.length === 0) {
      return;
    }

    const contour = evolveMelodyContour(motifContour, windows.length, settings, evolutionContext, sectionProfile);

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
        sectionProfile,
      );

      previousPitchClass = Note.pitchClass(note);

      melody.push({
        note,
        time: window.time,
        duration: Math.max(0.2, window.duration * sectionProfile.melodyDurationMultiplier),
        velocity: chooseMelodyVelocity(beatInBar, noteIndex, settings, profile, evolutionContext, sectionProfile),
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
  sectionProfile: SectionProfile,
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
      sectionProfile,
    );
    const nextChord = progression[(barIndex + 1) % progression.length] ?? chord;

    windows.forEach((window, noteIndex) => {
      const beatInBar = window.time - chord.time;
      const target = chooseBassTarget(
        chord,
        nextChord,
        scaleNotes,
        noteIndex,
        windows.length,
        beatInBar,
        settings,
        evolutionContext,
        sectionProfile,
      );

      bass.push({
        note: `${target.note}${target.octave}`,
        time: window.time,
        duration: Math.max(0.2, window.duration * sectionProfile.bassDurationMultiplier),
        velocity: chooseBassVelocity(beatInBar, noteIndex, profile, settings, evolutionContext, sectionProfile),
      });
    });
  });

  return bass;
}

function createMelodyContour(
  noteCount: number,
  settings: LoopSettings,
  profile: MoodProfile,
  sectionProfile: SectionProfile,
): number[] {
  const pool = MELODY_CONTOUR_POOLS[settings.sequence.style];
  const contour: number[] = [];

  for (let index = 0; index < noteCount; index += 1) {
    if (index === 0) {
      contour.push(0);
      continue;
    }

    const previousValue = contour[index - 1] ?? 0;

    if (Math.random() < sectionProfile.repetitionChance) {
      contour.push(previousValue);
      continue;
    }

    if (Math.random() < sectionProfile.melodicHoldChance) {
      contour.push(0);
      continue;
    }

    if (Math.random() < profile.melodyStepwiseChance) {
      contour.push(clampContourMotion(pickRandom([0, 1, -1, 1, -1, 2, -2]), sectionProfile.contourMotionLimit));
      continue;
    }

    contour.push(clampContourMotion(pickRandom([...pool]), sectionProfile.contourMotionLimit));
  }

  return contour;
}

function getBaseWindowCount(basePattern: ReturnType<typeof createBaseSequencePattern>): number {
  return getSequenceWindows(basePattern).length;
}

function evolveMelodyContour(
  baseContour: number[],
  noteCount: number,
  settings: LoopSettings,
  context: EvolutionBarContext,
  sectionProfile: SectionProfile,
): number[] {
  if (context.barIndex === 0) {
    return Array.from({ length: noteCount }, (_, index) => baseContour[index % baseContour.length] ?? 0);
  }

  const seededContour = varyMelodyContour(
    baseContour,
    noteCount,
    settings,
    getContourChangeChance(settings, context, sectionProfile),
    sectionProfile,
  );
  const progress = getEvolutionProgress(context);

  switch (context.evolution) {
    case "subtle variation":
      if (context.barIndex === context.totalBars - 1 && seededContour.length > 0) {
        seededContour[seededContour.length - 1] = clampContourMotion(
          (seededContour[seededContour.length - 1] ?? 0) + 1,
          sectionProfile.contourMotionLimit,
        );
      }
      return seededContour;
    case "developing":
      return seededContour.map((value, index) => {
        if (index === 0) {
          return 0;
        }

        const growth = index >= Math.floor(seededContour.length / 2) ? Math.round(progress * 2) : 0;
        return clampContourMotion(value + growth, sectionProfile.contourMotionLimit);
      });
    case "call & response":
      return createCallResponseContour(seededContour, context, sectionProfile.contourMotionLimit);
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
  sectionProfile: SectionProfile,
): number[] {
  const pool = MELODY_CONTOUR_POOLS[settings.sequence.style];

  return Array.from({ length: noteCount }, (_, index) => {
    const baseValue = baseContour[index % baseContour.length] ?? 0;

    if (index === 0) {
      return 0;
    }

    if (index > 0 && Math.random() < sectionProfile.repetitionChance) {
      return baseContour[(index - 1) % baseContour.length] ?? 0;
    }

    if (Math.random() < changeChance) {
      return clampContourMotion(pickRandom([...pool]), sectionProfile.contourMotionLimit);
    }

    return clampContourMotion(baseValue, sectionProfile.contourMotionLimit);
  });
}

function getContourChangeChance(
  settings: LoopSettings,
  context: EvolutionBarContext,
  sectionProfile: SectionProfile,
): number {
  const baseChance = VARIATION_CHANGE_CHANCE[settings.sequence.variation];
  const progress = getEvolutionProgress(context);

  switch (context.evolution) {
    case "subtle variation":
      return clampProbability((baseChance * 0.75 + progress * 0.08) * sectionProfile.contourChangeMultiplier);
    case "developing":
      return clampProbability((baseChance + 0.12 + progress * 0.18) * sectionProfile.contourChangeMultiplier);
    case "call & response":
      return clampProbability((baseChance + (context.barIndex % 2 === 1 ? 0.12 : 0.04)) * sectionProfile.contourChangeMultiplier);
    case "static":
    default:
      return clampProbability(baseChance * sectionProfile.contourChangeMultiplier);
  }
}

function evolveMelodyWindows(
  windows: SequenceRenderWindow[],
  settings: LoopSettings,
  context: EvolutionBarContext,
  sectionProfile: SectionProfile,
): SequenceRenderWindow[] {
  if (windows.length === 0) {
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

    if (sectionProfile.rhythmOffsetBeats > 0 && index > 0 && !isStrongAccent(window.time - Math.floor(window.time / 4) * 4)) {
      const sectionDelay = context.barIndex % 2 === 1 ? sectionProfile.rhythmOffsetBeats : sectionProfile.rhythmOffsetBeats * 0.5;
      nextTime = Math.min(Math.floor(window.time / 4) * 4 + 3.75, nextTime + sectionDelay);
    }

    return {
      ...window,
      time: nextTime,
      duration: nextDuration,
    };
  });

  return reshapeWindowsByDensity(normalizeSequenceRenderWindows(evolved), sectionProfile.melodyDensityMultiplier, settings, "melody");
}

function evolveBassWindows(
  windows: SequenceRenderWindow[],
  chord: ChordEvent,
  settings: LoopSettings,
  context: EvolutionBarContext,
  sectionProfile: SectionProfile,
): SequenceRenderWindow[] {
  if (windows.length === 0) {
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

    if (sectionProfile.rhythmOffsetBeats > 0 && index > 0 && !isStrongAccent(window.time - chord.time)) {
      return {
        ...window,
        time: Math.min(chord.time + 3.75, window.time + sectionProfile.rhythmOffsetBeats * 0.5),
      };
    }

    return window;
  });

  return reshapeWindowsByDensity(normalizeSequenceRenderWindows(evolved), sectionProfile.bassDensityMultiplier, settings, "bass");
}

function createCallResponseContour(contour: number[], context: EvolutionBarContext, contourMotionLimit: number): number[] {
  const isResponseBar = context.barIndex % 2 === 1;

  if (!isResponseBar) {
    if (context.barIndex >= 2) {
      return contour.map((value, index) =>
        index === contour.length - 1 ? clampContourMotion(value + 1, contourMotionLimit) : value,
      );
    }

    return contour;
  }

  return contour.map((value, index) => {
    if (index === 0) {
      return 0;
    }

    const inverted = clampContourMotion(-value || -1, contourMotionLimit);
    return index === contour.length - 1 ? clampContourMotion(inverted - 1, contourMotionLimit) : inverted;
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

function clampContourMotion(value: number, limit = 4): number {
  return Math.max(-limit, Math.min(limit, value));
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
  sectionProfile: SectionProfile,
): string {
  const chordTones = chord.notes.map((note) => Note.pitchClass(note));

  if (settings.sequence.style === "arp-like") {
    const arpTone = chordTones[noteIndex % chordTones.length] ?? chordTones[0] ?? scaleNotes[0];
    const resolvedArpTone = isStrongAccent ? arpTone : keepScaleTone(arpTone, scaleNotes);
    return `${resolvedArpTone}${chooseMelodyOctave(noteIndex, chord.bar, contourMotion, settings, profile, sectionProfile)}`;
  }

  if (
    previousPitchClass &&
    ((settings.sequence.style === "pulsing" && noteIndex % 2 === 1 && Math.random() < 0.7) ||
      Math.random() < sectionProfile.repeatPitchChance)
  ) {
    const repeatedPitchClass = isStrongAccent
      ? resolveChordToneTarget(previousPitchClass, chordTones, scaleNotes)
      : previousPitchClass;
    return `${repeatedPitchClass}${chooseMelodyOctave(noteIndex, chord.bar, 0, settings, profile, sectionProfile)}`;
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
  adjustedMotion = clampContourMotion(adjustedMotion, sectionProfile.contourMotionLimit);
  const nextPitchClass = scaleNotes[wrapScaleIndex(seedIndex + adjustedMotion, scaleNotes.length)] ?? scaleNotes[0];
  const resolvedPitchClass = isStrongAccent
    ? resolveChordToneTarget(nextPitchClass, chordTones, scaleNotes)
    : keepScaleTone(nextPitchClass, scaleNotes);

  return `${resolvedPitchClass}${chooseMelodyOctave(noteIndex, chord.bar, adjustedMotion, settings, profile, sectionProfile)}`;
}

function chooseMelodyOctave(
  noteIndex: number,
  barIndex: number,
  contourMotion: number,
  settings: LoopSettings,
  profile: MoodProfile,
  sectionProfile: SectionProfile,
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
    const widePool = sectionProfile.wideRangeChance > 0.2 ? [3, 4, 5, 4, 5] : [4, 4, 5, 4];
    return widePool[(noteIndex + barIndex + Math.abs(contourMotion)) % widePool.length] ?? 4;
  }

  if (sectionProfile.wideRangeChance > 0 && settings.sequence.register === "mid" && Math.random() < sectionProfile.wideRangeChance) {
    return contourMotion >= 0 ? 5 : 4;
  }

  return profile.melodyOctaves[(noteIndex + barIndex) % profile.melodyOctaves.length];
}

function chooseMelodyVelocity(
  beat: number,
  noteIndex: number,
  settings: LoopSettings,
  profile: MoodProfile,
  context: EvolutionBarContext,
  sectionProfile: SectionProfile,
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
  return clampVelocity(profile.melodyVelocity + accent + styleBoost + motifBoost + evolutionBoost + sectionProfile.melodyVelocityOffset);
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
  sectionProfile: SectionProfile,
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
    if (isLastWindow && root !== nextRoot && rollWithMultiplier(0.35, sectionProfile.bassPassingChanceMultiplier)) {
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
      if (isLastWindow && root !== nextRoot && rollWithMultiplier(0.45, sectionProfile.bassPassingChanceMultiplier)) {
        return passingTarget;
      }

      return strongAccent ? lowRoot : pickRandom([lowRoot, fifthTarget]);
    case "legato":
      if (strongAccent) {
        return Math.random() < 0.78 ? lowRoot : fifthTarget;
      }

      return pickRandom([lowRoot, fifthTarget, octaveRoot]);
    case "syncopated":
      if (isLastWindow && root !== nextRoot && rollWithMultiplier(0.55, sectionProfile.bassPassingChanceMultiplier)) {
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

      if (isLastWindow && root !== nextRoot && rollWithMultiplier(0.35, sectionProfile.bassPassingChanceMultiplier)) {
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
  sectionProfile: SectionProfile,
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
  return clampVelocity(profile.bassVelocity + accent + styleBoost + evolutionBoost + sectionProfile.bassVelocityOffset);
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

function rollWithMultiplier(baseChance: number, multiplier: number): boolean {
  return Math.random() < clampProbability(baseChance * multiplier);
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
