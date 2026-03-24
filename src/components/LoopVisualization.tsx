import { useMemo } from "react";
import { Note } from "tonal";
import { mapLoopToVisualization, type VisualizationLayer } from "../lib/loopVisualization";
import type { GeneratedLoop } from "../music/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

interface LoopVisualizationProps {
  loop: GeneratedLoop | null;
}

const LAYER_STYLES: Record<VisualizationLayer, { fill: string; stroke: string; label: string }> = {
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
    fill: "rgba(59, 130, 246, 0.38)",
    stroke: "rgba(96, 165, 250, 0.92)",
    label: "Bass",
  },
};

const PITCH_LABEL_WIDTH = 54;
const GRID_TOP = 10;
const MIN_GRID_WIDTH = 900;
const TARGET_BEAT_WIDTH = 88;
const ROW_HEIGHT = 14;
const NOTE_HEIGHT = 10;

export function LoopVisualization({ loop }: LoopVisualizationProps) {
  const model = useMemo(() => mapLoopToVisualization(loop), [loop]);

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

  if (!loop || !model) {
    return (
      <Card className="min-h-[360px] border-dashed bg-white/45 dark:bg-[#17152d]">
        <CardHeader className="pb-4">
          <CardTitle>Loop Visualization</CardTitle>
          <CardDescription>The generated loop will appear here as a read-only piano roll.</CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-[250px] items-center justify-center pt-0">
          <p className="max-w-md text-center text-sm text-muted-foreground">
            Generate a loop to inspect the note layout across bars, beats, and pitch lanes.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (model.notes.length === 0) {
    return (
      <Card className="min-h-[360px] border-dashed bg-white/45 dark:bg-[#17152d]">
        <CardHeader className="pb-4">
          <CardTitle>Loop Visualization</CardTitle>
          <CardDescription>No active note layers are present in the current loop.</CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-[250px] items-center justify-center pt-0">
          <p className="max-w-md text-center text-sm text-muted-foreground">
            Enable one or more layers and generate again to populate the piano roll view.
          </p>
        </CardContent>
      </Card>
    );
  }

  const preferredGridWidth = model.totalBeats * TARGET_BEAT_WIDTH;
  const gridWidth = Math.max(preferredGridWidth, MIN_GRID_WIDTH);
  const pixelsPerBeat = gridWidth / model.totalBeats;
  const gridHeight = rows.length * ROW_HEIGHT;
  const svgWidth = PITCH_LABEL_WIDTH + gridWidth;
  const svgHeight = GRID_TOP + 24 + gridHeight;

  return (
    <Card className="min-h-[360px] overflow-hidden bg-gradient-to-br from-white/55 to-[#e8e0d1]/70 dark:from-[#1a1834] dark:to-[#1f1a3d]">
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Loop Visualization</CardTitle>
            <CardDescription>Read-only piano roll view of the current generated loop.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {model.activeLayers.map((layer) => (
              <div
                key={layer}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-white/55 px-3 py-1 text-xs font-medium text-foreground dark:bg-white/10"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: LAYER_STYLES[layer].stroke }}
                />
                {LAYER_STYLES[layer].label}
              </div>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-x-auto overflow-y-hidden rounded-md border border-border/80 bg-white/30 p-3 dark:bg-black/10">
          <div className="min-w-full" style={{ width: `${svgWidth}px` }}>
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="block h-auto w-full"
              role="img"
              aria-label="Loop visualization piano roll"
              preserveAspectRatio="xMinYMin meet"
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

              {Array.from({ length: model.totalBeats + 1 }, (_, beat) => {
                const x = PITCH_LABEL_WIDTH + beat * pixelsPerBeat;
                const isBar = beat % 4 === 0;
                const label = beat < model.totalBeats ? `${Math.floor(beat / 4) + 1}.${(beat % 4) + 1}` : "";

                return (
                  <g key={beat}>
                    <line
                      x1={x}
                      y1={GRID_TOP + 24}
                      x2={x}
                      y2={GRID_TOP + 24 + gridHeight}
                      stroke={isBar ? "rgba(129, 140, 248, 0.45)" : "rgba(148, 163, 184, 0.18)"}
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

              {model.notes.map((note) => {
                const rowIndex = model.maxPitch - note.pitch;
                const x = PITCH_LABEL_WIDTH + note.startBeat * pixelsPerBeat;
                const y = GRID_TOP + 24 + rowIndex * ROW_HEIGHT + (ROW_HEIGHT - NOTE_HEIGHT) / 2;
                const width = Math.max(note.durationBeats * pixelsPerBeat - 4, 8);
                const style = LAYER_STYLES[note.layer];

                return (
                  <g key={note.id}>
                    <rect
                      x={x + 2}
                      y={y}
                      width={width}
                      height={NOTE_HEIGHT}
                      rx="4"
                      fill={style.fill}
                      stroke={style.stroke}
                      strokeWidth="1.2"
                    />
                    {width >= 28 ? (
                      <text
                        x={x + 8}
                        y={y + NOTE_HEIGHT / 2 + 3}
                        fontSize="9"
                        fill="currentColor"
                        opacity="0.85"
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
