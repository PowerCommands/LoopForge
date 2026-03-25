import { useEffect, useMemo, useRef, useState } from "react";
import { ArrangementLibraryView } from "./components/ArrangementLibraryView";
import { AppShell } from "./components/AppShell";
import { LeftSidebar } from "./components/LeftSidebar";
import { LyricsWorkspace } from "./components/LyricsWorkspace";
import { MainWorkspace } from "./components/MainWorkspace";
import { RightSidebar } from "./components/RightSidebar";
import { SettingsWorkspace } from "./components/SettingsWorkspace";
import { TopBar } from "./components/TopBar";
import { useTheme } from "./components/ThemeProvider";
import {
  audioBufferToWavBlob,
  createArrangementWavFilename,
  createLoopWavFilename,
  downloadBlob,
  renderArrangementToAudioBuffer,
  renderCurrentLoopToAudioBuffer,
} from "./audio/exportWav";
import type { ExportFormat } from "./components/ui/export-dialog";
import { cloneGeneratedLoop, cloneSavedLoops, createSavedLoop, getDefaultLoopName, normalizeGeneratedLoop, normalizeSavedLoop } from "./music/arrangement";
import {
  cloneEditableLoop,
  createEditableLoopFromGeneratedLoop,
  createGeneratedLoopFromEditableLoop,
  editableLoopsEqual,
  type EditableLoop,
} from "./music/editor";
import {
  createStoredArrangement,
  loadStoredArrangements,
  saveStoredArrangements,
  type StoredArrangement,
} from "./music/arrangementLibrary";
import { DEFAULT_SEQUENCE_SETTINGS, DEFAULT_SETTINGS, KEY_OPTIONS, normalizeLoopSettings } from "./music/constants";
import { generateLoop } from "./music/generator";
import { downloadArrangementMidi, exportLoopToMidi } from "./midi/exportMidi";
import type { GeneratedLoop, LoopSettings, Mood, SavedLoop, ScaleType } from "./music/types";
import { APP_STORAGE_KEYS } from "./lib/appStorage";
import { getLoopDurationSeconds, playbackEngine } from "./playback/transport";

const MOOD_OPTIONS: Mood[] = ["Balanced", "Dark", "Bright", "Sparse", "Intense", "Calm"];
const SCALE_OPTIONS: ScaleType[] = ["Major", "Minor"];
const AUTOPLAY_STORAGE_KEY = "loop-forge-autoplay";
const VOLUME_STORAGE_KEY = "loop-forge-volume";
const SETTINGS_COOKIE_KEYS = {
  key: "loop-forge-key",
  scale: "loop-forge-scale",
  tempo: "loop-forge-tempo",
  length: "loop-forge-length",
  mood: "loop-forge-mood",
  patternLength: "loop-forge-pattern-length",
  density: "loop-forge-density",
  variation: "loop-forge-variation",
  style: "loop-forge-style",
  groove: "loop-forge-groove",
  register: "loop-forge-register",
} as const;

interface StudioDraftPayload {
  settings?: Partial<LoopSettings>;
  loop?: GeneratedLoop;
  savedLoop?: GeneratedLoop;
  savedLoops?: SavedLoop[];
  arrangementName?: string;
  arrangementUrl?: string;
  editingArrangementId?: string | null;
}

interface StudioDraftState {
  settings: LoopSettings;
  editableLoop: EditableLoop;
  savedEditableLoop: EditableLoop;
  savedLoops: SavedLoop[];
  arrangementName: string;
  arrangementUrl: string;
  editingArrangementId: string | null;
}

