import { useEffect, useMemo, useState } from "react";
import { ArrangementLibraryView } from "./components/ArrangementLibraryView";
import { AppShell } from "./components/AppShell";
import { LeftSidebar } from "./components/LeftSidebar";
import { LyricsWorkspace } from "./components/LyricsWorkspace";
import { MainWorkspace } from "./components/MainWorkspace";
import { RightSidebar } from "./components/RightSidebar";
import { TopBar } from "./components/TopBar";
import { createSavedLoop, getDefaultLoopName, moveSavedLoop } from "./music/arrangement";
import {
  createStoredArrangement,
  loadStoredArrangements,
  saveStoredArrangements,
  type StoredArrangement,
} from "./music/arrangementLibrary";
import { DEFAULT_SETTINGS, KEY_OPTIONS } from "./music/constants";
import { generateLoop } from "./music/generator";
import { downloadArrangementMidi, exportLoopToMidi } from "./midi/exportMidi";
import type { LoopSettings, Mood, SavedLoop, ScaleType } from "./music/types";
import { playbackEngine } from "./playback/transport";

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
} as const;

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

  return {
    ...DEFAULT_SETTINGS,
    key: key && (KEY_OPTIONS as readonly string[]).includes(key) ? key : DEFAULT_SETTINGS.key,
    scale: scale === "Major" || scale === "Minor" ? scale : DEFAULT_SETTINGS.scale,
    tempo: Number.isFinite(tempo) && tempo >= 60 && tempo <= 180 ? tempo : DEFAULT_SETTINGS.tempo,
    length: length === 2 || length === 4 ? length : DEFAULT_SETTINGS.length,
    mood: mood && MOOD_OPTIONS.includes(mood as Mood) ? (mood as Mood) : DEFAULT_SETTINGS.mood,
  };
}

export default function App() {
  const [settings, setSettings] = useState<LoopSettings>(() => getInitialSettings());
  const [loop, setLoop] = useState(() => generateLoop(getInitialSettings()));
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeView, setActiveView] = useState<"studio" | "library" | "lyrics">("studio");
  const [autoplay, setAutoplay] = useState(() => {
    if (typeof document === "undefined") {
      return false;
    }

    return getCookieValue(AUTOPLAY_STORAGE_KEY) === "true";
  });
  const [volume, setVolume] = useState(() => {
    if (typeof window === "undefined") {
      return 0.7;
    }

    const stored = Number(window.localStorage.getItem(VOLUME_STORAGE_KEY));
    return Number.isFinite(stored) && stored >= 0 && stored <= 1 ? stored : 0.7;
  });
  const [savedLoops, setSavedLoops] = useState<SavedLoop[]>([]);
  const [arrangementName, setArrangementName] = useState("");
  const [storedArrangements, setStoredArrangements] = useState<StoredArrangement[]>(() => loadStoredArrangements());
  const currentLoop = useMemo(() => {
    if (!loop) {
      return null;
    }

    return {
      ...loop,
      settings: {
        ...loop.settings,
        tempo: settings.tempo,
      },
    };
  }, [loop, settings.tempo]);

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
  }, [settings.key, settings.scale, settings.tempo, settings.length, settings.mood]);

  useEffect(() => {
    saveStoredArrangements(storedArrangements);
  }, [storedArrangements]);

  useEffect(() => {
    return () => {
      playbackEngine.dispose();
    };
  }, []);

  const updateSettings = <K extends keyof LoopSettings>(key: K, value: LoopSettings[K]) => {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleGenerate = async () => {
    const nextLoop = generateLoop(settings);
    playbackEngine.stop();
    setLoop(nextLoop);
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

    await playbackEngine.play(currentLoop);
    setIsPlaying(true);
  };

  const handleStop = () => {
    playbackEngine.stop();
    setIsPlaying(false);
  };

  const handlePlayArrangement = async () => {
    if (savedLoops.length === 0) {
      return;
    }

    setIsPlaying(false);
    await playbackEngine.playArrangement(savedLoops);
  };

  const handleExport = () => {
    if (!currentLoop) {
      return;
    }

    exportLoopToMidi(currentLoop);
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

  const handleMoveSavedLoop = (id: string, direction: -1 | 1) => {
    setSavedLoops((current) => {
      const index = current.findIndex((savedLoop) => savedLoop.id === id);

      if (index === -1) {
        return current;
      }

      return moveSavedLoop(current, index, direction);
    });
  };

  const handleRemoveSavedLoop = (id: string) => {
    setSavedLoops((current) => current.filter((savedLoop) => savedLoop.id !== id));
  };

  const handleSaveArrangement = () => {
    if (savedLoops.length === 0 || arrangementName.trim().length === 0) {
      return;
    }

    const arrangement = createStoredArrangement(arrangementName.trim(), savedLoops);

    setStoredArrangements((current) => [arrangement, ...current]);
    setArrangementName("");
    setActiveView("library");
  };

  const handleDownloadArrangementMidi = (arrangement: StoredArrangement) => {
    const loops: SavedLoop[] = arrangement.loops.map((loop) => ({
      id: loop.id,
      name: loop.name,
      loop: loop.loop,
    }));

    downloadArrangementMidi(loops, arrangement.name);
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
          <ArrangementLibraryView arrangements={storedArrangements} onDownloadMidi={handleDownloadArrangementMidi} />
        ) : activeView === "lyrics" ? (
          <LyricsWorkspace arrangements={storedArrangements} />
        ) : undefined
      }
      leftSidebar={
        activeView === "studio" ? (
          <LeftSidebar
            settings={settings}
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
          />
        ) : null
      }
      mainWorkspace={activeView === "studio" ? <MainWorkspace loop={currentLoop} /> : null}
      rightSidebar={
        activeView === "studio" ? (
          <RightSidebar
            savedLoops={savedLoops}
            arrangementName={arrangementName}
            onRename={handleRenameSavedLoop}
            onMoveUp={(id) => handleMoveSavedLoop(id, -1)}
            onMoveDown={(id) => handleMoveSavedLoop(id, 1)}
            onRemove={handleRemoveSavedLoop}
            onArrangementNameChange={setArrangementName}
            onPlayArrangement={handlePlayArrangement}
            onStopArrangement={handleStop}
            onSaveArrangement={handleSaveArrangement}
          />
        ) : null
      }
    />
  );
}
