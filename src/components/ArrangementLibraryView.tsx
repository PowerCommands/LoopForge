import { Fragment, useMemo, useState } from "react";
import type { StoredArrangement } from "../music/arrangementLibrary";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

interface ArrangementLibraryViewProps {
  arrangements: StoredArrangement[];
  onDownloadMidi: (arrangement: StoredArrangement) => void;
}

function formatSavedAt(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function normalizeUrl(value: string): string {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return "";
  }

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function ArrangementLibraryView({ arrangements, onDownloadMidi }: ArrangementLibraryViewProps) {
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  const sortedArrangements = useMemo(
    () =>
      [...arrangements].sort(
        (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
      ),
    [arrangements],
  );

  const toggleExpanded = (id: string) => {
    setExpandedIds((current) =>
      current.includes(id) ? current.filter((currentId) => currentId !== id) : [...current, id],
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Library</CardTitle>
        <CardDescription>Saved arrangements are stored locally in this browser and can be downloaded again as MIDI.</CardDescription>
      </CardHeader>
      <CardContent>
        {sortedArrangements.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-white/45 px-5 py-8 text-sm text-muted-foreground dark:bg-[#17152d]">
            Save an arrangement to start building your arrangement library.
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border border-border">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-white/45 dark:bg-white/5">
                <tr className="text-muted-foreground">
                  <th className="w-12 px-4 py-3"> </th>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">URL</th>
                  <th className="px-4 py-3 font-semibold">Tempo</th>
                  <th className="px-4 py-3 font-semibold">Saved</th>
                  <th className="px-4 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedArrangements.map((arrangement) => {
                  const isExpanded = expandedIds.includes(arrangement.id);

                  return (
                    <Fragment key={arrangement.id}>
                      <tr className="border-t border-border bg-card/70">
                        <td className="px-4 py-3 align-top">
                          <button
                            type="button"
                            onClick={() => toggleExpanded(arrangement.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-white/50 text-foreground dark:bg-white/5"
                            aria-label={isExpanded ? "Collapse arrangement" : "Expand arrangement"}
                          >
                            {isExpanded ? "−" : "+"}
                          </button>
                        </td>
                        <td className="px-4 py-3 align-top font-medium text-foreground">{arrangement.name}</td>
                        <td className="px-4 py-3 align-top text-muted-foreground">
                          {arrangement.url.trim().length > 0 ? (
                            <a
                              href={normalizeUrl(arrangement.url)}
                              target="_blank"
                              rel="noreferrer"
                              className="break-all underline underline-offset-4"
                            >
                              {arrangement.url}
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3 align-top text-muted-foreground">{arrangement.tempo} BPM</td>
                        <td className="px-4 py-3 align-top text-muted-foreground">{formatSavedAt(arrangement.createdAt)}</td>
                        <td className="px-4 py-3 text-right align-top">
                          <Button type="button" size="sm" variant="secondary" onClick={() => onDownloadMidi(arrangement)}>
                            Download Midi
                          </Button>
                        </td>
                      </tr>
                      {isExpanded ? (
                        <tr className="border-t border-border bg-white/35 dark:bg-white/5">
                          <td colSpan={6} className="px-4 py-4">
                            <div className="space-y-3">
                              {arrangement.loops.map((loop, index) => (
                                <div key={loop.id} className="rounded-md border border-border bg-white/55 px-4 py-3 dark:bg-[#17152d]">
                                  <div className="flex items-start justify-between gap-3">
                                    <p className="m-0 font-medium text-foreground">
                                      {index + 1}. {loop.name}
                                    </p>
                                    <span className="rounded-full bg-muted px-2 py-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                                      {loop.loop.settings.length} bars
                                    </span>
                                  </div>
                                  <p className="mt-2 text-sm text-muted-foreground">
                                    {loop.loop.settings.key} {loop.loop.settings.scale} · {loop.loop.settings.tempo} BPM ·{" "}
                                    {loop.loop.settings.mood}
                                  </p>
                                  <p className="mt-2 text-sm text-muted-foreground">
                                    {loop.loop.chords.length > 0
                                      ? loop.loop.chords.map((chord) => chord.symbol.split(" ")[0]).join(" - ")
                                      : "No chords"}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
