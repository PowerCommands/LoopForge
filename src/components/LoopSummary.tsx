import type { GeneratedLoop } from "../music/types";

interface LoopSummaryProps {
  loop: GeneratedLoop | null;
}

export function LoopSummary({ loop }: LoopSummaryProps) {
  if (!loop) {
    return (
      <section className="panel">
        <h2>Current Loop</h2>
        <p className="muted">Generate a loop to preview the structure before exporting it to MIDI.</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <h2>Current Loop</h2>
      <p className="summary-title">Key / Scale: {loop.settings.key} {loop.settings.scale}</p>
      <ul className="summary-list">
        <li>Tempo: {loop.settings.tempo} BPM</li>
        <li>
          Chord progression:{" "}
          {loop.chords.length > 0
            ? loop.chords.map((chord) => chord.symbol.split(" ")[0]).join(" - ")
            : "No chords enabled"}
        </li>
        <li>Length: {loop.settings.length} bars</li>
      </ul>
    </section>
  );
}
