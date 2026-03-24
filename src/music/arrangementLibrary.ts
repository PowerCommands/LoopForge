import { cloneGeneratedLoop } from "./arrangement";
import type { SavedLoop } from "./types";

export interface StoredArrangementLoop {
  id: string;
  name: string;
  loop: SavedLoop["loop"];
}

export interface StoredArrangement {
  id: string;
  name: string;
  tempo: number;
  createdAt: string;
  loops: StoredArrangementLoop[];
}

const ARRANGEMENT_LIBRARY_STORAGE_KEY = "loop-forge-arrangement-library";

export function createStoredArrangement(name: string, savedLoops: SavedLoop[]): StoredArrangement {
  return {
    id: `arrangement-${Date.now()}`,
    name,
    tempo: savedLoops[0]?.loop.settings.tempo ?? 120,
    createdAt: new Date().toISOString(),
    loops: savedLoops.map((savedLoop) => ({
      id: savedLoop.id,
      name: savedLoop.name,
      loop: cloneGeneratedLoop(savedLoop.loop),
    })),
  };
}

export function loadStoredArrangements(): StoredArrangement[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(ARRANGEMENT_LIBRARY_STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as StoredArrangement[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredArrangements(arrangements: StoredArrangement[]): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ARRANGEMENT_LIBRARY_STORAGE_KEY, JSON.stringify(arrangements));
}
