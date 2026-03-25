import { normalizeLoopSettings } from "./constants";
import type { GeneratedLoop, SavedLoop } from "./types";

export function getDefaultLoopName(savedLoops: SavedLoop[]): string {
  return `Loop ${savedLoops.length + 1}`;
}

export function normalizeGeneratedLoop(loop: GeneratedLoop): GeneratedLoop {
  return {
    ...loop,
    settings: normalizeLoopSettings(loop.settings),
    chords: loop.chords.map((chord) => ({
      ...chord,
      notes: [...chord.notes],
    })),
    melody: loop.melody.map((note) => ({ ...note })),
    bass: loop.bass.map((note) => ({ ...note })),
  };
}

export function cloneGeneratedLoop(loop: GeneratedLoop): GeneratedLoop {
  return normalizeGeneratedLoop(loop);
}

export function createSavedLoop(loop: GeneratedLoop, name: string): SavedLoop {
  return {
    id: `${loop.id}-saved-${Date.now()}`,
    name,
    loop: cloneGeneratedLoop(loop),
  };
}

export function moveSavedLoop(savedLoops: SavedLoop[], index: number, direction: -1 | 1): SavedLoop[] {
  const nextIndex = index + direction;

  if (nextIndex < 0 || nextIndex >= savedLoops.length) {
    return savedLoops;
  }

  const nextLoops = [...savedLoops];
  const [item] = nextLoops.splice(index, 1);
  nextLoops.splice(nextIndex, 0, item);

  return nextLoops;
}
