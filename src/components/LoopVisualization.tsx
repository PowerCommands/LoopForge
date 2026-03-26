import { useEffect, useMemo, useRef, useState } from "react";
import { Note } from "tonal";
import { mapLoopToVisualization, type VisualizationLayer } from "../lib/loopVisualization";
import {
  clampEditableNoteToLoop,
  createNewEditableNote,
  PIANO_ROLL_STEPS_PER_BEAT,
  type EditableLoop,
} from "../music/editor";
import type { GeneratedLoop, LayerName } from "../music/types";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Select } from "./ui/select";

interface LoopVisualizationProps {
  loop: GeneratedLoop | null;
  editableLoop: EditableLoop | null;
  onLoopChange: (loop: EditableLoop) => void;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  onTranspose: (semitones: number) => void;
  onSave: () => void;
  canUndo: boolean;
  canRedo: boolean;
  hasUnsavedChanges: boolean;
}

type DragState =
  | {
      kind: "move";
      noteId: string;
      pointerId: number;
      stepOffset: number;
      pitchOffset: number;
    }
  | {
      kind: "resize";
      noteId: string;
      pointerId: number;
      startStep: number;
    };

type LayerStyle = {
  fill: string;
  stroke: string;
  label: string;
};

const ACTIVE_LAYER_STYLES: Record<VisualizationLayer, LayerStyle> = {
  chords: {
    fill: "rgba(99, 102, 241, 0.42)",
    stroke: "rgba(129, 140, 248, 0.95)",
    label: "Chords",
  },
  melody: {
    fill: "rgba(168, 85, 247, 0.42)",
    stroke: "rgba(192, 132, 252, 0.95)",
    label: "Melody",
  },
  bass: {
    fill: "rgba(245, 204, 96, 0.42)",
    stroke: "rgba(234, 179, 8, 0.95)",
    label: "Bass",
  },
};

const INACTIVE_LAYER_STYLES = [
  {
    fill: "rgba(120, 127, 142, 0.26)",
    stroke: "rgba(120, 127, 142, 0.75)",
  },
  {
    fill: "rgba(177, 183, 194, 0.24)",
    stroke: "rgba(177, 183, 194, 0.68)",
  },
] as const;

const PITCH_LABEL_WIDTH = 54;
const GRID_TOP = 10;
const MIN_GRID_WIDTH = 900;
const TARGET_BEAT_WIDTH = 88;
const ROW_HEIGHT = 14;
const NOTE_HEIGHT = 10;
const RESIZE_HANDLE_WIDTH = 8;

function clampStep(value: number, totalSteps: number): number {
  return Math.max(0, Math.min(totalSteps - 1, value));
}

function clampPitch(value: number, minPitch: number, maxPitch: number): number {
  return Math.max(minPitch, Math.min(maxPitch, value));
}

function getStepFromPointer(gridX: number, pixelsPerStep: number, totalSteps: number): number {
  return clampStep(Math.floor(gridX / pixelsPerStep), totalSteps);
}

function getPitchFromPointer(gridY: number, rowHeight: number, maxPitch: number, rowsLength: number): number {
  const rowIndex = Math.max(0, Math.min(rowsLength - 1, Math.floor(gridY / rowHeight)));
  return maxPitch - rowIndex;
}

