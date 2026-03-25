import { useMemo, useState } from "react";
import type { StoredArrangement } from "../music/arrangementLibrary";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { useConfirmDialog } from "./ui/confirm-dialog";
import { Input } from "./ui/input";
import { Select } from "./ui/select";

type LyricsTableSide = "left" | "right";

interface LyricsRow {
  id: string;
  text: string;
}

interface LyricsWorkspaceProps {
  arrangements: StoredArrangement[];
  onArrangementLyricsChange: (arrangementId: string, lyrics: { text1?: string; text2?: string }) => void;
}

const PRIMARY_LYRIC_TAGS = [
  "[Intro]",
  "[Verse]",
  "[Pre Chorus]",
  "[Chorus]",
  "[Hook]",
  "[Bridge]",
  "[Build Up]",
  "[Drop]",
  "[Interlude]",
  "[Refrain]",
  "[Post Chorus]",
  "[Solo]",
  "[Instrumental]",
  "[Outro]",
] as const;

const SECONDARY_LYRIC_TAGS = [
  "[Soft]",
  "[Quiet]",
  "[Break]",
  "[Ambient]",
  "[Build]",
  "[Energetic]",
  "[Intense]",
  "[Explosive]",
  "[Climax]",
] as const;

interface LyricsTableProps {
  title: string;
  rows: LyricsRow[];
  selectedRowId: string | null;
  generatedLyrics: string;
  onAddFirstRow: () => void;
  onClearAllRows: () => void;
  onSelectRow: (rowId: string) => void;
  onAddRowBelow: (rowId: string) => void;
  onRemoveRow: (rowId: string) => void;
  onMoveRow: (rowId: string, direction: -1 | 1) => void;
  onUpdateRow: (rowId: string, text: string) => void;
  onGenerateLyrics: () => void;
  onCopyLyrics: () => void;
}

