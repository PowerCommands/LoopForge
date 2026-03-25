import { ArrangementPanel } from "./ArrangementPanel";
import type { SavedLoop } from "../music/types";

interface RightSidebarProps {
  savedLoops: SavedLoop[];
  arrangementName: string;
  arrangementUrl: string;
  isEditingArrangement: boolean;
  onRename: (id: string, name: string) => void;
  onReorder: (sourceId: string, targetId: string) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
  onPlayLoop: (savedLoop: SavedLoop) => void;
  onArrangementNameChange: (name: string) => void;
  onArrangementUrlChange: (url: string) => void;
  onPlayArrangement: () => void;
  onStopArrangement: () => void;
  onSaveArrangement: () => void;
}

export function RightSidebar(props: RightSidebarProps) {
  return (
    <div className="flex flex-col gap-4">
      <ArrangementPanel
        savedLoops={props.savedLoops}
        arrangementName={props.arrangementName}
        arrangementUrl={props.arrangementUrl}
        isEditingArrangement={props.isEditingArrangement}
        onRename={props.onRename}
        onReorder={props.onReorder}
        onRemove={props.onRemove}
        onClearAll={props.onClearAll}
        onPlayLoop={props.onPlayLoop}
        onArrangementNameChange={props.onArrangementNameChange}
        onArrangementUrlChange={props.onArrangementUrlChange}
        onPlayArrangement={props.onPlayArrangement}
        onStopArrangement={props.onStopArrangement}
        onSaveArrangement={props.onSaveArrangement}
      />
    </div>
  );
}
