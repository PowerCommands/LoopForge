import type { SavedLoop } from "../music/types";

interface ArrangementPanelProps {
  savedLoops: SavedLoop[];
  onRename: (id: string, name: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onRemove: (id: string) => void;
  onExportArrangement: () => void;
}

export function ArrangementPanel({
  savedLoops,
  onRename,
  onMoveUp,
  onMoveDown,
  onRemove,
  onExportArrangement,
}: ArrangementPanelProps) {
  return (
    <aside className="panel arrangement-panel">
      <div className="arrangement-panel__header">
        <h2>Arrangement</h2>
        <button
          type="button"
          className="secondary"
          onClick={onExportArrangement}
          disabled={savedLoops.length === 0}
        >
          Export Arrangement MIDI
        </button>
      </div>

      {savedLoops.length === 0 ? (
        <p className="muted">Save loops to build a simple song structure here.</p>
      ) : (
        <div className="arrangement-list">
          {savedLoops.map((savedLoop, index) => (
            <section className="arrangement-item" key={savedLoop.id}>
              <input
                type="text"
                value={savedLoop.name}
                onChange={(event) => onRename(savedLoop.id, event.target.value)}
                aria-label={`Loop name ${index + 1}`}
              />
              <p className="arrangement-meta">
                {savedLoop.loop.settings.key} {savedLoop.loop.settings.scale} | {savedLoop.loop.settings.tempo} BPM |{" "}
                {savedLoop.loop.settings.length} bars | {savedLoop.loop.settings.mood}
              </p>
              <p className="arrangement-meta">
                {savedLoop.loop.chords.length > 0
                  ? savedLoop.loop.chords.map((chord) => chord.symbol.split(" ")[0]).join(" - ")
                  : "No chords"}
              </p>
              <div className="arrangement-actions">
                <button type="button" className="secondary" onClick={() => onMoveUp(savedLoop.id)} disabled={index === 0}>
                  Up
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => onMoveDown(savedLoop.id)}
                  disabled={index === savedLoops.length - 1}
                >
                  Down
                </button>
                <button type="button" className="secondary" onClick={() => onRemove(savedLoop.id)}>
                  Remove
                </button>
              </div>
            </section>
          ))}
        </div>
      )}
    </aside>
  );
}
