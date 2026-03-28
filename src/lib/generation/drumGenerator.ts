import type {
  DrumEvent,
  DrumInstrument,
  LoopSettings,
  SequenceDensity,
  SequenceEvolution,
  SequenceGroove,
  SequencePatternLength,
  SequenceStyle,
  SequenceVariation,
} from "../../music/types";

type DrumPattern = Record<DrumInstrument, boolean[]>;

const DRUM_INSTRUMENTS: DrumInstrument[] = ["kick", "snare", "hihat"];
const DRUM_DURATION_BEATS: Record<DrumInstrument, number> = {
  kick: 0.18,
  snare: 0.16,
  hihat: 0.1,
};

const DENSITY_HIT_FACTOR: Record<SequenceDensity, number> = {
  low: 0.72,
  medium: 1,
  high: 1.28,
};

const VARIATION_ENDING_STEPS: Record<SequenceVariation, number> = {
  low: 1,
  medium: 2,
  high: 4,
};

function createEmptyPattern(stepCount: number): DrumPattern {
  return {
    kick: Array.from({ length: stepCount }, () => false),
    snare: Array.from({ length: stepCount }, () => false),
    hihat: Array.from({ length: stepCount }, () => false),
  };
}

function clampVelocity(value: number): number {
  return Math.min(0.98, Math.max(0.2, value));
}

function shouldPlaceHit(baseChance: number, density: SequenceDensity): boolean {
  return Math.random() < Math.min(0.95, baseChance * DENSITY_HIT_FACTOR[density]);
}

function mark(pattern: DrumPattern, instrument: DrumInstrument, step: number): void {
  const steps = pattern[instrument];

  if (step < 0 || step >= steps.length) {
    return;
  }

  steps[step] = true;
}

function unmark(pattern: DrumPattern, instrument: DrumInstrument, step: number): void {
  const steps = pattern[instrument];

  if (step < 0 || step >= steps.length) {
    return;
  }

  steps[step] = false;
}

function createBaseKickPattern(stepCount: number, style: SequenceStyle, density: SequenceDensity): boolean[] {
  const kick = Array.from({ length: stepCount }, () => false);
  const beats = 4;
  const stepsPerBeat = stepCount / beats;

  for (let beat = 0; beat < beats; beat += 1) {
    const downbeat = Math.round(beat * stepsPerBeat);

    if (beat === 0 || style === "pulsing" || density !== "low" || beat === 2) {
      kick[Math.min(stepCount - 1, downbeat)] = true;
    }
  }

  if (style === "straight" || style === "legato" || style === "flowing") {
    if (density !== "low" && shouldPlaceHit(0.48, density)) {
      kick[Math.min(stepCount - 1, Math.round(1.5 * stepsPerBeat))] = true;
    }
  }

  if (style === "syncopated") {
    if (shouldPlaceHit(0.65, density)) {
      kick[Math.min(stepCount - 1, Math.round(0.75 * stepsPerBeat))] = true;
    }

    if (shouldPlaceHit(0.58, density)) {
      kick[Math.min(stepCount - 1, Math.round(2.5 * stepsPerBeat))] = true;
    }

    if (density === "high") {
      kick[Math.min(stepCount - 1, Math.round(3.25 * stepsPerBeat))] = true;
    }
  }

  if (style === "arp-like") {
    for (let beat = 0; beat < beats; beat += 1) {
      if (beat % 2 === 0) {
        kick[Math.min(stepCount - 1, Math.round(beat * stepsPerBeat))] = true;
      }

      if (density !== "low" && shouldPlaceHit(0.36, density)) {
        kick[Math.min(stepCount - 1, Math.round(beat * stepsPerBeat + stepsPerBeat * 0.5))] = true;
      }
    }
  }

  if (style === "staccato") {
    for (let step = 0; step < stepCount; step += 1) {
      if (step !== 0 && step % Math.max(1, Math.round(stepsPerBeat)) !== 0) {
        kick[step] = kick[step] && Math.random() < 0.35;
      }
    }
  }

  if (style === "pulsing") {
    for (let beat = 0; beat < beats; beat += 1) {
      kick[Math.min(stepCount - 1, Math.round(beat * stepsPerBeat))] = true;
    }

    if (density === "high") {
      for (let beat = 0; beat < beats; beat += 1) {
        kick[Math.min(stepCount - 1, Math.round(beat * stepsPerBeat + stepsPerBeat * 0.5))] = true;
      }
    }
  }

  if (density === "high") {
    if (shouldPlaceHit(0.5, density)) {
      kick[Math.min(stepCount - 1, Math.round(1.25 * stepsPerBeat))] = true;
    }

    if (shouldPlaceHit(0.44, density)) {
      kick[Math.min(stepCount - 1, Math.round(3.5 * stepsPerBeat) - 1)] = true;
    }
  }

  return kick;
}

