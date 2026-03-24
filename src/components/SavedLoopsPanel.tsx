import type { SavedLoop } from "../music/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

interface SavedLoopsPanelProps {
  savedLoops: SavedLoop[];
}

export function SavedLoopsPanel({ savedLoops }: SavedLoopsPanelProps) {
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
                  <span className="rounded-full bg-muted px-2 py-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    {savedLoop.loop.settings.length} bars
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {savedLoop.loop.settings.key} {savedLoop.loop.settings.scale} · {savedLoop.loop.settings.tempo} BPM ·{" "}
                  {savedLoop.loop.settings.mood}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
