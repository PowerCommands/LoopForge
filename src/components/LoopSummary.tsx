import type { GeneratedLoop } from "../music/types";

interface LoopSummaryProps {
  loop: GeneratedLoop | null;
  compact?: boolean;
}

export function LoopSummary({ loop, compact = false }: LoopSummaryProps) {
  if (!loop) {
    return (
      <section className="rounded-lg border border-dashed border-border bg-white/50 p-4 dark:bg-[#17152d]">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Current Loop</p>
        <p className="m-0 text-sm text-muted-foreground">
          Generate a loop to preview the structure before exporting it to MIDI.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-white/55 p-4 dark:bg-[#17152d]">
      <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Current Loop</p>
      <p className="mb-2 text-base font-semibold text-foreground">
        Key / Scale: {loop.settings.key} {loop.settings.scale}
      </p>
      <ul className={`m-0 text-sm text-muted-foreground ${compact ? "space-y-1.5 pl-5" : "space-y-2 pl-5"}`}>
        <li>Tempo: {loop.settings.tempo} BPM</li>
        <li>Section: {formatSectionLabel(loop.settings.section)}</li>
        <li>
          Chord progression:{" "}
          {loop.chords.length > 0
            ? loop.chords.map((chord) => chord.symbol.split(" ")[0]).join(" - ")
            : "No chords enabled"}
        </li>
        <li>Length: {loop.settings.length} bars</li>
        <li>
          Sequence: {loop.settings.sequence.patternLength} steps, {loop.settings.sequence.density} density,{" "}
          {loop.settings.sequence.variation} variation, {loop.settings.sequence.evolution} evolution, {loop.settings.sequence.style},{" "}
          {loop.settings.sequence.groove} groove,{" "}
          {loop.settings.sequence.register} register
        </li>
      </ul>
    </section>
  );
}

function formatSectionLabel(section: GeneratedLoop["settings"]["section"]): string {
  return section.charAt(0).toUpperCase() + section.slice(1);
}