function createBaseSnarePattern(stepCount: number, style: SequenceStyle, density: SequenceDensity): boolean[] {
  const snare = Array.from({ length: stepCount }, () => false);
  const stepsPerBeat = stepCount / 4;

  snare[Math.min(stepCount - 1, Math.round(stepsPerBeat * 1))] = style === "staccato" && density === "low";
  snare[Math.min(stepCount - 1, Math.round(stepsPerBeat * 2))] = true;

  if (stepCount > 8) {
    snare[Math.min(stepCount - 1, Math.round(stepsPerBeat * 1))] = false;
  }

  const backbeatFour = Math.min(stepCount - 1, Math.round(stepsPerBeat * 3));
  snare[backbeatFour] = true;

  if (style === "syncopated" && density !== "low" && shouldPlaceHit(0.34, density)) {
    snare[Math.min(stepCount - 1, Math.round(stepsPerBeat * 1.75))] = true;
  }

  if (style === "flowing" || style === "legato") {
    if (density === "high" && shouldPlaceHit(0.26, density)) {
      snare[Math.min(stepCount - 1, Math.round(stepsPerBeat * 3.5))] = true;
    }
  }

  if (style === "arp-like") {
    if (density !== "low" && shouldPlaceHit(0.3, density)) {
      snare[Math.min(stepCount - 1, Math.round(stepsPerBeat * 1.5))] = true;
    }
  }

  return snare;
}

function createBaseHatPattern(stepCount: number, style: SequenceStyle, density: SequenceDensity): boolean[] {
  const hihat = Array.from({ length: stepCount }, () => false);
  const interval = getHatInterval(stepCount, style, density);

  for (let step = 0; step < stepCount; step += interval) {
    hihat[Math.min(stepCount - 1, step)] = true;
  }

  if ((style === "flowing" || style === "legato") && density !== "low") {
    for (let step = Math.floor(interval / 2); step < stepCount; step += interval) {
      if (shouldPlaceHit(0.3, density)) {
        hihat[Math.min(stepCount - 1, step)] = true;
      }
    }
  }

  if (style === "arp-like" || density === "high") {
    for (let step = 0; step < stepCount; step += Math.max(1, Math.floor(interval / 2))) {
      if (step % interval !== 0 && shouldPlaceHit(style === "arp-like" ? 0.72 : 0.55, density)) {
        hihat[Math.min(stepCount - 1, step)] = true;
      }
    }
  }

  if (style === "staccato" || density === "low") {
    for (let step = 0; step < stepCount; step += 1) {
      if (step % interval !== 0 && hihat[step]) {
        hihat[step] = false;
      }
    }
  }

  if (style === "pulsing") {
    const stepsPerBeat = stepCount / 4;

    for (let beat = 0; beat < 4; beat += 1) {
      hihat[Math.min(stepCount - 1, Math.round(beat * stepsPerBeat))] = true;
      hihat[Math.min(stepCount - 1, Math.round(beat * stepsPerBeat + stepsPerBeat * 0.5))] = true;
    }
  }

  return hihat;
}

function getHatInterval(stepCount: number, style: SequenceStyle, density: SequenceDensity): number {
  if (density === "high" || style === "arp-like") {
    return 1;
  }

  if (density === "medium" || style === "flowing" || style === "legato" || style === "pulsing") {
    return Math.max(1, Math.round(stepCount / 8));
  }

  return Math.max(1, Math.round(stepCount / 4));
}

function createBasePattern(stepCount: number, settings: LoopSettings): DrumPattern {
  return {
    kick: createBaseKickPattern(stepCount, settings.sequence.style, settings.sequence.density),
    snare: createBaseSnarePattern(stepCount, settings.sequence.style, settings.sequence.density),
    hihat: createBaseHatPattern(stepCount, settings.sequence.style, settings.sequence.density),
  };
}

function clonePattern(pattern: DrumPattern): DrumPattern {
  return {
    kick: [...pattern.kick],
    snare: [...pattern.snare],
    hihat: [...pattern.hihat],
  };
}

