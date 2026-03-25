import { cloneGeneratedLoop, normalizeGeneratedLoop } from "./arrangement";
import { APP_STORAGE_KEYS } from "../lib/appStorage";
import type { SavedLoop } from "./types";

export interface StoredArrangementLoop {
  id: string;
  name: string;
  seconds: number;
  loop: SavedLoop["loop"];
}

export interface StoredArrangement {
  id: string;
  name: string;
  url: string;
  tempo: number;
  createdAt: string;
  text1: string;
  text2: string;
  loops: StoredArrangementLoop[];
}

export const ARRANGEMENT_LIBRARY_STORAGE_KEY = APP_STORAGE_KEYS.arrangements;

export function createStoredArrangement(name: string, url: string, savedLoops: SavedLoop[]): StoredArrangement {
  return {
    id: `arrangement-${Date.now()}`,
    name,
    url,
    tempo: savedLoops[0]?.loop.settings.tempo ?? 120,
    createdAt: new Date().toISOString(),
    text1: "",
    text2: "",
    loops: savedLoops.map((savedLoop) => ({
      id: savedLoop.id,
      name: savedLoop.name,
      seconds: savedLoop.seconds,
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
    const parsed = JSON.parse(raw) as Partial<StoredArrangement>[];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.flatMap((arrangement) => {
      if (
        typeof arrangement?.id !== "string" ||
        typeof arrangement?.name !== "string" ||
        typeof arrangement?.tempo !== "number" ||
        typeof arrangement?.createdAt !== "string" ||
        !Array.isArray(arrangement?.loops)
      ) {
        return [];
      }

      return [
        {
          id: arrangement.id,
          name: arrangement.name,
          url: typeof arrangement.url === "string" ? arrangement.url : "",
          tempo: arrangement.tempo,
          createdAt: arrangement.createdAt,
          text1: typeof arrangement.text1 === "string" ? arrangement.text1 : "",
          text2: typeof arrangement.text2 === "string" ? arrangement.text2 : "",
          loops: arrangement.loops.map((loop) => ({
            ...loop,
            seconds:
              typeof loop.seconds === "number" && Number.isFinite(loop.seconds) && loop.seconds > 0
                ? Math.round(loop.seconds)
                : Math.round((loop.loop.totalBeats * 60) / loop.loop.settings.tempo),
            loop: normalizeGeneratedLoop(loop.loop),
          })),
        },
      ];
    });
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
