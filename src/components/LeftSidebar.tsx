import { ControlField } from "./ControlField";
import { LayerToggleGroup } from "./LayerToggleGroup";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Select } from "./ui/select";
import {
  SEQUENCE_DENSITY_OPTIONS,
  SEQUENCE_PATTERN_LENGTH_OPTIONS,
  SEQUENCE_STYLE_OPTIONS,
  SEQUENCE_VARIATION_OPTIONS,
} from "../music/constants";
import type { LoopSettings, Mood, ScaleType, LayerToggles } from "../music/types";

interface LeftSidebarProps {
  settings: LoopSettings;
  keyOptions: readonly string[];
  scaleOptions: readonly ScaleType[];
  moodOptions: readonly Mood[];
  canGenerate: boolean;
  hasCurrentLoop: boolean;
  isPlaying: boolean;
  autoplay: boolean;
  onUpdateSetting: <K extends keyof LoopSettings>(key: K, value: LoopSettings[K]) => void;
  onUpdateLayers: (layers: LayerToggles) => void;
  onAutoplayChange: (autoplay: boolean) => void;
  onGenerate: () => void;
  onSaveLoop: () => void;
  onPlay: () => void;
  onStop: () => void;
  onExportMidi: () => void;
}

export function LeftSidebar({
  settings,
  keyOptions,
  scaleOptions,
  moodOptions,
  canGenerate,
  hasCurrentLoop,
  isPlaying,
  autoplay,
  onUpdateSetting,
  onUpdateLayers,
  onAutoplayChange,
  onGenerate,
  onSaveLoop,
  onPlay,
  onStop,
  onExportMidi,
}: LeftSidebarProps) {
  const iconClassName = "h-4 w-4";

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1.8fr)_minmax(280px,1fr)]">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Generator Settings</CardTitle>
            <CardDescription>Shape a quick harmonic idea before generating a new loop.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <ControlField label="Key" htmlFor="key">
                <Select id="key" value={settings.key} onChange={(event) => onUpdateSetting("key", event.target.value)}>
                  {keyOptions.map((key) => (
                    <option key={key} value={key}>
                      {key}
                    </option>
                  ))}
                </Select>
              </ControlField>

              <ControlField label="Scale" htmlFor="scale">
                <Select
                  id="scale"
                  value={settings.scale}
                  onChange={(event) => onUpdateSetting("scale", event.target.value as ScaleType)}
                >
                  {scaleOptions.map((scale) => (
                    <option key={scale} value={scale}>
                      {scale}
                    </option>
                  ))}
                </Select>
              </ControlField>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <ControlField label="Tempo" htmlFor="tempo" hint="Recommended range: 80 to 160 BPM">
                <Input
                  id="tempo"
                  type="number"
                  min={60}
                  max={180}
                  value={settings.tempo}
                  onChange={(event) => onUpdateSetting("tempo", Number(event.target.value))}
                />
              </ControlField>

              <ControlField label="Length" htmlFor="length">
                <Select
                  id="length"
                  value={settings.length}
                  onChange={(event) => onUpdateSetting("length", Number(event.target.value) as 2 | 4)}
                >
                  <option value={2}>2 bars</option>
                  <option value={4}>4 bars</option>
                </Select>
              </ControlField>
            </div>

            <ControlField label="Mood" htmlFor="mood">
              <Select
                id="mood"
                value={settings.mood}
                onChange={(event) => onUpdateSetting("mood", event.target.value as Mood)}
              >
                {moodOptions.map((mood) => (
                  <option key={mood} value={mood}>
                    {mood}
                  </option>
                ))}
              </Select>
            </ControlField>

            <div className="rounded-lg border border-border bg-white/45 p-3 dark:bg-white/5">
              <div className="mb-3">
                <p className="m-0 text-sm font-semibold text-foreground">Bass / Melody Sequence</p>
                <p className="m-0 mt-1 text-xs text-muted-foreground">
                  Shape the internal rhythm engine for the generated bass and melody layers.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <ControlField label="Pattern Length" htmlFor="pattern-length">
                  <Select
                    id="pattern-length"
                    value={settings.sequence.patternLength}
                    onChange={(event) =>
                      onUpdateSetting("sequence", {
                        ...settings.sequence,
                        patternLength: Number(event.target.value) as 8 | 16,
                      })
                    }
                  >
                    {SEQUENCE_PATTERN_LENGTH_OPTIONS.map((length) => (
                      <option key={length} value={length}>
                        {length} steps
                      </option>
                    ))}
                  </Select>
                </ControlField>

                <ControlField label="Style" htmlFor="sequence-style">
                  <Select
                    id="sequence-style"
                    value={settings.sequence.style}
                    onChange={(event) =>
                      onUpdateSetting("sequence", {
                        ...settings.sequence,
                        style: event.target.value as LoopSettings["sequence"]["style"],
                      })
                    }
                  >
                    {SEQUENCE_STYLE_OPTIONS.map((style) => (
                      <option key={style} value={style}>
                        {style}
                      </option>
                    ))}
                  </Select>
                </ControlField>

                <ControlField label="Density" htmlFor="sequence-density">
                  <Select
                    id="sequence-density"
                    value={settings.sequence.density}
                    onChange={(event) =>
                      onUpdateSetting("sequence", {
                        ...settings.sequence,
                        density: event.target.value as LoopSettings["sequence"]["density"],
                      })
                    }
                  >
                    {SEQUENCE_DENSITY_OPTIONS.map((density) => (
                      <option key={density} value={density}>
                        {density}
                      </option>
                    ))}
                  </Select>
                </ControlField>

                <ControlField label="Variation" htmlFor="sequence-variation">
                  <Select
                    id="sequence-variation"
                    value={settings.sequence.variation}
                    onChange={(event) =>
                      onUpdateSetting("sequence", {
                        ...settings.sequence,
                        variation: event.target.value as LoopSettings["sequence"]["variation"],
                      })
                    }
                  >
                    {SEQUENCE_VARIATION_OPTIONS.map((variation) => (
                      <option key={variation} value={variation}>
                        {variation}
                      </option>
                    ))}
                  </Select>
                </ControlField>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Layers</CardTitle>
            <CardDescription>Enable the musical parts you want the next loop to generate.</CardDescription>
          </CardHeader>
          <CardContent>
            <ControlField label="Active Layers" hint="At least one layer must be enabled">
              <LayerToggleGroup value={settings.layers} onChange={onUpdateLayers} />
            </ControlField>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Actions</CardTitle>
          <CardDescription>Use the existing transport and export actions while the workflow evolves.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-nowrap items-center gap-3 overflow-x-auto">
            <Button type="button" onClick={onGenerate} disabled={!canGenerate} className="shrink-0 px-3" title="Generate">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClassName} aria-hidden="true">
                <rect x="5" y="5" width="14" height="14" rx="2.5" />
                <circle cx="9" cy="9" r="1" fill="currentColor" stroke="none" />
                <circle cx="15" cy="9" r="1" fill="currentColor" stroke="none" />
                <circle cx="9" cy="15" r="1" fill="currentColor" stroke="none" />
                <circle cx="15" cy="15" r="1" fill="currentColor" stroke="none" />
              </svg>
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onSaveLoop}
              disabled={!hasCurrentLoop}
              className="shrink-0 px-3"
              title="Add to Library"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClassName} aria-hidden="true">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
            </Button>
            <Button
              type="button"
              onClick={onPlay}
              disabled={!hasCurrentLoop}
              className="shrink-0 px-3"
              title={isPlaying ? "Restart" : "Play"}
            >
              {isPlaying ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClassName} aria-hidden="true">
                  <path d="M3 12a9 9 0 1 0 3-6.7" />
                  <path d="M3 3v6h6" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" className={iconClassName} aria-hidden="true">
                  <path d="M8 5.14v13.72a1 1 0 0 0 1.52.86l10.29-6.86a1 1 0 0 0 0-1.66L9.52 4.28A1 1 0 0 0 8 5.14Z" />
                </svg>
              )}
            </Button>
            <Button type="button" variant="secondary" onClick={onStop} className="shrink-0 px-3" title="Stop">
              <svg viewBox="0 0 24 24" fill="currentColor" className={iconClassName} aria-hidden="true">
                <rect x="6" y="6" width="12" height="12" rx="1.5" />
              </svg>
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onExportMidi}
              disabled={!hasCurrentLoop}
              className="shrink-0 px-3"
              title="Export MIDI"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClassName} aria-hidden="true">
                <path d="M12 3v12" />
                <path d="m7 10 5 5 5-5" />
                <path d="M5 19h14" />
              </svg>
            </Button>
            <label className="ml-2 inline-flex shrink-0 items-center gap-2 rounded-md border border-border bg-white/55 px-3 py-2 text-sm text-foreground dark:bg-white/5">
              <input
                type="checkbox"
                checked={autoplay}
                onChange={(event) => onAutoplayChange(event.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              <span className="font-medium">Autoplay</span>
            </label>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
