import type { SavedLoop } from "../music/types";
import { getArrangementSeconds } from "../music/arrangement";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";

interface ArrangementPanelProps {
  savedLoops: SavedLoop[];
  arrangementName: string;
  arrangementUrl: string;
  isEditingArrangement: boolean;
  onRename: (id: string, name: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onRemove: (id: string) => void;
  onPlayLoop: (savedLoop: SavedLoop) => void;
  onArrangementNameChange: (name: string) => void;
  onArrangementUrlChange: (url: string) => void;
  onPlayArrangement: () => void;
  onStopArrangement: () => void;
  onSaveArrangement: () => void;
}

export function ArrangementPanel({
  savedLoops,
  arrangementName,
  arrangementUrl,
  isEditingArrangement,
  onRename,
  onMoveUp,
  onMoveDown,
  onRemove,
  onPlayLoop,
  onArrangementNameChange,
  onArrangementUrlChange,
  onPlayArrangement,
  onStopArrangement,
  onSaveArrangement,
}: ArrangementPanelProps) {
  const canSaveArrangement = savedLoops.length > 0 && arrangementName.trim().length > 0;
  const totalSeconds = getArrangementSeconds(savedLoops);

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle>Arrangement</CardTitle>
        <CardDescription>
          Build a simple song sketch by assembling saved loops here. Drag and drop sequencing will be added later.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <Button type="button" onClick={onPlayArrangement} disabled={savedLoops.length === 0} className="flex-1">
            Play
          </Button>
          <Button type="button" variant="secondary" onClick={onStopArrangement} className="flex-1">
            Stop
          </Button>
        </div>

        {savedLoops.length > 0 ? (
          <p className="m-0 text-sm font-medium text-muted-foreground">Total arrangement time: {totalSeconds} sec</p>
        ) : null}

        {savedLoops.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-white/45 px-4 py-6 text-sm text-muted-foreground dark:bg-[#17152d]">
            Save loops to build a simple song structure here.
          </div>
        ) : (
          <div className="space-y-3">
            {savedLoops.map((savedLoop, index) => (
              <section className="rounded-md border border-border bg-white/60 p-4 dark:bg-[#17152d]" key={savedLoop.id}>
                <Input
                  type="text"
                  value={savedLoop.name}
                  onChange={(event) => onRename(savedLoop.id, event.target.value)}
                  aria-label={`Loop name ${index + 1}`}
                />
                <p className="mb-0 mt-3 text-sm text-muted-foreground">
                  {savedLoop.loop.settings.key} {savedLoop.loop.settings.scale} | {savedLoop.loop.settings.tempo} BPM |{" "}
                  {savedLoop.loop.settings.length} bars | {savedLoop.seconds} sec | {savedLoop.loop.settings.mood}
                </p>
                <p className="mb-0 mt-2 text-sm text-muted-foreground">
                  {savedLoop.loop.chords.length > 0
                    ? savedLoop.loop.chords.map((chord) => chord.symbol.split(" ")[0]).join(" - ")
                    : "No chords"}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => onPlayLoop(savedLoop)} title="Play loop" aria-label="Play loop">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                      <path d="M8 5.14v13.72a1 1 0 0 0 1.52.86l10.29-6.86a1 1 0 0 0 0-1.66L9.52 4.28A1 1 0 0 0 8 5.14Z" />
                    </svg>
                  </Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => onMoveUp(savedLoop.id)} disabled={index === 0}>
                    Up
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => onMoveDown(savedLoop.id)}
                    disabled={index === savedLoops.length - 1}
                  >
                    Down
                  </Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => onRemove(savedLoop.id)}>
                    Remove
                  </Button>
                </div>
              </section>
            ))}
          </div>
        )}

        <Input
          type="text"
          value={arrangementName}
          onChange={(event) => onArrangementNameChange(event.target.value)}
          placeholder="Arrangement name"
          aria-label="Arrangement name"
        />

        <Input
          type="url"
          value={arrangementUrl}
          onChange={(event) => onArrangementUrlChange(event.target.value)}
          placeholder="Arrangement URL"
          aria-label="Arrangement URL"
        />

        <Button type="button" variant="secondary" onClick={onSaveArrangement} disabled={!canSaveArrangement} className="w-full">
          {isEditingArrangement ? "Update Arrangement" : "Save Arrangement"}
        </Button>
      </CardContent>
    </Card>
  );
}
