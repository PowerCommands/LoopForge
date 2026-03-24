import type { LayerToggles } from "../music/types";

interface LayerToggleGroupProps {
  value: LayerToggles;
  onChange: (next: LayerToggles) => void;
}

const LAYER_OPTIONS: Array<keyof LayerToggles> = ["chords", "melody", "bass"];

export function LayerToggleGroup({ value, onChange }: LayerToggleGroupProps) {
  return (
    <div className="layer-group">
      {LAYER_OPTIONS.map((layer) => (
        <label className="checkbox" key={layer}>
          <input
            type="checkbox"
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
