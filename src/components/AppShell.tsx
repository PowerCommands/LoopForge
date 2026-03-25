import type { ReactNode } from "react";
import { cn } from "../lib/utils";

interface AppShellProps {
  topBar: ReactNode;
  content?: ReactNode;
  leftSidebar: ReactNode;
  mainWorkspace: ReactNode;
  rightSidebar: ReactNode;
  className?: string;
}

export function AppShell({ topBar, content, leftSidebar, mainWorkspace, rightSidebar, className }: AppShellProps) {
  return (
    <main className={cn("flex min-h-screen flex-col", className)}>
      {topBar}
      <div className="mx-auto flex w-[90%] flex-1 flex-col py-5">
        {content ? (
          <section className="min-w-0">{content}</section>
        ) : (
          <div className="grid flex-1 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(360px,3fr)]">
            <section className="min-w-0">
              <div className="flex flex-col gap-6">
                {leftSidebar}
                {mainWorkspace}
              </div>
            </section>
            <aside className="min-w-0">
              {rightSidebar}
            </aside>
          </div>
        )}
      </div>
      <footer className="border-t border-border/80 bg-white/30 px-[5%] py-4 text-sm text-muted-foreground backdrop-blur-xl dark:bg-black/10">
        <div className="flex flex-col gap-1">
          <p className="m-0">Loop Forge Version 1.0.0 developed by PainKiller Productions</p>
          <p className="m-0">
            Github:{" "}
            <a
              href="https://github.com/PowerCommands/LoopForge"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4"
            >
              https://github.com/PowerCommands/LoopForge
            </a>
          </p>
        </div>
      </footer>
    </main>
  );
}
