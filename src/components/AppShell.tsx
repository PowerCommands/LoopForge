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
    <main className={cn("min-h-screen", className)}>
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
    </main>
  );
}
