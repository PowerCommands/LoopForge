import { LoopVisualization } from "./LoopVisualization";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import type { GeneratedLoop } from "../music/types";
import type { EditableLoop } from "../music/editor";

interface MainWorkspaceProps {
  loop: GeneratedLoop | null;
  editableLoop: EditableLoop | null;
  onLoopChange: (loop: EditableLoop) => void;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  onTranspose: (semitones: number) => void;
  onSave: () => void;
  onAdd: () => void;
  canUndo: boolean;
  canRedo: boolean;
  hasUnsavedChanges: boolean;
}

export function MainWorkspace({
  loop,
  editableLoop,
  onLoopChange,
  onUndo,
  onRedo,
  onReset,
  onTranspose,
  onSave,
  onAdd,
  canUndo,
  canRedo,
  hasUnsavedChanges,
}: MainWorkspaceProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/70 bg-white/35 pb-3 dark:bg-white/5">
        <CardTitle>Current Loop</CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5 pt-4">
        <LoopVisualization
          loop={loop}
          editableLoop={editableLoop}
          onLoopChange={onLoopChange}
          onUndo={onUndo}
          onRedo={onRedo}
          onReset={onReset}
          onTranspose={onTranspose}
          onSave={onSave}
          onAdd={onAdd}
          canUndo={canUndo}
          canRedo={canRedo}
          hasUnsavedChanges={hasUnsavedChanges}
        />
      </CardContent>
    </Card>
  );
}
