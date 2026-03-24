import { LoopVisualization } from "./LoopVisualization";
import { LoopSummary } from "./LoopSummary";
import { PlaceholderCard } from "./PlaceholderCard";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import type { GeneratedLoop } from "../music/types";

interface MainWorkspaceProps {
  loop: GeneratedLoop | null;
}

export function MainWorkspace({ loop }: MainWorkspaceProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/70 bg-white/35 pb-3 dark:bg-white/5">
        <CardTitle>Current Loop</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 px-5 pb-5 pt-4 xl:grid-cols-[minmax(300px,360px)_minmax(0,1fr)]">
        <LoopSummary loop={loop} />
        <div className="flex flex-col gap-5">
          <LoopVisualization loop={loop} />
          <PlaceholderCard
            title="Layer Inspection Placeholder"
            description="Per-layer controls, note density previews, and detailed musical inspection will appear here later."
            className="min-h-[180px] dark:bg-[#17152d]"
          />
        </div>
      </CardContent>
    </Card>
  );
}
