import { Button } from "./ui/button";
import favicon from "../../favicon.svg";
import { useTheme, type Theme } from "./ThemeProvider";
import { Select } from "./ui/select";

type TopBarView = "studio" | "library" | "lyrics" | "settings" | "help";

interface TopBarProps {
  status: string;
  volume: number;
  activeView: TopBarView;
  onVolumeChange: (volume: number) => void;
  onViewChange: (view: TopBarView) => void;
}

export function TopBar({ status, volume, activeView, onVolumeChange, onViewChange }: TopBarProps) {
  const { theme, setTheme } = useTheme();

  return (
    <header className="border-b border-border/80 bg-white/40 backdrop-blur-xl dark:bg-black/15">
      <div className="mx-auto flex w-[90%] items-center justify-between gap-6 py-4">
        <div className="flex items-center gap-4">
          <img
            src={favicon}
            alt=""
            className="h-8 w-8 rounded-full border border-border/80 bg-card/70 object-cover shadow-sm"
          />
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-foreground">Loop Forge</h1>
          <label className="ml-2 flex items-center gap-3 rounded-full border border-border bg-card/70 px-3 py-2 shadow-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-muted-foreground" aria-hidden="true">
              <path d="M11 5 6 9H3v6h3l5 4z" />
              <path d="M15.5 8.5a5 5 0 0 1 0 7" />
            </svg>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(volume * 100)}
              onChange={(event) => onVolumeChange(Number(event.target.value) / 100)}
              aria-label="Volume"
              className="h-1.5 w-28 cursor-pointer accent-primary"
            />
          </label>
          <div className="flex items-center gap-2 rounded-full border border-border bg-card/70 p-1 shadow-sm">
            <Button
              type="button"
              size="sm"
              variant={activeView === "studio" ? "default" : "secondary"}
              onClick={() => onViewChange("studio")}
            >
              Studio
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeView === "library" ? "default" : "secondary"}
              onClick={() => onViewChange("library")}
            >
              Library
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeView === "lyrics" ? "default" : "secondary"}
              onClick={() => onViewChange("lyrics")}
            >
              Lyrics
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeView === "settings" ? "default" : "secondary"}
              onClick={() => onViewChange("settings")}
            >
              Settings
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeView === "help" ? "default" : "secondary"}
              onClick={() => onViewChange("help")}
            >
              Help
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-full border border-border bg-card/70 px-4 py-2 text-sm text-muted-foreground shadow-sm">
            {status}
          </div>
          <label className="flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1.5 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Theme</span>
            <Select
              aria-label="Theme"
              value={theme}
              onChange={(event) => setTheme(event.target.value as Theme)}
              className="h-8 min-w-[110px] border-0 bg-transparent px-2 py-1 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </Select>
          </label>
        </div>
      </div>
    </header>
  );
}
