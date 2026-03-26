import type {
  SequenceDensity,
  SequenceEvolution,
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

const EVOLUTION_MUTATION_INTENSITY: Record<SequenceEvolution, number> = {
  static: 0,
  "subtle variation": 0.3,
  developing: 0.75,
  "call & response": 0.55,
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
  totalBars: number,
): SequencePattern {
  if (barIndex === 0) {
    return basePattern;
  }

  const evolutionChanceBoost = getEvolutionMutationChanceBoost(settings.evolution, barIndex, totalBars, layer);

  if (Math.random() > clampProbability(VARIATION_MUTATION_CHANCE[settings.variation] + evolutionChanceBoost)) {
    return applyEvolutionPatternShape(basePattern, basePattern, settings.evolution, barIndex, totalBars, layer);
  }

  const nextPattern: SequencePattern = {
    length: basePattern.length,
    steps: [...basePattern.steps],
  };

  const mutationCount = Math.min(
    nextPattern.steps.length - 1,
    VARIATION_MUTATION_COUNT[settings.variation]
      + Math.round(getEvolutionMutationCountBoost(settings.evolution, barIndex, totalBars, layer))
      + (barIndex % 2 === 0 ? 0 : 1),
  );

  for (let mutationIndex = 0; mutationIndex < mutationCount; mutationIndex += 1) {
    const stepIndex = 1 + Math.floor(Math.random() * (nextPattern.steps.length - 1));
    nextPattern.steps[stepIndex] = mutateStepState(nextPattern.steps, stepIndex, layer, settings.style);
  }

  return applyEvolutionPatternShape(normalizePattern(nextPattern), basePattern, settings.evolution, barIndex, totalBars, layer);
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
    case "legato":
      return clampProbability(baseChance + 0.3);
    case "arp-like":
      return clampProbability(baseChance + 0.04);
    case "staccato":
      return clampProbability(baseChance - 0.12);
    case "pulsing":
      return clampProbability(baseChance - 0.04);
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
  const isEighthPulse = stepInBeat === 0 || (stepsPerBeat >= 2 && stepInBeat === Math.floor(stepsPerBeat / 2));

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
    case "staccato":
      if (stepIndex === 0) {
        return 0.26;
      }

      return isDownbeat ? 0.06 : -0.12;
    case "legato":
      if (stepIndex === 0) {
        return 0.28;
      }

      return isDownbeat || isSubdivisionAccent ? 0.08 : 0.02;
    case "pulsing":
      if (stepIndex === 0) {
        return 0.28;
      }

      return isEighthPulse ? 0.16 : -0.06;
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

function getEvolutionMutationChanceBoost(
  evolution: SequenceEvolution,
  barIndex: number,
  totalBars: number,
  layer: SequenceLayer,
): number {
  const progress = totalBars > 1 ? barIndex / (totalBars - 1) : 0;

  switch (evolution) {
    case "subtle variation":
      return 0.08 + progress * 0.08;
    case "developing":
      return 0.14 + progress * (layer === "melody" ? 0.26 : 0.18);
    case "call & response":
      return barIndex % 2 === 1 ? 0.18 : 0.1;
    case "static":
    default:
      return 0;
  }
}

function getEvolutionMutationCountBoost(
  evolution: SequenceEvolution,
  barIndex: number,
  totalBars: number,
  layer: SequenceLayer,
): number {
  const progress = totalBars > 1 ? barIndex / (totalBars - 1) : 0;
  const layerBias = layer === "melody" ? 1 : 0.5;

  switch (evolution) {
    case "subtle variation":
      return progress * layerBias;
    case "developing":
      return 1 + progress * (2 * layerBias);
    case "call & response":
      return (barIndex % 2 === 1 ? 1 + layerBias : 0.5) * EVOLUTION_MUTATION_INTENSITY[evolution];
    case "static":
    default:
      return 0;
  }
}

// Evolution reshapes the rhythmic phrase after the base pattern is built so each bar
// still feels connected to the original motif instead of sounding fully regenerated.
function applyEvolutionPatternShape(
  pattern: SequencePattern,
  basePattern: SequencePattern,
  evolution: SequenceEvolution,
  barIndex: number,
  totalBars: number,
  layer: SequenceLayer,
): SequencePattern {
  if (evolution === "static") {
    return pattern;
  }

  const steps = [...pattern.steps];
  const progress = totalBars > 1 ? barIndex / (totalBars - 1) : 0;

  if (evolution === "subtle variation") {
    if (barIndex === totalBars - 1) {
      addEndingFigure(steps, layer === "melody" ? 2 : 1);
    } else if (Math.random() < 0.45) {
      softenOneInteriorTrigger(steps);
    }
  }

  if (evolution === "developing") {
    if (progress >= 0.4) {
      addInteriorTrigger(steps, basePattern.steps, Math.random() < 0.45);
    }

    if (progress >= 0.7) {
      addEndingFigure(steps, layer === "melody" ? 3 : 2);
    }
  }

  if (evolution === "call & response") {
    if (barIndex % 2 === 1) {
      softenOneInteriorTrigger(steps);
      createResponseGap(steps);
    } else if (barIndex >= 2) {
      addEndingFigure(steps, layer === "melody" ? 2 : 1);
    }
  }

  return normalizePattern({
    ...pattern,
    steps,
  });
}

function softenOneInteriorTrigger(steps: SequenceStepState[]): void {
  const triggerIndexes = steps
    .map((step, index) => ({ step, index }))
    .filter(({ step, index }) => step === "trigger" && index > 0 && index < steps.length - 1)
    .map(({ index }) => index);

  if (triggerIndexes.length === 0) {
    return;
  }

  const targetIndex = triggerIndexes[Math.floor(Math.random() * triggerIndexes.length)];
  steps[targetIndex] = "rest";
}

function addInteriorTrigger(steps: SequenceStepState[], baseSteps: SequenceStepState[], preferLater: boolean): void {
  const candidates = steps
    .map((step, index) => ({ step, index }))
    .filter(({ step, index }) => step === "rest" && index > 0 && index < steps.length - 1);

  if (candidates.length === 0) {
    return;
  }

  const orderedCandidates = preferLater ? [...candidates].sort((left, right) => right.index - left.index) : candidates;
  const preferred = orderedCandidates.find(({ index }) => baseSteps[index] !== "trigger") ?? orderedCandidates[0];

  if (preferred) {
    steps[preferred.index] = "trigger";
  }
}

function addEndingFigure(steps: SequenceStepState[], noteCount: number): void {
  const startIndex = Math.max(1, steps.length - (noteCount + 1));

  for (let index = startIndex; index < steps.length; index += 1) {
    steps[index] = index === startIndex || steps[index - 1] !== "rest" ? "trigger" : "rest";
  }
}

function createResponseGap(steps: SequenceStepState[]): void {
  const responseIndex = Math.max(1, Math.floor(steps.length / 4));
  steps[responseIndex] = "rest";

  if (responseIndex + 1 < steps.length && steps[responseIndex + 1] === "hold") {
    steps[responseIndex + 1] = "rest";
  }
}

function clampProbability(value: number): number {
  return Math.min(0.92, Math.max(0.04, value));
}
