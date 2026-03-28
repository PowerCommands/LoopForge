import type { LayerName, LayerToggles } from "../music/types";

interface LayerToggleGroupProps {
  value: LayerToggles;
  onChange: (next: LayerToggles) => void;
  onRerollLayer: (layer: LayerName) => void;
  canReroll: boolean;
}

const LAYER_OPTIONS: LayerName[] = ["chords", "melody", "bass", "drums"];

export function LayerToggleGroup({ value, onChange, onRerollLayer, canReroll }: LayerToggleGroupProps) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {LAYER_OPTIONS.map((layer) => (
        <div className="flex flex-col gap-2" key={layer}>
          <label className="inline-flex items-center gap-2 rounded-md border border-border bg-white/70 px-3 py-2 text-sm font-medium text-foreground shadow-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={value[layer]}
              onChange={() =>
                onChange({
                  ...value,
                  [layer]: !value[layer],
                })
              }
            />
            <span>{layer.charAt(0).toUpperCase() + layer.slice(1)}</span>
          </label>
          <button
            type="button"
            onClick={() => onRerollLayer(layer)}
            disabled={!canReroll}
            className="inline-flex items-center justify-center rounded-md border border-border bg-white/60 px-3 py-2 text-sm text-foreground shadow-sm transition hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/5 dark:hover:bg-white/10"
            title={`Reroll ${layer}`}
            aria-label={`Reroll ${layer}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
              <rect x="5" y="5" width="14" height="14" rx="2.5" />
              <circle cx="9" cy="9" r="1" fill="currentColor" stroke="none" />
              <circle cx="15" cy="9" r="1" fill="currentColor" stroke="none" />
              <circle cx="9" cy="15" r="1" fill="currentColor" stroke="none" />
              <circle cx="15" cy="15" r="1" fill="currentColor" stroke="none" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