function applyBarVariation(
  basePattern: DrumPattern,
  settings: LoopSettings,
  barIndex: number,
  totalBars: number,
): DrumPattern {
  if (barIndex === 0 || settings.sequence.variation === "low" && settings.sequence.evolution === "static") {
    return clonePattern(basePattern);
  }

  const pattern = clonePattern(basePattern);
  const endingStepCount = Math.min(pattern.kick.length, VARIATION_ENDING_STEPS[settings.sequence.variation]);
  const endingStart = Math.max(0, pattern.kick.length - endingStepCount);
  const development = totalBars <= 1 ? 0 : barIndex / (totalBars - 1);

  if (settings.sequence.evolution === "developing") {
    for (let step = 0; step < pattern.hihat.length; step += 1) {
      if (!pattern.hihat[step] && Math.random() < 0.08 + development * 0.16 && settings.sequence.density !== "low") {
        pattern.hihat[step] = step % 2 === 1;
      }
    }
  }

  if (settings.sequence.evolution === "call & response" && barIndex >= Math.floor(totalBars / 2)) {
    for (let step = 0; step < pattern.kick.length; step += 1) {
      if (step % 2 === 1 && Math.random() < 0.24) {
        pattern.kick[step] = !pattern.kick[step];
      }
    }
  }

  for (let step = endingStart; step < pattern.kick.length; step += 1) {
    const isLastStep = step === pattern.kick.length - 1;

    if (settings.sequence.evolution !== "static" && settings.sequence.density !== "low" && Math.random() < 0.2 + development * 0.2) {
      pattern.hihat[step] = true;
    }

    if (settings.sequence.variation === "high" && isLastStep && settings.sequence.style !== "legato") {
      pattern.kick[step] = true;
    }

    if (settings.sequence.variation !== "low" && step >= endingStart + 1 && Math.random() < 0.18) {
      pattern.snare[step] = settings.sequence.density === "high";
    }
  }

  if (settings.sequence.evolution === "subtle variation" && barIndex === totalBars - 1) {
    pattern.kick[Math.max(0, pattern.kick.length - 2)] = settings.sequence.density !== "low";
  }

  return pattern;
}

function getGrooveOffset(stepIndex: number, stepDuration: number, groove: SequenceGroove, patternLength: SequencePatternLength): number {
  if (groove === "swing") {
    const stepsPerBeat = patternLength / 4;
    const stepInBeat = stepIndex % stepsPerBeat;
    const offbeatStep = Math.floor(stepsPerBeat / 2);

    return stepInBeat === offbeatStep ? stepDuration * 0.18 : 0;
  }

  if (groove === "triplet") {
    const stepsPerBeat = patternLength / 4;
    const stepInBeat = stepIndex % stepsPerBeat;

    if (stepsPerBeat === 4) {
      const tripletOffsets = [0, stepDuration * 0.12, -stepDuration * 0.06, stepDuration * 0.08];
      return tripletOffsets[stepInBeat] ?? 0;
    }

    const tripletOffsets = [0, stepDuration * 0.14];
    return tripletOffsets[stepInBeat] ?? 0;
  }

  return 0;
}

function getVelocity(instrument: DrumInstrument, stepIndex: number, settings: LoopSettings): number {
  const stepsPerBeat = settings.sequence.patternLength / 4;
  const stepInBeat = stepIndex % stepsPerBeat;
  const isDownbeat = stepInBeat === 0;
  const accentBoost = instrument === "kick"
    ? isDownbeat ? 0.12 : 0
    : instrument === "snare"
      ? isDownbeat ? 0.06 : -0.02
      : isDownbeat ? 0.04 : -0.03;
  const densityBoost = settings.sequence.density === "high" ? 0.03 : settings.sequence.density === "low" ? -0.04 : 0;

  return clampVelocity(
    (instrument === "kick" ? 0.86 : instrument === "snare" ? 0.78 : 0.58)
      + accentBoost
      + densityBoost,
  );
}

function buildEventsForBar(pattern: DrumPattern, settings: LoopSettings, barIndex: number): DrumEvent[] {
  const events: DrumEvent[] = [];
  const stepDuration = 4 / settings.sequence.patternLength;
  const barOffset = barIndex * 4;

  DRUM_INSTRUMENTS.forEach((instrument) => {
    pattern[instrument].forEach((isActive, stepIndex) => {
      if (!isActive) {
        return;
      }

      events.push({
        instrument,
        time: barOffset + stepIndex * stepDuration + getGrooveOffset(stepIndex, stepDuration, settings.sequence.groove, settings.sequence.patternLength),
        duration: DRUM_DURATION_BEATS[instrument],
        velocity: getVelocity(instrument, stepIndex, settings),
      });
    });
  });

  return events;
}

export function generateDrumPattern(settings: LoopSettings): DrumEvent[] {
  const totalBars = settings.length;
  const basePattern = createBasePattern(settings.sequence.patternLength, settings);
  const events: DrumEvent[] = [];

  for (let barIndex = 0; barIndex < totalBars; barIndex += 1) {
    const barPattern = applyBarVariation(basePattern, settings, barIndex, totalBars);
    events.push(...buildEventsForBar(barPattern, settings, barIndex));
  }

  return events.sort((left, right) => left.time - right.time);
}
