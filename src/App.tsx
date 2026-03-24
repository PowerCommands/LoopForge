import { useEffect, useMemo, useState } from "react";
import { ArrangementPanel } from "./components/ArrangementPanel";
import { ControlField } from "./components/ControlField";
import { LayerToggleGroup } from "./components/LayerToggleGroup";
import { LoopSummary } from "./components/LoopSummary";
import { createSavedLoop, getDefaultLoopName, moveSavedLoop } from "./music/arrangement";
import { DEFAULT_SETTINGS, KEY_OPTIONS } from "./music/constants";
import { generateLoop } from "./music/generator";
import { exportArrangementToMidi, exportLoopToMidi } from "./midi/exportMidi";
import type { LoopSettings, Mood, SavedLoop, ScaleType } from "./music/types";
import { playbackEngine } from "./playback/transport";

const MOOD_OPTIONS: Mood[] = ["Balanced", "Dark", "Bright", "Sparse", "Intense", "Calm"];
const SCALE_OPTIONS: ScaleType[] = ["Major", "Minor"];

export default function App() {
  const [settings, setSettings] = useState<LoopSettings>(DEFAULT_SETTINGS);
  const [loop, setLoop] = useState(() => generateLoop(DEFAULT_SETTINGS));
  const [isPlaying, setIsPlaying] = useState(false);
  const [savedLoops, setSavedLoops] = useState<SavedLoop[]>([]);
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

  useEffect(() => {
    playbackEngine.setTempo(settings.tempo);
  }, [settings.tempo]);

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

  const handleGenerate = () => {
    const nextLoop = generateLoop(settings);
    setLoop(nextLoop);
    setIsPlaying(false);
    playbackEngine.stop();
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

  return (
    <main className="app-shell">
      <div className="workspace">
        <section className="workspace__main">
          <section className="hero">
            <div>
              <p className="eyebrow">Loop Forge</p>
              <h1>Small loop ideas for fast music sketching</h1>
              <p className="hero-copy">
                Generate one short harmonic idea, audition it, save the good ones, and assemble a simple song sketch.
              </p>
            </div>
          </section>

          <section className="panel grid">
            <ControlField label="Key" htmlFor="key">
              <select
                id="key"
                value={settings.key}
                onChange={(event) => updateSettings("key", event.target.value)}
              >
                {KEY_OPTIONS.map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </select>
            </ControlField>

            <ControlField label="Scale" htmlFor="scale">
              <select
                id="scale"
                value={settings.scale}
                onChange={(event) => updateSettings("scale", event.target.value as ScaleType)}
              >
                {SCALE_OPTIONS.map((scale) => (
                  <option key={scale} value={scale}>
                    {scale}
                  </option>
                ))}
              </select>
            </ControlField>

            <ControlField label="Tempo" htmlFor="tempo" hint="Recommended range: 80 to 160 BPM">
              <input
                id="tempo"
                type="number"
                min={60}
                max={180}
                value={settings.tempo}
                onChange={(event) => updateSettings("tempo", Number(event.target.value))}
              />
            </ControlField>

            <ControlField label="Length" htmlFor="length">
              <select
                id="length"
                value={settings.length}
                onChange={(event) => updateSettings("length", Number(event.target.value) as 2 | 4)}
              >
                <option value={2}>2 bars</option>
                <option value={4}>4 bars</option>
              </select>
            </ControlField>

            <ControlField label="Mood" htmlFor="mood">
              <select
                id="mood"
                value={settings.mood}
                onChange={(event) => updateSettings("mood", event.target.value as Mood)}
              >
                {MOOD_OPTIONS.map((mood) => (
                  <option key={mood} value={mood}>
                    {mood}
                  </option>
                ))}
              </select>
            </ControlField>

            <ControlField label="Layers" hint="At least one layer must be enabled">
              <LayerToggleGroup
                value={settings.layers}
                onChange={(layers) => updateSettings("layers", layers)}
              />
            </ControlField>
          </section>

          <section className="actions">
            <button type="button" onClick={handleGenerate} disabled={!canGenerate}>
              Generate
            </button>
            <button type="button" className="secondary" onClick={handleSaveLoop} disabled={!currentLoop}>
              Save Loop
            </button>
            <button type="button" onClick={handlePlay} disabled={!currentLoop}>
              {isPlaying ? "Restart" : "Play"}
            </button>
            <button type="button" className="secondary" onClick={handleStop}>
              Stop
            </button>
            <button type="button" className="secondary" onClick={handleExport} disabled={!currentLoop}>
              Export MIDI
            </button>
          </section>

          <LoopSummary loop={currentLoop} />
        </section>

        <ArrangementPanel
          savedLoops={savedLoops}
          onRename={handleRenameSavedLoop}
          onMoveUp={(id) => handleMoveSavedLoop(id, -1)}
          onMoveDown={(id) => handleMoveSavedLoop(id, 1)}
          onRemove={handleRemoveSavedLoop}
          onExportArrangement={() => exportArrangementToMidi(savedLoops)}
        />
      </div>
    </main>
  );
}
