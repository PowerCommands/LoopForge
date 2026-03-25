import { ArrangementPanel } from "./ArrangementPanel";
import { SavedLoopsPanel } from "./SavedLoopsPanel";
import type { SavedLoop } from "../music/types";

interface RightSidebarProps {
  savedLoops: SavedLoop[];
  arrangementName: string;
  arrangementUrl: string;
  isEditingArrangement: boolean;
  onRename: (id: string, name: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onRemove: (id: string) => void;
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
      <SavedLoopsPanel savedLoops={props.savedLoops} onPlayLoop={props.onPlayLoop} />
      <ArrangementPanel
        savedLoops={props.savedLoops}
        arrangementName={props.arrangementName}
        arrangementUrl={props.arrangementUrl}
        isEditingArrangement={props.isEditingArrangement}
        onRename={props.onRename}
        onMoveUp={props.onMoveUp}
        onMoveDown={props.onMoveDown}
        onRemove={props.onRemove}
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
