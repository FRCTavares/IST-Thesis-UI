import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

interface PanelShellProps {
  title?: string;
  action?: ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  children: ReactNode;
}

export function PanelShell({
  title,
  action,
  className,
  headerClassName,
  contentClassName,
  children,
}: PanelShellProps) {
  return (
    <section
      className={cn(
        "panel-shell rounded-lg border border-zinc-700/80 bg-zinc-800/70",
        className,
      )}
    >
      {(title || action) && (
        <div
          className={cn(
            "panel-shell-header flex h-8 items-center justify-between gap-2 border-b border-zinc-700/70 px-2.5 lg:h-10 lg:px-3",
            headerClassName,
          )}
        >
          {title ? (
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] leading-none text-zinc-400 lg:text-[11px]">
              {title}
            </div>
          ) : (
            <span />
          )}
          {action}
        </div>
      )}
      <div className={cn("panel-shell-content p-2 lg:p-3", contentClassName)}>
        {children}
      </div>
    </section>
  );
}
