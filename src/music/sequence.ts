import type {
  SequenceDensity,
  SequencePattern,
  SequencePatternLength,
  SequenceSettings,
  SequenceStepState,
  SequenceStyle,
} from "./types";

type SequenceLayer = "bass" | "melody";

export interface SequenceWindow {
  startBeat: number;
  durationBeats: number;
  stepIndex: number;
  stepCount: number;
}

const DENSITY_TRIGGER_CHANCE: Record<SequenceDensity, number> = {
  low: 0.22,
  medium: 0.38,
  high: 0.54,
};

const VARIATION_MUTATION_CHANCE = {
  low: 0.18,
  medium: 0.34,
  high: 0.52,
};

const VARIATION_MUTATION_COUNT = {
  low: 1,
  medium: 2,
  high: 3,
};

export function createBaseSequencePattern(layer: SequenceLayer, settings: SequenceSettings): SequencePattern {
  const steps = Array.from({ length: settings.patternLength }, (_, index) => createInitialStep(layer, settings, index));
  return normalizePattern({
    length: settings.patternLength,
    steps,
  });
}

export function createPatternForBar(
  basePattern: SequencePattern,
  layer: SequenceLayer,
  settings: SequenceSettings,
  barIndex: number,
): SequencePattern {
  if (barIndex === 0) {
    return basePattern;
  }

  if (Math.random() > VARIATION_MUTATION_CHANCE[settings.variation]) {
    return basePattern;
  }

  const nextPattern: SequencePattern = {
    length: basePattern.length,
    steps: [...basePattern.steps],
  };

  const mutationCount = Math.min(
    nextPattern.steps.length - 1,
    VARIATION_MUTATION_COUNT[settings.variation] + (barIndex % 2 === 0 ? 0 : 1),
  );

  for (let mutationIndex = 0; mutationIndex < mutationCount; mutationIndex += 1) {
    const stepIndex = 1 + Math.floor(Math.random() * (nextPattern.steps.length - 1));
    nextPattern.steps[stepIndex] = mutateStepState(nextPattern.steps, stepIndex, layer, settings.style);
  }

  return normalizePattern(nextPattern);
}

export function getPatternStepDuration(length: SequencePatternLength): number {
  return 4 / length;
}

export function getSequenceWindows(pattern: SequencePattern): SequenceWindow[] {
  const stepDuration = getPatternStepDuration(pattern.length);
  const windows: SequenceWindow[] = [];
  let stepIndex = 0;

  while (stepIndex < pattern.steps.length) {
    if (pattern.steps[stepIndex] !== "trigger") {
      stepIndex += 1;
      continue;
    }

    let holdCount = 0;

    while (pattern.steps[stepIndex + holdCount + 1] === "hold") {
      holdCount += 1;
    }

    windows.push({
      startBeat: stepIndex * stepDuration,
      durationBeats: (holdCount + 1) * stepDuration,
      stepIndex,
      stepCount: holdCount + 1,
    });

    stepIndex += holdCount + 1;
  }

  return windows;
}

function createInitialStep(layer: SequenceLayer, settings: SequenceSettings, stepIndex: number): SequenceStepState {
  if (stepIndex === 0) {
    return "trigger";
  }

  const triggerChance = getTriggerChance(layer, settings, stepIndex);

  if (Math.random() < triggerChance) {
    return "trigger";
  }

  const holdChance = getHoldChance(layer, settings.style);
  return Math.random() < holdChance ? "hold" : "rest";
}

function mutateStepState(
  steps: SequenceStepState[],
  stepIndex: number,
  layer: SequenceLayer,
  style: SequenceStyle,
): SequenceStepState {
  const current = steps[stepIndex];

  if (current === "trigger") {
    return Math.random() < 0.5 ? "rest" : "hold";
  }

  if (current === "hold") {
    return Math.random() < 0.5 ? "trigger" : "rest";
  }

  return Math.random() < 0.35 + (layer === "melody" ? 0.08 : 0) + (style === "arp-like" ? 0.08 : 0) ? "trigger" : "hold";
}

function normalizePattern(pattern: SequencePattern): SequencePattern {
  const steps = [...pattern.steps];
  steps[0] = "trigger";

  for (let index = 1; index < steps.length; index += 1) {
    if (steps[index] === "hold" && steps[index - 1] === "rest") {
      steps[index] = "rest";
    }
  }

  if (!steps.includes("trigger")) {
    steps[0] = "trigger";
  }

  if (steps.every((step, index) => index === 0 || step !== "trigger")) {
    steps[Math.floor(steps.length / 2)] = "trigger";
  }

  return {
    length: pattern.length,
    steps,
  };
}

function getTriggerChance(layer: SequenceLayer, settings: SequenceSettings, stepIndex: number): number {
  const baseChance = DENSITY_TRIGGER_CHANCE[settings.density];
  const stepBias = getStyleBias(settings.style, settings.patternLength, stepIndex);
  const layerBias = layer === "bass" ? -0.04 : 0.05;
  return clampProbability(baseChance + stepBias + layerBias);
}

function getHoldChance(layer: SequenceLayer, style: SequenceStyle): number {
  const baseChance = layer === "melody" ? 0.18 : 0.1;

  switch (style) {
    case "flowing":
      return clampProbability(baseChance + 0.22);
    case "arp-like":
      return clampProbability(baseChance + 0.04);
    case "syncopated":
      return clampProbability(baseChance - 0.08);
    case "straight":
    default:
      return clampProbability(baseChance);
  }
}

function getStyleBias(style: SequenceStyle, patternLength: SequencePatternLength, stepIndex: number): number {
  const stepsPerBeat = patternLength / 4;
  const stepInBeat = stepIndex % stepsPerBeat;
  const isDownbeat = stepInBeat === 0;
  const isSubdivisionAccent = stepsPerBeat === 4 && stepInBeat === 2;
  const isOffbeat = !isDownbeat;

  switch (style) {
    case "syncopated":
      if (stepIndex === 0) {
        return 0.3;
      }

      if (isOffbeat) {
        return 0.18;
      }

      return -0.08;
    case "flowing":
      if (isDownbeat || stepInBeat === stepsPerBeat - 1) {
        return 0.08;
      }

      return 0.02;
    case "arp-like":
      if (isDownbeat || isSubdivisionAccent) {
        return 0.12;
      }

      return -0.02;
    case "straight":
    default:
      if (stepIndex === 0) {
        return 0.3;
      }

      if (isDownbeat) {
        return 0.16;
      }

      if (isSubdivisionAccent) {
        return 0.06;
      }

      return -0.08;
  }
}

function clampProbability(value: number): number {
  return Math.min(0.92, Math.max(0.04, value));
}