function createEmptyRow(): LyricsRow {
  return {
    id: `lyrics-row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text: "",
  };
}

function buildLyricsText(rows: LyricsRow[]): string {
  return rows.map((row) => row.text.trim()).filter((value) => value.length > 0).join("\n");
}

function createRowsFromLyricsText(text: string): LyricsRow[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => ({ ...createEmptyRow(), text: line }));
}

function LyricsTable({
  title,
  rows,
  selectedRowId,
  generatedLyrics,
  onAddFirstRow,
  onClearAllRows,
  onSelectRow,
  onAddRowBelow,
  onRemoveRow,
  onMoveRow,
  onUpdateRow,
  onGenerateLyrics,
  onCopyLyrics,
}: LyricsTableProps) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <CardTitle>{title}</CardTitle>
        <CardDescription>Build lyric lines row by row and generate a consolidated lyric block below.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-white/45 dark:bg-white/5">
              <tr>
                <th className="w-14 px-3 py-3 text-left">
                  <Button type="button" size="sm" variant="secondary" onClick={onAddFirstRow} title="Add row">
                    +
                  </Button>
                </th>
                <th className="w-14 px-2 py-3 text-left text-muted-foreground"> </th>
                <th className="w-14 px-2 py-3 text-left text-muted-foreground"> </th>
                <th className="px-3 py-3 text-left font-semibold text-muted-foreground">Text</th>
                <th className="w-40 px-3 py-3 text-right">
                  <Button type="button" size="sm" variant="secondary" onClick={onClearAllRows} disabled={rows.length === 0}>
                    Clear all
                  </Button>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id} className="border-t border-border bg-card/70">
                  <td className="px-3 py-3 align-top">
                    <input
                      type="radio"
                      checked={selectedRowId === row.id}
                      onChange={() => onSelectRow(row.id)}
                      className="h-4 w-4 accent-primary"
                      aria-label={`Select ${title} row ${index + 1}`}
                    />
                  </td>
                  <td className="px-2 py-3 align-top">
                    <Button type="button" size="sm" variant="secondary" onClick={() => onAddRowBelow(row.id)} title="Add row below">
                      +
                    </Button>
                  </td>
                  <td className="px-2 py-3 align-top">
                    <Button type="button" size="sm" variant="secondary" onClick={() => onRemoveRow(row.id)} title="Remove row">
                      −
                    </Button>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <Input
                      type="text"
                      value={row.text}
                      onChange={(event) => onUpdateRow(row.id, event.target.value)}
                      onFocus={() => onSelectRow(row.id)}
                      aria-label={`${title} text row ${index + 1}`}
                    />
                  </td>
                  <td className="px-3 py-3 align-top">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => onMoveRow(row.id, -1)}
                        disabled={rows.length <= 1 || index === 0}
                        title="Move up"
                      >
                        ↑
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => onMoveRow(row.id, 1)}
                        disabled={rows.length <= 1 || index === rows.length - 1}
                        title="Move down"
                      >
                        ↓
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Button type="button" onClick={onGenerateLyrics} className="w-full">
          Generate lyrics
        </Button>

        <div className="rounded-md border border-border bg-white/45 p-4 dark:bg-[#17152d]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="m-0 text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Lyric</p>
            <Button type="button" size="sm" variant="secondary" onClick={onCopyLyrics} disabled={generatedLyrics.trim().length === 0}>
              Copy
            </Button>
          </div>
          <textarea
            value={generatedLyrics}
            readOnly
            className="min-h-[220px] w-full resize-none rounded-md border border-input bg-white/85 p-3 text-sm text-foreground dark:bg-[#f7f4ff] dark:text-[#5b21b6]"
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function LyricsWorkspace({ arrangements, onArrangementLyricsChange }: LyricsWorkspaceProps) {
  const confirm = useConfirmDialog();
  const [selectedArrangementId, setSelectedArrangementId] = useState<string>("");
  const [selectedTarget, setSelectedTarget] = useState<{ table: LyricsTableSide; rowId: string } | null>(null);
  const [leftRows, setLeftRows] = useState<LyricsRow[]>([]);
  const [rightRows, setRightRows] = useState<LyricsRow[]>([]);
  const [leftLyrics, setLeftLyrics] = useState("");
  const [rightLyrics, setRightLyrics] = useState("");

  const selectedArrangement = useMemo(
    () => arrangements.find((arrangement) => arrangement.id === selectedArrangementId) ?? null,
    [arrangements, selectedArrangementId],
  );

  const resetWorkspace = (arrangementId: string) => {
    const arrangement = arrangements.find((item) => item.id === arrangementId);

    setSelectedArrangementId(arrangementId);
    setSelectedTarget(null);

    if (!arrangement) {
      setLeftRows([]);
      setRightRows([]);
      setLeftLyrics("");
      setRightLyrics("");
      return;
    }

    setLeftRows(createRowsFromLyricsText(arrangement.text1));
    setRightRows(createRowsFromLyricsText(arrangement.text2));
    setLeftLyrics(arrangement.text1);
    setRightLyrics(arrangement.text2);
  };

  const updateRowsForSide = (side: LyricsTableSide, updater: (rows: LyricsRow[]) => LyricsRow[]) => {
    const setter = side === "left" ? setLeftRows : setRightRows;

    setter((current) => updater(current));
  };

  const createRowInSide = (side: LyricsTableSide, insertAfterId?: string, text = "") => {
    const row = { ...createEmptyRow(), text };

    updateRowsForSide(side, (current) => {
      if (!insertAfterId) {
        return [...current, row];
      }

      const index = current.findIndex((item) => item.id === insertAfterId);

      if (index === -1) {
        return [...current, row];
      }

      const next = [...current];
      next.splice(index + 1, 0, row);
      return next;
    });

    setSelectedTarget({ table: side, rowId: row.id });
  };

  const removeRowFromSide = async (side: LyricsTableSide, rowId: string) => {
    const shouldContinue = await confirm({
      title: "Delete Lyric Row?",
      description: "This removes the selected lyric row from the current workspace.",
      confirmLabel: "Delete Row",
      tone: "destructive",
    });

    if (!shouldContinue) {
      return;
    }

    const rows = side === "left" ? leftRows : rightRows;
    const index = rows.findIndex((row) => row.id === rowId);

    updateRowsForSide(side, (current) => current.filter((row) => row.id !== rowId));

    if (selectedTarget?.table === side && selectedTarget.rowId === rowId) {
      const fallbackRow = rows[index + 1] ?? rows[index - 1] ?? null;
      setSelectedTarget(fallbackRow ? { table: side, rowId: fallbackRow.id } : null);
    }
  };

  const moveRowInSide = (side: LyricsTableSide, rowId: string, direction: -1 | 1) => {
    updateRowsForSide(side, (current) => {
      const index = current.findIndex((row) => row.id === rowId);
      const nextIndex = index + direction;

      if (index === -1 || nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const [row] = next.splice(index, 1);
      next.splice(nextIndex, 0, row);
      return next;
    });
  };

  const clearRowsInSide = async (side: LyricsTableSide) => {
    const shouldContinue = await confirm({
      title: "Clear All Rows?",
      description: "This removes all lyric rows on the selected side.",
      confirmLabel: "Clear Rows",
      tone: "destructive",
    });

    if (!shouldContinue) {
      return;
    }

    if (side === "left") {
      setLeftRows([]);
      setLeftLyrics("");
    } else {
      setRightRows([]);
      setRightLyrics("");
    }

    if (selectedTarget?.table === side) {
      setSelectedTarget(null);
    }
  };

  const updateRowText = (side: LyricsTableSide, rowId: string, text: string) => {
    updateRowsForSide(side, (current) =>
      current.map((row) =>
        row.id === rowId
          ? {
              ...row,
              text,
            }
          : row,
      ),
    );
  };

  const handlePaste = async () => {
    if (!selectedTarget) {
      return;
    }

    const clipboardText = await navigator.clipboard.readText();
    const lines = clipboardText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      return;
    }

    const createdRows = lines.slice(1).map((line) => ({
      ...createEmptyRow(),
      text: line,
    }));

    updateRowsForSide(selectedTarget.table, (current) => {
      const rowIndex = current.findIndex((item) => item.id === selectedTarget.rowId);

      if (rowIndex === -1) {
        return current;
      }

      const next = [...current];
      next[rowIndex] = {
        ...next[rowIndex],
        text: lines[0],
      };
      next.splice(rowIndex + 1, 0, ...createdRows);

      return next;
    });

    const lastInsertedRow = createdRows.length > 0 ? createdRows[createdRows.length - 1] : undefined;
    setSelectedTarget({
      table: selectedTarget.table,
      rowId: lastInsertedRow?.id ?? selectedTarget.rowId,
    });
  };

  const handleInsertTag = (tag: string) => {
    if (!selectedTarget) {
      return;
    }

    const rows = selectedTarget.table === "left" ? leftRows : rightRows;
    const row = rows.find((item) => item.id === selectedTarget.rowId);

    if (!row) {
      return;
    }

    const nextText = row.text.trim().length === 0 ? tag : `${row.text} ${tag}`;
    updateRowText(selectedTarget.table, selectedTarget.rowId, nextText);
  };

  const handleGenerateLyrics = (side: LyricsTableSide) => {
    if (!selectedArrangementId) {
      return;
    }

    const rows = side === "left" ? leftRows : rightRows;
    const lyrics = buildLyricsText(rows);

    if (side === "left") {
      setLeftLyrics(lyrics);
      onArrangementLyricsChange(selectedArrangementId, { text1: lyrics });
      return;
    }

    setRightLyrics(lyrics);
    onArrangementLyricsChange(selectedArrangementId, { text2: lyrics });
  };

  const handleCopyLyrics = async (side: LyricsTableSide) => {
    const lyrics = side === "left" ? leftLyrics : rightLyrics;

    if (lyrics.trim().length === 0) {
      return;
    }

    await navigator.clipboard.writeText(lyrics);
  };

  return (
    <div className="mx-auto flex w-[90%] flex-col gap-5">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Lyrics</CardTitle>
          <CardDescription>Select a saved arrangement and assemble lyric sections line by line.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="max-w-[420px]">
            <Select
              value={selectedArrangementId}
              onChange={(event) => resetWorkspace(event.target.value)}
              aria-label="Select arrangement"
            >
              <option value="">Select saved arrangement</option>
              {arrangements.map((arrangement) => (
                <option key={arrangement.id} value={arrangement.id}>
                  {arrangement.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-3 rounded-md border border-border bg-white/35 p-3 dark:bg-white/5">
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="secondary" onClick={() => void handlePaste()} disabled={!selectedTarget}>
                Paste
              </Button>
              {PRIMARY_LYRIC_TAGS.map((tag) => (
                <Button key={tag} type="button" variant="secondary" onClick={() => handleInsertTag(tag)} disabled={!selectedTarget}>
                  {tag}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              {SECONDARY_LYRIC_TAGS.map((tag) => (
                <Button key={tag} type="button" variant="secondary" onClick={() => handleInsertTag(tag)} disabled={!selectedTarget}>
                  {tag}
                </Button>
              ))}
            </div>
          </div>

          {selectedArrangement ? (
            <div className="grid grid-cols-1 gap-[2%] xl:grid-cols-[49%_49%]">
              <LyricsTable
                title={`${selectedArrangement.name} · Left`}
                rows={leftRows}
                selectedRowId={selectedTarget?.table === "left" ? selectedTarget.rowId : null}
                generatedLyrics={leftLyrics}
                onAddFirstRow={() => createRowInSide("left")}
                onClearAllRows={() => void clearRowsInSide("left")}
                onSelectRow={(rowId) => setSelectedTarget({ table: "left", rowId })}
                onAddRowBelow={(rowId) => createRowInSide("left", rowId)}
                onRemoveRow={(rowId) => void removeRowFromSide("left", rowId)}
                onMoveRow={(rowId, direction) => moveRowInSide("left", rowId, direction)}
                onUpdateRow={(rowId, text) => updateRowText("left", rowId, text)}
                onGenerateLyrics={() => handleGenerateLyrics("left")}
                onCopyLyrics={() => void handleCopyLyrics("left")}
              />
              <LyricsTable
                title={`${selectedArrangement.name} · Right`}
                rows={rightRows}
                selectedRowId={selectedTarget?.table === "right" ? selectedTarget.rowId : null}
                generatedLyrics={rightLyrics}
                onAddFirstRow={() => createRowInSide("right")}
                onClearAllRows={() => void clearRowsInSide("right")}
                onSelectRow={(rowId) => setSelectedTarget({ table: "right", rowId })}
                onAddRowBelow={(rowId) => createRowInSide("right", rowId)}
                onRemoveRow={(rowId) => void removeRowFromSide("right", rowId)}
                onMoveRow={(rowId, direction) => moveRowInSide("right", rowId, direction)}
                onUpdateRow={(rowId, text) => updateRowText("right", rowId, text)}
                onGenerateLyrics={() => handleGenerateLyrics("right")}
                onCopyLyrics={() => void handleCopyLyrics("right")}
              />
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-border bg-white/45 px-5 py-10 text-sm text-muted-foreground dark:bg-[#17152d]">
              Choose a saved arrangement to open the lyrics workspace.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
