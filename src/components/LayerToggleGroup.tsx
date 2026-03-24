import type { LayerToggles } from "../music/types";

interface LayerToggleGroupProps {
  value: LayerToggles;
  onChange: (next: LayerToggles) => void;
}

const LAYER_OPTIONS: Array<keyof LayerToggles> = ["chords", "melody", "bass"];

export function LayerToggleGroup({ value, onChange }: LayerToggleGroupProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {LAYER_OPTIONS.map((layer) => (
        <label
          className="inline-flex items-center gap-2 rounded-md border border-border bg-white/70 px-3 py-2 text-sm font-medium text-foreground shadow-sm"
          key={layer}
        >
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
      ))}
    </div>
  );
}
