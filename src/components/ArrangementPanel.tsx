import type { SavedLoop } from "../music/types";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";

interface ArrangementPanelProps {
  savedLoops: SavedLoop[];
  arrangementName: string;
  onRename: (id: string, name: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onRemove: (id: string) => void;
  onArrangementNameChange: (name: string) => void;
  onPlayArrangement: () => void;
  onStopArrangement: () => void;
  onSaveArrangement: () => void;
}

export function ArrangementPanel({
  savedLoops,
  arrangementName,
  onRename,
  onMoveUp,
  onMoveDown,
  onRemove,
  onArrangementNameChange,
  onPlayArrangement,
  onStopArrangement,
  onSaveArrangement,
}: ArrangementPanelProps) {
  const canSaveArrangement = savedLoops.length > 0 && arrangementName.trim().length > 0;

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
                  {savedLoop.loop.settings.length} bars | {savedLoop.loop.settings.mood}
                </p>
                <p className="mb-0 mt-2 text-sm text-muted-foreground">
                  {savedLoop.loop.chords.length > 0
                    ? savedLoop.loop.chords.map((chord) => chord.symbol.split(" ")[0]).join(" - ")
                    : "No chords"}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
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

        <Button type="button" variant="secondary" onClick={onSaveArrangement} disabled={!canSaveArrangement} className="w-full">
          Save Arrangement
        </Button>
      </CardContent>
    </Card>
  );
}