export function LoopVisualization({
  loop,
  editableLoop,
  onLoopChange,
  onUndo,
  onRedo,
  onReset,
  onTranspose,
  onSave,
  canUndo,
  canRedo,
  hasUnsavedChanges,
}: LoopVisualizationProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [activeEditLayer, setActiveEditLayer] = useState<LayerName>("melody");
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const model = useMemo(() => mapLoopToVisualization(editableLoop), [editableLoop]);

  const rows = useMemo(() => {
    if (!model) {
      return [];
    }

    const rowValues: number[] = [];

    for (let pitch = model.maxPitch; pitch >= model.minPitch; pitch -= 1) {
      rowValues.push(pitch);
    }

    return rowValues;
  }, [model]);

  useEffect(() => {
    if (!editableLoop || !selectedNoteId) {
      return;
    }

    if (!editableLoop.notes.some((note) => note.id === selectedNoteId)) {
      setSelectedNoteId(null);
    }
  }, [editableLoop, selectedNoteId]);

  useEffect(() => {
    if (!editableLoop || !selectedNoteId) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;

      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable
      ) {
        return;
      }

      if (event.key !== "Delete" && event.key !== "Backspace") {
        return;
      }

      const selectedNote = editableLoop.notes.find((note) => note.id === selectedNoteId);

      if (!selectedNote || selectedNote.layer !== activeEditLayer) {
        return;
      }

      event.preventDefault();
      onLoopChange({
        ...editableLoop,
        notes: editableLoop.notes.filter((note) => note.id !== selectedNoteId),
      });
      setSelectedNoteId(null);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeEditLayer, editableLoop, onLoopChange, selectedNoteId]);

  if (!loop || !editableLoop || !model) {
    return (
      <Card className="min-h-[360px] border-dashed bg-white/45 dark:bg-[#17152d]">
        <CardHeader className="pb-4">
          <CardTitle>Piano Roll</CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-[250px] items-center justify-center pt-0">
          <p className="max-w-md text-center text-sm text-muted-foreground">
            Generate a loop to inspect and edit the note layout across bars, beats, and pitch lanes.
          </p>
        </CardContent>
      </Card>
    );
  }

  const preferredGridWidth = model.totalBeats * TARGET_BEAT_WIDTH;
  const gridWidth = Math.max(preferredGridWidth, MIN_GRID_WIDTH);
  const pixelsPerBeat = gridWidth / model.totalBeats;
  const pixelsPerStep = pixelsPerBeat / PIANO_ROLL_STEPS_PER_BEAT;
  const gridHeight = rows.length * ROW_HEIGHT;
  const svgWidth = PITCH_LABEL_WIDTH + gridWidth;
  const svgHeight = GRID_TOP + 24 + gridHeight;

  const inactiveLayers = (["chords", "melody", "bass"] as const).filter((layer) => layer !== activeEditLayer);
  const layerStyles = new Map<LayerName, LayerStyle>();
  layerStyles.set(activeEditLayer, ACTIVE_LAYER_STYLES[activeEditLayer]);
  inactiveLayers.forEach((layer, index) => {
    const referenceStyle = INACTIVE_LAYER_STYLES[index] ?? INACTIVE_LAYER_STYLES[INACTIVE_LAYER_STYLES.length - 1];
    layerStyles.set(layer, {
      fill: referenceStyle.fill,
      stroke: referenceStyle.stroke,
      label: ACTIVE_LAYER_STYLES[layer].label,
    });
  });

  const referenceNotes = model.notes.filter((note) => note.layer !== activeEditLayer);
  const editableNotes = model.notes.filter((note) => note.layer === activeEditLayer);

  const updateNote = (noteId: string, updater: (note: EditableLoop["notes"][number]) => EditableLoop["notes"][number]) => {
    const nextNotes = editableLoop.notes.map((note) => {
      if (note.id !== noteId) {
        return note;
      }

      return clampEditableNoteToLoop(updater(note), editableLoop.totalSteps);
    });

    onLoopChange({
      ...editableLoop,
      notes: nextNotes,
    });
  };

  const getPointerPosition = (event: { clientX: number; clientY: number }) => {
    const svg = svgRef.current;

    if (!svg) {
      return null;
    }

    const rect = svg.getBoundingClientRect();
    const scaleX = svgWidth / rect.width;
    const scaleY = svgHeight / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    return {
      x,
      y,
      gridX: Math.max(0, Math.min(gridWidth - 1, x - PITCH_LABEL_WIDTH)),
      gridY: Math.max(0, Math.min(gridHeight - 1, y - (GRID_TOP + 24))),
    };
  };

  const handleGridPointerDown = (event: React.PointerEvent<SVGRectElement>) => {
    if (!editableLoop) {
      return;
    }

    const position = getPointerPosition(event);

    if (!position) {
      return;
    }

    const pitch = clampPitch(
      getPitchFromPointer(position.gridY, ROW_HEIGHT, model.maxPitch, rows.length),
      model.minPitch,
      model.maxPitch,
    );
    const startStep = getStepFromPointer(position.gridX, pixelsPerStep, editableLoop.totalSteps);
    const newNote = createNewEditableNote(activeEditLayer, pitch, startStep, editableLoop.totalSteps);

    onLoopChange({
      ...editableLoop,
      notes: [...editableLoop.notes, newNote],
    });
    setSelectedNoteId(newNote.id);
  };

  const handleSvgPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!dragState || !editableLoop) {
      return;
    }

    const position = getPointerPosition(event);

    if (!position) {
      return;
    }

    if (dragState.kind === "move") {
      const step = getStepFromPointer(position.gridX, pixelsPerStep, editableLoop.totalSteps);
      const pitch = getPitchFromPointer(position.gridY, ROW_HEIGHT, model.maxPitch, rows.length);
      updateNote(dragState.noteId, (note) => ({
        ...note,
        startStep: step - dragState.stepOffset,
        pitch: pitch + dragState.pitchOffset,
      }));
      return;
    }

    const endStep = Math.max(
      dragState.startStep + 1,
      Math.round(position.gridX / pixelsPerStep),
    );

    updateNote(dragState.noteId, (note) => ({
      ...note,
      durationSteps: endStep - dragState.startStep,
    }));
  };

  const handleSvgPointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!dragState) {
      return;
    }

    if (event.pointerId === dragState.pointerId) {
      setDragState(null);
    }
  };

  return (
    <Card className="min-h-[360px] overflow-hidden bg-gradient-to-br from-white/55 to-[#e8e0d1]/70 dark:from-[#1a1834] dark:to-[#1f1a3d]">
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Piano Roll</CardTitle>
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={onUndo} disabled={!canUndo} title="Undo" aria-label="Undo">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
                  <path d="M9 14 4 9l5-5" />
                  <path d="M20 20a8 8 0 0 0-8-8H4" />
                </svg>
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={onRedo} disabled={!canRedo} title="Redo" aria-label="Redo">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
                  <path d="m15 14 5-5-5-5" />
                  <path d="M4 20a8 8 0 0 1 8-8h8" />
                </svg>
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={onReset} disabled={!hasUnsavedChanges} title="Reset" aria-label="Reset">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
                  <path d="M3 12a9 9 0 1 0 3-6.7" />
                  <path d="M3 3v6h6" />
                </svg>
              </Button>
              <div className="ml-1 inline-flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Transpose</span>
                <Button type="button" size="sm" variant="secondary" onClick={() => onTranspose(1)} title="Transpose up" aria-label="Transpose up">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
                    <path d="m12 5-5 5" />
                    <path d="m12 5 5 5" />
                    <path d="M12 5v14" />
                  </svg>
                </Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => onTranspose(-1)} title="Transpose down" aria-label="Transpose down">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
                    <path d="m12 19-5-5" />
                    <path d="m12 19 5-5" />
                    <path d="M12 5v14" />
                  </svg>
                </Button>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 rounded-full border border-border bg-white/55 px-3 py-1 text-xs font-medium text-foreground dark:bg-white/10">
              <span>Edit Layer</span>
              <Select
                value={activeEditLayer}
                onChange={(event) => {
                  setActiveEditLayer(event.target.value as LayerName);
                  setSelectedNoteId(null);
                }}
                className="h-8 rounded-full border-0 bg-transparent px-2 py-0 text-xs shadow-none ring-offset-0 focus-visible:ring-1 text-[#4c1d95] dark:text-[#4c1d95]"
              >
                <option value="chords">Chords</option>
                <option value="melody">Melody</option>
                <option value="bass">Bass</option>
              </Select>
            </label>
            {(["chords", "melody", "bass"] as const).map((layer) => (
              <div
                key={layer}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
                  layer === activeEditLayer
                    ? "border-border bg-white/70 text-foreground dark:bg-white/15"
                    : "border-border/70 bg-white/40 text-muted-foreground dark:bg-white/5"
                }`}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: layerStyles.get(layer)?.stroke ?? ACTIVE_LAYER_STYLES[layer].stroke }}
                />
                {ACTIVE_LAYER_STYLES[layer].label}
              </div>
            ))}
            <Button type="button" size="sm" onClick={onSave} disabled={!hasUnsavedChanges} title="Save" aria-label="Save">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
                <path d="M17 21v-8H7v8" />
                <path d="M7 3v5h8" />
              </svg>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-x-auto overflow-y-hidden rounded-md border border-border/80 bg-white/30 p-3 dark:bg-black/10">
          <div className="min-w-full" style={{ width: `${svgWidth}px` }}>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="block h-auto w-full select-none"
              role="img"
              aria-label="Loop visualization piano roll editor"
              preserveAspectRatio="xMinYMin meet"
              onPointerMove={handleSvgPointerMove}
              onPointerUp={handleSvgPointerUp}
              onPointerCancel={() => setDragState(null)}
            >
              <rect
                x={PITCH_LABEL_WIDTH}
                y={GRID_TOP + 24}
                width={gridWidth}
                height={gridHeight}
                fill="rgba(255,255,255,0.18)"
                rx="8"
              />

              {rows.map((pitch, rowIndex) => {
                const y = GRID_TOP + 24 + rowIndex * ROW_HEIGHT;
                const noteName = Note.pitchClass(Note.fromMidi(pitch) ?? "") || `${pitch}`;

                return (
                  <g key={pitch}>
                    <line
                      x1={PITCH_LABEL_WIDTH}
                      y1={y}
                      x2={PITCH_LABEL_WIDTH + gridWidth}
                      y2={y}
                      stroke="rgba(148, 163, 184, 0.18)"
                      strokeWidth="1"
                    />
                    <text
                      x={PITCH_LABEL_WIDTH - 8}
                      y={y + ROW_HEIGHT / 2 + 4}
                      textAnchor="end"
                      fontSize="10"
                      fill="currentColor"
                      opacity="0.7"
                    >
                      {noteName}
                    </text>
                  </g>
                );
              })}

              <line
                x1={PITCH_LABEL_WIDTH}
                y1={GRID_TOP + 24 + gridHeight}
                x2={PITCH_LABEL_WIDTH + gridWidth}
                y2={GRID_TOP + 24 + gridHeight}
                stroke="rgba(148, 163, 184, 0.18)"
                strokeWidth="1"
              />

              {Array.from({ length: model.totalSteps + 1 }, (_, step) => {
                const x = PITCH_LABEL_WIDTH + step * pixelsPerStep;
                const isBar = step % (PIANO_ROLL_STEPS_PER_BEAT * 4) === 0;
                const isBeat = step % PIANO_ROLL_STEPS_PER_BEAT === 0;
                const beat = step / PIANO_ROLL_STEPS_PER_BEAT;
                const label = Number.isInteger(beat) && beat < model.totalBeats ? `${Math.floor(beat / 4) + 1}.${(beat % 4) + 1}` : "";

                return (
                  <g key={step}>
                    <line
                      x1={x}
                      y1={GRID_TOP + 24}
                      x2={x}
                      y2={GRID_TOP + 24 + gridHeight}
                      stroke={
                        isBar
                          ? "rgba(129, 140, 248, 0.45)"
                          : isBeat
                            ? "rgba(148, 163, 184, 0.28)"
                            : "rgba(148, 163, 184, 0.12)"
                      }
                      strokeWidth={isBar ? "1.5" : "1"}
                    />
                    {label ? (
                      <text
                        x={x + 4}
                        y={GRID_TOP + 14}
                        fontSize="10"
                        fill="currentColor"
                        opacity={isBar ? "0.9" : "0.6"}
                      >
                        {label}
                      </text>
                    ) : null}
                  </g>
                );
              })}

              <rect
                x={PITCH_LABEL_WIDTH}
                y={GRID_TOP + 24}
                width={gridWidth}
                height={gridHeight}
                fill="transparent"
                onPointerDown={handleGridPointerDown}
                style={{ cursor: "crosshair" }}
              />

              {referenceNotes.map((note) => {
                const rowIndex = model.maxPitch - note.pitch;
                const x = PITCH_LABEL_WIDTH + note.startStep * pixelsPerStep;
                const y = GRID_TOP + 24 + rowIndex * ROW_HEIGHT + (ROW_HEIGHT - NOTE_HEIGHT) / 2;
                const width = Math.max(note.durationSteps * pixelsPerStep - 4, 8);
                const style = layerStyles.get(note.layer) ?? ACTIVE_LAYER_STYLES[note.layer];

                return (
                  <g key={note.id} pointerEvents="none">
                    <rect
                      x={x + 2}
                      y={y}
                      width={width}
                      height={NOTE_HEIGHT}
                      rx="4"
                      fill={style.fill}
                      stroke={style.stroke}
                      strokeWidth="1.1"
                    />
                  </g>
                );
              })}

              {editableNotes.map((note) => {
                const rowIndex = model.maxPitch - note.pitch;
                const x = PITCH_LABEL_WIDTH + note.startStep * pixelsPerStep;
                const y = GRID_TOP + 24 + rowIndex * ROW_HEIGHT + (ROW_HEIGHT - NOTE_HEIGHT) / 2;
                const width = Math.max(note.durationSteps * pixelsPerStep - 4, 8);
                const style = ACTIVE_LAYER_STYLES[note.layer];
                const isSelected = note.id === selectedNoteId;

                return (
                  <g key={note.id}>
                    <rect
                      x={x + 2}
                      y={y}
                      width={width}
                      height={NOTE_HEIGHT}
                      rx="4"
                      fill={style.fill}
                      stroke={isSelected ? "rgba(255,255,255,0.98)" : style.stroke}
                      strokeWidth={isSelected ? "1.8" : "1.2"}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        const position = getPointerPosition(event);

                        if (!position) {
                          return;
                        }

                        setSelectedNoteId(note.id);
                        setDragState({
                          kind: "move",
                          noteId: note.id,
                          pointerId: event.pointerId,
                          stepOffset: getStepFromPointer(position.gridX, pixelsPerStep, editableLoop.totalSteps) - note.startStep,
                          pitchOffset: note.pitch - getPitchFromPointer(position.gridY, ROW_HEIGHT, model.maxPitch, rows.length),
                        });
                      }}
                      style={{ cursor: "grab" }}
                    />
                    <rect
                      x={x + 2 + Math.max(width - RESIZE_HANDLE_WIDTH, 0)}
                      y={y}
                      width={Math.min(RESIZE_HANDLE_WIDTH, width)}
                      height={NOTE_HEIGHT}
                      rx="3"
                      fill={isSelected ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.28)"}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        setSelectedNoteId(note.id);
                        setDragState({
                          kind: "resize",
                          noteId: note.id,
                          pointerId: event.pointerId,
                          startStep: note.startStep,
                        });
                      }}
                      style={{ cursor: "ew-resize" }}
                    />
                    {width >= 28 ? (
                      <text
                        x={x + 8}
                        y={y + NOTE_HEIGHT / 2 + 3}
                        fontSize="9"
                        fill="currentColor"
                        opacity="0.85"
                        pointerEvents="none"
                      >
                        {Note.pitchClass(note.pitchName) || note.pitchName}
                      </text>
                    ) : null}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
