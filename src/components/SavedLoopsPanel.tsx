import { Button } from "./ui/button";
import type { SavedLoop } from "../music/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

interface SavedLoopsPanelProps {
  savedLoops: SavedLoop[];
  onPlayLoop: (savedLoop: SavedLoop) => void;
}

export function SavedLoopsPanel({ savedLoops, onPlayLoop }: SavedLoopsPanelProps) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle>Loops</CardTitle>
        <CardDescription>
          Added loops will appear here. You will be able to reload, rename, duplicate, and reuse them later.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {savedLoops.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-white/45 px-4 py-6 text-sm text-muted-foreground dark:bg-white/5">
            Add a loop from the generator to start building your sketch library.
          </div>
        ) : (
          <div className="space-y-3">
            {savedLoops.map((savedLoop) => (
              <div key={savedLoop.id} className="rounded-md border border-border bg-white/55 px-4 py-3 dark:bg-white/5">
                <div className="flex items-start justify-between gap-3">
                  <p className="m-0 font-medium text-foreground">{savedLoop.name}</p>
                  <div className="flex gap-2">
                    <span className="rounded-full bg-muted px-2 py-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      {savedLoop.loop.settings.length} bars
                    </span>
                    <span className="rounded-full bg-muted px-2 py-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      {savedLoop.seconds} sec
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {savedLoop.loop.settings.key} {savedLoop.loop.settings.scale} · {savedLoop.loop.settings.tempo} BPM ·{" "}
                  {savedLoop.loop.settings.mood}
                </p>
                <div className="mt-3">
                  <Button type="button" variant="secondary" size="sm" onClick={() => onPlayLoop(savedLoop)} title="Play loop" aria-label="Play loop">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                      <path d="M8 5.14v13.72a1 1 0 0 0 1.52.86l10.29-6.86a1 1 0 0 0 0-1.66L9.52 4.28A1 1 0 0 0 8 5.14Z" />
                    </svg>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
