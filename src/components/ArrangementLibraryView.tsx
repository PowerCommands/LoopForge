import { Fragment, useMemo, useState } from "react";
import type { StoredArrangement } from "../music/arrangementLibrary";
import { getArrangementSeconds } from "../music/arrangement";
import { useConfirmDialog } from "./ui/confirm-dialog";
import { ExportDialog, type ExportFormat } from "./ui/export-dialog";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

interface ArrangementLibraryViewProps {
  arrangements: StoredArrangement[];
  onExportArrangement: (arrangement: StoredArrangement, format: ExportFormat) => Promise<void> | void;
  onPlayLoop: (loop: StoredArrangement["loops"][number]) => void;
  onEdit: (arrangement: StoredArrangement) => void;
  onDelete: (arrangement: StoredArrangement) => void;
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

export function ArrangementLibraryView({ arrangements, onExportArrangement, onPlayLoop, onEdit, onDelete }: ArrangementLibraryViewProps) {
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [exportArrangement, setExportArrangement] = useState<StoredArrangement | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const confirm = useConfirmDialog();

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

  const handleEdit = async (arrangement: StoredArrangement) => {
    const shouldContinue = await confirm({
      title: "Edit Arrangement?",
      description: "This opens the arrangement in Studio and replaces the loops currently loaded in the Arrangement panel.",
      confirmLabel: "Open In Studio",
      tone: "destructive",
    });

    if (!shouldContinue) {
      return;
    }

    onEdit(arrangement);
  };

  const handleDelete = async (arrangement: StoredArrangement) => {
    const shouldContinue = await confirm({
      title: `Delete ${arrangement.name}?`,
      description: "This permanently removes the arrangement from the local library on this browser.",
      confirmLabel: "Delete",
      tone: "destructive",
    });

    if (!shouldContinue) {
      return;
    }

    onDelete(arrangement);
  };

  const handleDownload = async (format: ExportFormat) => {
    if (!exportArrangement) {
      return;
    }

    setIsExporting(true);

    try {
      await onExportArrangement(exportArrangement, format);
      setExportArrangement(null);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Library</CardTitle>
          <CardDescription>Saved arrangements are stored locally in this browser and can be exported as WAV or MIDI.</CardDescription>
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
                    <th className="px-4 py-3 font-semibold">Total</th>
                    <th className="px-4 py-3 font-semibold">Saved</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedArrangements.map((arrangement) => {
                    const isExpanded = expandedIds.includes(arrangement.id);
                    const arrangementSeconds = getArrangementSeconds(
                      arrangement.loops.map((loop) => ({
                        id: loop.id,
                        name: loop.name,
                        seconds: loop.seconds,
                        loop: loop.loop,
                      })),
                    );

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
                        <td className="px-4 py-3 align-top text-muted-foreground">{arrangementSeconds} sec</td>
                        <td className="px-4 py-3 align-top text-muted-foreground">{formatSavedAt(arrangement.createdAt)}</td>
                        <td className="px-4 py-3 text-right align-top">
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={() => handleEdit(arrangement)}
                                title="Edit arrangement"
                                aria-label="Edit arrangement"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
                                  <path d="M12 20h9" />
                                  <path d="m16.5 3.5 4 4L7 21H3v-4L16.5 3.5Z" />
                                </svg>
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={() => setExportArrangement(arrangement)}
                                title="Export output"
                                aria-label="Export output"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
                                  <path d="M12 4v12" />
                                  <path d="m17 11-5 5-5-5" />
                                  <path d="M4 20h16" />
                                </svg>
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={() => handleDelete(arrangement)}
                                title="Delete arrangement"
                                aria-label="Delete arrangement"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
                                  <path d="M3 6h18" />
                                  <path d="M8 6V4h8v2" />
                                  <path d="M19 6l-1 14H6L5 6" />
                                  <path d="M10 11v6" />
                                  <path d="M14 11v6" />
                                </svg>
                              </Button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded ? (
                          <tr className="border-t border-border bg-white/35 dark:bg-white/5">
                            <td colSpan={7} className="px-4 py-4">
                              <div className="space-y-3">
                                {arrangement.loops.map((loop, index) => (
                                  <div key={loop.id} className="rounded-md border border-border bg-white/55 px-4 py-3 dark:bg-[#17152d]">
                                    <div className="flex items-start justify-between gap-3">
                                      <p className="m-0 font-medium text-foreground">
                                        {index + 1}. {loop.name}
                                      </p>
                                      <div className="flex gap-2">
                                        <span className="rounded-full bg-muted px-2 py-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                                          {loop.loop.settings.length} bars
                                        </span>
                                        <span className="rounded-full bg-muted px-2 py-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                                          {loop.seconds} sec
                                        </span>
                                      </div>
                                    </div>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                      {loop.loop.settings.key} {loop.loop.settings.scale} · {loop.loop.settings.tempo} BPM ·{" "}
                                      {loop.loop.settings.mood} ·{" "}
                                      {loop.loop.settings.section.charAt(0).toUpperCase() + loop.loop.settings.section.slice(1)}
                                    </p>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                      {loop.loop.chords.length > 0
                                        ? loop.loop.chords.map((chord) => chord.symbol.split(" ")[0]).join(" - ")
                                        : "No chords"}
                                    </p>
                                    <div className="mt-3">
                                      <Button type="button" variant="secondary" size="sm" onClick={() => onPlayLoop(loop)} title="Play loop" aria-label="Play loop">
                                        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                                          <path d="M8 5.14v13.72a1 1 0 0 0 1.52.86l10.29-6.86a1 1 0 0 0 0-1.66L9.52 4.28A1 1 0 0 0 8 5.14Z" />
                                        </svg>
                                      </Button>
                                    </div>
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
      <ExportDialog
        open={exportArrangement !== null}
        title={exportArrangement ? `Export ${exportArrangement.name}` : "Export arrangement"}
        description="Choose the output format for this saved arrangement."
        isSubmitting={isExporting}
        onClose={() => {
          if (!isExporting) {
            setExportArrangement(null);
          }
        }}
        onDownload={handleDownload}
      />
    </>
  );
}