function getCookieValue(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const match = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

function setCookieValue(name: string, value: string): void {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax`;
}

function getInitialSettings(): LoopSettings {
  if (typeof document === "undefined") {
    return DEFAULT_SETTINGS;
  }

  const key = getCookieValue(SETTINGS_COOKIE_KEYS.key);
  const scale = getCookieValue(SETTINGS_COOKIE_KEYS.scale);
  const tempo = Number(getCookieValue(SETTINGS_COOKIE_KEYS.tempo));
  const length = Number(getCookieValue(SETTINGS_COOKIE_KEYS.length));
  const mood = getCookieValue(SETTINGS_COOKIE_KEYS.mood);
  const patternLength = Number(getCookieValue(SETTINGS_COOKIE_KEYS.patternLength));
  const density = getCookieValue(SETTINGS_COOKIE_KEYS.density);
  const variation = getCookieValue(SETTINGS_COOKIE_KEYS.variation);
  const style = getCookieValue(SETTINGS_COOKIE_KEYS.style);
  const groove = getCookieValue(SETTINGS_COOKIE_KEYS.groove);
  const register = getCookieValue(SETTINGS_COOKIE_KEYS.register);

  return normalizeLoopSettings({
    key: key && (KEY_OPTIONS as readonly string[]).includes(key) ? key : DEFAULT_SETTINGS.key,
    scale: scale === "Major" || scale === "Minor" ? scale : DEFAULT_SETTINGS.scale,
    tempo: Number.isFinite(tempo) && tempo >= 60 && tempo <= 180 ? tempo : DEFAULT_SETTINGS.tempo,
    length: length === 2 || length === 4 ? length : DEFAULT_SETTINGS.length,
    mood: mood && MOOD_OPTIONS.includes(mood as Mood) ? (mood as Mood) : DEFAULT_SETTINGS.mood,
    layers: DEFAULT_SETTINGS.layers,
    sequence: {
      patternLength: patternLength === 8 || patternLength === 16 ? patternLength : DEFAULT_SEQUENCE_SETTINGS.patternLength,
      density: density === "low" || density === "medium" || density === "high" ? density : DEFAULT_SEQUENCE_SETTINGS.density,
      variation:
        variation === "low" || variation === "medium" || variation === "high"
          ? variation
          : DEFAULT_SEQUENCE_SETTINGS.variation,
      style:
        style === "straight" || style === "syncopated" || style === "flowing" || style === "arp-like" || style === "staccato" || style === "legato" || style === "pulsing"
          ? style
          : DEFAULT_SEQUENCE_SETTINGS.style,
      groove: groove === "straight" || groove === "swing" || groove === "triplet" ? groove : DEFAULT_SEQUENCE_SETTINGS.groove,
      register:
        register === "low" || register === "mid" || register === "high" || register === "wide"
          ? register
          : DEFAULT_SEQUENCE_SETTINGS.register,
    },
  });
}

function isGeneratedLoopDraft(value: unknown): value is GeneratedLoop {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<GeneratedLoop>;
  return Array.isArray(candidate.chords) && Array.isArray(candidate.melody) && Array.isArray(candidate.bass) && typeof candidate.id === "string";
}

function isSavedLoopDraft(value: unknown): value is SavedLoop {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<SavedLoop>;
  return typeof candidate.id === "string" && typeof candidate.name === "string" && isGeneratedLoopDraft(candidate.loop);
}

function loadStudioDraftState(): StudioDraftState {
  const fallbackSettings = getInitialSettings();
  const fallbackLoop = generateLoop(fallbackSettings);

  if (typeof window === "undefined") {
    return {
      settings: fallbackSettings,
      editableLoop: createEditableLoopFromGeneratedLoop(fallbackLoop),
      savedEditableLoop: createEditableLoopFromGeneratedLoop(fallbackLoop),
      savedLoops: [],
      arrangementName: "",
      arrangementUrl: "",
      editingArrangementId: null,
    };
  }

  const json = window.localStorage.getItem(APP_STORAGE_KEYS.studioDraft);

  if (!json) {
    return {
      settings: fallbackSettings,
      editableLoop: createEditableLoopFromGeneratedLoop(fallbackLoop),
      savedEditableLoop: createEditableLoopFromGeneratedLoop(fallbackLoop),
      savedLoops: [],
      arrangementName: "",
      arrangementUrl: "",
      editingArrangementId: null,
    };
  }

  try {
    const parsed = JSON.parse(json) as StudioDraftPayload;
    const loopSettings =
      parsed.loop && isGeneratedLoopDraft(parsed.loop)
        ? parsed.loop.settings
        : parsed.settings;
    const settings = normalizeLoopSettings(loopSettings ?? fallbackSettings);
    const loop = parsed.loop && isGeneratedLoopDraft(parsed.loop) ? normalizeGeneratedLoop(parsed.loop) : generateLoop(settings);
    const savedLoop =
      parsed.savedLoop && isGeneratedLoopDraft(parsed.savedLoop)
        ? normalizeGeneratedLoop(parsed.savedLoop)
        : loop;
    const savedLoops = Array.isArray(parsed.savedLoops)
      ? parsed.savedLoops.flatMap((savedLoop) => (isSavedLoopDraft(savedLoop) ? [normalizeSavedLoop(savedLoop)] : []))
      : [];

    return {
      settings,
      editableLoop: createEditableLoopFromGeneratedLoop(loop),
      savedEditableLoop: createEditableLoopFromGeneratedLoop(savedLoop),
      savedLoops,
      arrangementName: typeof parsed.arrangementName === "string" ? parsed.arrangementName : "",
      arrangementUrl: typeof parsed.arrangementUrl === "string" ? parsed.arrangementUrl : "",
      editingArrangementId: typeof parsed.editingArrangementId === "string" ? parsed.editingArrangementId : null,
    };
  } catch {
    return {
      settings: fallbackSettings,
      editableLoop: createEditableLoopFromGeneratedLoop(fallbackLoop),
      savedEditableLoop: createEditableLoopFromGeneratedLoop(fallbackLoop),
      savedLoops: [],
      arrangementName: "",
      arrangementUrl: "",
      editingArrangementId: null,
    };
  }
}

export default function App() {
  const { setTheme } = useTheme();
  const [initialStudioDraft] = useState<StudioDraftState>(() => loadStudioDraftState());
  const [settings, setSettings] = useState<LoopSettings>(initialStudioDraft.settings);
  const [editableLoop, setEditableLoop] = useState<EditableLoop>(initialStudioDraft.editableLoop);
  const [savedEditableLoop, setSavedEditableLoop] = useState<EditableLoop>(initialStudioDraft.savedEditableLoop);
  const [undoStack, setUndoStack] = useState<EditableLoop[]>([]);
  const [redoStack, setRedoStack] = useState<EditableLoop[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeView, setActiveView] = useState<"studio" | "library" | "lyrics" | "settings">("studio");
  const [autoplay, setAutoplay] = useState(() => {
    if (typeof document === "undefined") {
      return false;
    }

    return getCookieValue(AUTOPLAY_STORAGE_KEY) === "true";
  });
  const [volume, setVolume] = useState(() => {
    if (typeof window === "undefined") {
      return 0.3;
    }

    const stored = Number(window.localStorage.getItem(VOLUME_STORAGE_KEY));
    return Number.isFinite(stored) && stored >= 0 && stored <= 1 ? stored : 0.3;
  });
  const [savedLoops, setSavedLoops] = useState<SavedLoop[]>(initialStudioDraft.savedLoops);
  const [arrangementName, setArrangementName] = useState(initialStudioDraft.arrangementName);
  const [arrangementUrl, setArrangementUrl] = useState(initialStudioDraft.arrangementUrl);
  const [editingArrangementId, setEditingArrangementId] = useState<string | null>(initialStudioDraft.editingArrangementId);
  const [storedArrangements, setStoredArrangements] = useState<StoredArrangement[]>(() => loadStoredArrangements());
  const [isExportingWav, setIsExportingWav] = useState(false);
  const [wavExportStatus, setWavExportStatus] = useState<string | null>(null);
  const [hasWavExportError, setHasWavExportError] = useState(false);
  const playbackTimeoutRef = useRef<number | null>(null);
  const currentLoop = useMemo(() => {
    if (!editableLoop) {
      return null;
    }

    return createGeneratedLoopFromEditableLoop(editableLoop, settings.tempo);
  }, [editableLoop, settings.tempo]);

  const canGenerate = useMemo(
    () => settings.layers.chords || settings.layers.melody || settings.layers.bass,
    [settings.layers],
  );
  const topBarStatus = useMemo(() => {
    const key = currentLoop?.settings.key ?? settings.key;
    const scale = currentLoop?.settings.scale ?? settings.scale;
    const tempo = settings.tempo;

    return `${key} ${scale} • ${tempo} BPM`;
  }, [currentLoop, settings.key, settings.scale, settings.tempo]);

  useEffect(() => {
    playbackEngine.setTempo(settings.tempo);
  }, [settings.tempo]);

  useEffect(() => {
    playbackEngine.setVolume(volume);
    window.localStorage.setItem(VOLUME_STORAGE_KEY, String(volume));
  }, [volume]);

  useEffect(() => {
    setCookieValue(AUTOPLAY_STORAGE_KEY, String(autoplay));
  }, [autoplay]);

  useEffect(() => {
    setCookieValue(SETTINGS_COOKIE_KEYS.key, settings.key);
    setCookieValue(SETTINGS_COOKIE_KEYS.scale, settings.scale);
    setCookieValue(SETTINGS_COOKIE_KEYS.tempo, String(settings.tempo));
    setCookieValue(SETTINGS_COOKIE_KEYS.length, String(settings.length));
    setCookieValue(SETTINGS_COOKIE_KEYS.mood, settings.mood);
    setCookieValue(SETTINGS_COOKIE_KEYS.patternLength, String(settings.sequence.patternLength));
    setCookieValue(SETTINGS_COOKIE_KEYS.density, settings.sequence.density);
    setCookieValue(SETTINGS_COOKIE_KEYS.variation, settings.sequence.variation);
    setCookieValue(SETTINGS_COOKIE_KEYS.style, settings.sequence.style);
    setCookieValue(SETTINGS_COOKIE_KEYS.groove, settings.sequence.groove);
    setCookieValue(SETTINGS_COOKIE_KEYS.register, settings.sequence.register);
  }, [
    settings.key,
    settings.scale,
    settings.tempo,
    settings.length,
    settings.mood,
    settings.sequence.patternLength,
    settings.sequence.density,
    settings.sequence.variation,
    settings.sequence.style,
    settings.sequence.groove,
    settings.sequence.register,
  ]);

  useEffect(() => {
    saveStoredArrangements(storedArrangements);
  }, [storedArrangements]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const draft: StudioDraftPayload = {
      settings,
      loop: currentLoop ? cloneGeneratedLoop(currentLoop) : undefined,
      savedLoop: cloneGeneratedLoop(createGeneratedLoopFromEditableLoop(savedEditableLoop, settings.tempo)),
      savedLoops: cloneSavedLoops(savedLoops),
      arrangementName,
      arrangementUrl,
      editingArrangementId,
    };

    window.localStorage.setItem(APP_STORAGE_KEYS.studioDraft, JSON.stringify(draft));
  }, [arrangementName, arrangementUrl, currentLoop, editingArrangementId, savedEditableLoop, savedLoops, settings]);

  const clearPlaybackTimeout = () => {
    if (typeof window === "undefined" || playbackTimeoutRef.current === null) {
      return;
    }

    window.clearTimeout(playbackTimeoutRef.current);
    playbackTimeoutRef.current = null;
  };

  const startOneShotPlayback = async (loopToPlay: GeneratedLoop) => {
    clearPlaybackTimeout();
    await playbackEngine.playLoopOnce(loopToPlay);
    setIsPlaying(true);

    if (typeof window === "undefined") {
      return;
    }

    playbackTimeoutRef.current = window.setTimeout(() => {
      playbackTimeoutRef.current = null;
      setIsPlaying(false);
    }, Math.ceil(getLoopDurationSeconds(loopToPlay) * 1000) + 120);
  };

  useEffect(() => {
    return () => {
      clearPlaybackTimeout();
      playbackEngine.dispose();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = async (event: KeyboardEvent) => {
      if (event.code !== "Space") {
        return;
      }

      const target = event.target as HTMLElement | null;

      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable
      ) {
        return;
      }

      event.preventDefault();

      if (isPlaying) {
        clearPlaybackTimeout();
        playbackEngine.stop();
        setIsPlaying(false);
        return;
      }

      if (activeView !== "studio" || !currentLoop) {
        return;
      }

      await playbackEngine.play(currentLoop);
      setIsPlaying(true);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeView, currentLoop, isPlaying]);

  const updateSettings = <K extends keyof LoopSettings>(key: K, value: LoopSettings[K]) => {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const applyEditableLoopChange = (nextLoop: EditableLoop) => {
    setEditableLoop((current) => {
      if (editableLoopsEqual(current, nextLoop)) {
        return current;
      }

      setUndoStack((currentUndo) => [...currentUndo, cloneEditableLoop(current)]);
      setRedoStack([]);
      return cloneEditableLoop(nextLoop);
    });
  };

  const handleGenerate = async () => {
    const nextLoop = generateLoop(settings);
    const nextEditableLoop = createEditableLoopFromGeneratedLoop(nextLoop);
    clearPlaybackTimeout();
    playbackEngine.stop();
    setEditableLoop(nextEditableLoop);
    setSavedEditableLoop(cloneEditableLoop(nextEditableLoop));
    setUndoStack([]);
    setRedoStack([]);
    setIsPlaying(false);

    if (autoplay) {
      await playbackEngine.play(nextLoop);
      setIsPlaying(true);
    }
  };

  const handlePlay = async () => {
    if (!currentLoop) {
      return;
    }

    clearPlaybackTimeout();
    await playbackEngine.play(currentLoop);
    setIsPlaying(true);
  };

  const handleStop = () => {
    clearPlaybackTimeout();
    playbackEngine.stop();
    setIsPlaying(false);
  };

  const handlePlayArrangement = async () => {
    if (savedLoops.length === 0) {
      return;
    }

    clearPlaybackTimeout();
    setIsPlaying(false);
    await playbackEngine.playArrangement(savedLoops);
  };

  const handlePreviewSavedLoop = async (savedLoop: SavedLoop) => {
    await startOneShotPlayback(savedLoop.loop);
  };

  const handlePreviewLibraryLoop = async (storedLoop: StoredArrangement["loops"][number]) => {
    await startOneShotPlayback(storedLoop.loop);
  };

  const handleExport = () => {
    if (!currentLoop) {
      return;
    }

    exportLoopToMidi(currentLoop);
  };

  const handleExportWav = async () => {
    if (!currentLoop || isExportingWav) {
      return;
    }

    setIsExportingWav(true);
    setHasWavExportError(false);
    setWavExportStatus("Exporting WAV...");

    try {
      const renderedBuffer = await renderCurrentLoopToAudioBuffer(currentLoop, volume);
      const wavBlob = audioBufferToWavBlob(renderedBuffer);

      downloadBlob(wavBlob, createLoopWavFilename(currentLoop));
      setWavExportStatus("WAV exported successfully.");
    } catch (error) {
      console.error(error);
      setHasWavExportError(true);
      setWavExportStatus("WAV export failed. Please try again.");
    } finally {
      setIsExportingWav(false);
    }
  };

  const handleSaveLoop = () => {
    if (!currentLoop) {
      return;
    }

    const defaultName = getDefaultLoopName(savedLoops);
    const providedName = window.prompt("Loop name", defaultName)?.trim() ?? "";
    const name = providedName.length > 0 ? providedName : defaultName;

    setSavedLoops((current) => [...current, createSavedLoop(currentLoop, name)]);
  };

  const handleRenameSavedLoop = (id: string, name: string) => {
    setSavedLoops((current) =>
      current.map((savedLoop) =>
        savedLoop.id === id
          ? {
              ...savedLoop,
              name,
            }
          : savedLoop,
      ),
    );
  };

  const handleReorderSavedLoops = (sourceId: string, targetId: string) => {
    setSavedLoops((current) => {
      const sourceIndex = current.findIndex((savedLoop) => savedLoop.id === sourceId);
      const targetIndex = current.findIndex((savedLoop) => savedLoop.id === targetId);

      if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) {
        return current;
      }

      const next = [...current];
      const [movedLoop] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, movedLoop);
      return next;
    });
  };

  const handleRemoveSavedLoop = (id: string) => {
    setSavedLoops((current) => current.filter((savedLoop) => savedLoop.id !== id));
  };

  const handleClearSavedLoops = () => {
    setSavedLoops([]);
  };

  const handleSaveArrangement = () => {
    if (savedLoops.length === 0 || arrangementName.trim().length === 0) {
      return;
    }

    if (editingArrangementId) {
      setStoredArrangements((current) =>
        current.map((arrangement) =>
          arrangement.id === editingArrangementId
            ? {
                ...arrangement,
                name: arrangementName.trim(),
                url: arrangementUrl.trim(),
                tempo: savedLoops[0]?.loop.settings.tempo ?? arrangement.tempo,
                loops: savedLoops.map((savedLoop) => ({
                  id: savedLoop.id,
                  name: savedLoop.name,
                  seconds: savedLoop.seconds,
                  loop: cloneGeneratedLoop(savedLoop.loop),
                })),
              }
            : arrangement,
        ),
      );
    } else {
      const arrangement = createStoredArrangement(arrangementName.trim(), arrangementUrl.trim(), savedLoops);
      setStoredArrangements((current) => [arrangement, ...current]);
    }

    setEditingArrangementId(null);
    setArrangementName("");
    setArrangementUrl("");
    setActiveView("library");
  };

  const handleArrangementLyricsChange = (arrangementId: string, lyrics: { text1?: string; text2?: string }) => {
    setStoredArrangements((current) =>
      current.map((arrangement) =>
        arrangement.id === arrangementId
          ? {
              ...arrangement,
              text1: lyrics.text1 ?? arrangement.text1,
              text2: lyrics.text2 ?? arrangement.text2,
            }
          : arrangement,
      ),
    );
  };

  const handleStorageChanged = () => {
    setStoredArrangements(loadStoredArrangements());
    const studioDraft = loadStudioDraftState();
    setSettings(studioDraft.settings);
    setEditableLoop(studioDraft.editableLoop);
    setSavedEditableLoop(studioDraft.savedEditableLoop);
    setUndoStack([]);
    setRedoStack([]);
    setSavedLoops(studioDraft.savedLoops);
    setArrangementName(studioDraft.arrangementName);
    setArrangementUrl(studioDraft.arrangementUrl);
    setEditingArrangementId(typeof studioDraft.editingArrangementId === "string" ? studioDraft.editingArrangementId : null);

    if (typeof window !== "undefined") {
      const storedVolume = Number(window.localStorage.getItem(APP_STORAGE_KEYS.volume));
      setVolume(Number.isFinite(storedVolume) && storedVolume >= 0 && storedVolume <= 1 ? storedVolume : 0.3);

      const storedTheme = window.localStorage.getItem(APP_STORAGE_KEYS.theme);
      setTheme(storedTheme === "light" || storedTheme === "dark" || storedTheme === "system" ? storedTheme : "dark");
    }
  };

  const handleExportArrangement = async (arrangement: StoredArrangement, format: ExportFormat) => {
    const loops: SavedLoop[] = arrangement.loops.map((loop) => ({
      id: loop.id,
      name: loop.name,
      seconds: loop.seconds,
      loop: loop.loop,
    }));

    if (format === "midi") {
      downloadArrangementMidi(loops, arrangement.name);
      return;
    }

    const renderedBuffer = await renderArrangementToAudioBuffer(loops, volume);
    const wavBlob = audioBufferToWavBlob(renderedBuffer);

    downloadBlob(wavBlob, createArrangementWavFilename(arrangement.name, loops));
  };

  const handleEditArrangement = (arrangement: StoredArrangement) => {
    setSavedLoops(
      arrangement.loops.map((loop) => ({
        id: loop.id,
        name: loop.name,
        seconds: loop.seconds,
        loop: cloneGeneratedLoop(loop.loop),
      })),
    );
    setArrangementName(arrangement.name);
    setArrangementUrl(arrangement.url);
    setEditingArrangementId(arrangement.id);
    setActiveView("studio");
  };

  const handleCurrentLoopUndo = () => {
    setUndoStack((currentUndo) => {
      const previous = currentUndo[currentUndo.length - 1];

      if (!previous) {
        return currentUndo;
      }

      setRedoStack((currentRedo) => [cloneEditableLoop(editableLoop), ...currentRedo]);
      setEditableLoop(cloneEditableLoop(previous));
      return currentUndo.slice(0, -1);
    });
  };

  const handleCurrentLoopRedo = () => {
    setRedoStack((currentRedo) => {
      const [next, ...rest] = currentRedo;

      if (!next) {
        return currentRedo;
      }

      setUndoStack((currentUndo) => [...currentUndo, cloneEditableLoop(editableLoop)]);
      setEditableLoop(cloneEditableLoop(next));
      return rest;
    });
  };

  const handleCurrentLoopReset = () => {
    if (editableLoopsEqual(editableLoop, savedEditableLoop)) {
      return;
    }

    setEditableLoop(cloneEditableLoop(savedEditableLoop));
    setUndoStack([]);
    setRedoStack([]);
  };

  const handleCurrentLoopSave = () => {
    setSavedEditableLoop(cloneEditableLoop(editableLoop));
    setUndoStack([]);
    setRedoStack([]);
  };

  const handleCurrentLoopChange = (nextLoop: EditableLoop) => {
    applyEditableLoopChange(nextLoop);
  };

  const handleDeleteArrangement = (arrangement: StoredArrangement) => {
    setStoredArrangements((current) => current.filter((item) => item.id !== arrangement.id));

    if (editingArrangementId === arrangement.id) {
      setEditingArrangementId(null);
      setArrangementName("");
      setArrangementUrl("");
      setSavedLoops([]);
    }
  };

  return (
    <AppShell
      topBar={
        <TopBar
          status={topBarStatus}
          volume={volume}
          activeView={activeView}
          onVolumeChange={setVolume}
          onViewChange={setActiveView}
        />
      }
      content={
        activeView === "library" ? (
          <ArrangementLibraryView
            arrangements={storedArrangements}
            onExportArrangement={handleExportArrangement}
            onPlayLoop={handlePreviewLibraryLoop}
            onEdit={handleEditArrangement}
            onDelete={handleDeleteArrangement}
          />
        ) : activeView === "lyrics" ? (
          <LyricsWorkspace arrangements={storedArrangements} onArrangementLyricsChange={handleArrangementLyricsChange} />
        ) : activeView === "settings" ? (
          <SettingsWorkspace arrangements={storedArrangements} onStorageChanged={handleStorageChanged} />
        ) : undefined
      }
      leftSidebar={
        activeView === "studio" ? (
          <LeftSidebar
            settings={settings}
            loop={currentLoop}
            keyOptions={KEY_OPTIONS}
            scaleOptions={SCALE_OPTIONS}
            moodOptions={MOOD_OPTIONS}
            canGenerate={canGenerate}
            hasCurrentLoop={Boolean(currentLoop)}
            isPlaying={isPlaying}
            autoplay={autoplay}
            onUpdateSetting={updateSettings}
            onUpdateLayers={(layers) => updateSettings("layers", layers)}
            onAutoplayChange={setAutoplay}
            onGenerate={handleGenerate}
            onSaveLoop={handleSaveLoop}
            onPlay={handlePlay}
            onStop={handleStop}
            onExportMidi={handleExport}
            onExportWav={handleExportWav}
            isExportingWav={isExportingWav}
            wavExportStatus={wavExportStatus}
            wavExportError={hasWavExportError}
          />
        ) : null
      }
      mainWorkspace={
        activeView === "studio" ? (
          <MainWorkspace
            loop={currentLoop}
            editableLoop={editableLoop}
            onLoopChange={handleCurrentLoopChange}
            onUndo={handleCurrentLoopUndo}
            onRedo={handleCurrentLoopRedo}
            onReset={handleCurrentLoopReset}
            onSave={handleCurrentLoopSave}
            canUndo={undoStack.length > 0}
            canRedo={redoStack.length > 0}
            hasUnsavedChanges={!editableLoopsEqual(editableLoop, savedEditableLoop)}
          />
        ) : null
      }
      rightSidebar={
        activeView === "studio" ? (
          <RightSidebar
            savedLoops={savedLoops}
            arrangementName={arrangementName}
            arrangementUrl={arrangementUrl}
            isEditingArrangement={editingArrangementId !== null}
            onRename={handleRenameSavedLoop}
            onReorder={handleReorderSavedLoops}
            onRemove={handleRemoveSavedLoop}
            onClearAll={handleClearSavedLoops}
            onPlayLoop={handlePreviewSavedLoop}
            onArrangementNameChange={setArrangementName}
            onArrangementUrlChange={setArrangementUrl}
            onPlayArrangement={handlePlayArrangement}
            onStopArrangement={handleStop}
            onSaveArrangement={handleSaveArrangement}
          />
        ) : null
      }
    />
  );
}
