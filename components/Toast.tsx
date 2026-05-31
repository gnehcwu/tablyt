import { useEffect, useState } from "react";
import type { ToastData } from "@/hooks/useToast";
import { cn } from "@/lib/utils";
import "@/assets/tailwind.css";

interface ToastProps {
  toast: ToastData | null;
}

// A single status toast pinned to the bottom-center of the palette card.
// Presence is managed locally so the exit animation can play after the parent
// clears `toast`: we keep rendering the last value until the close transition
// finishes. CSS transitions (not keyframes) keep rapid re-fires smooth.
function Toast({ toast }: ToastProps) {
  const [render, setRender] = useState<ToastData | null>(toast);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (toast) {
      // New toast (or a swap): mount its content, then open on the next frame
      // so the closed → open transition actually runs.
      setRender(toast);
      const raf = requestAnimationFrame(() => setOpen(true));
      return () => cancelAnimationFrame(raf);
    }
    // Cleared by the parent → play the exit transition; unmount on its end.
    setOpen(false);
  }, [toast]);

  if (!render) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[70px] z-20 flex justify-center px-4">
      <div
        role="status"
        aria-live="polite"
        data-state={open ? "open" : "closed"}
        onTransitionEnd={() => {
          if (!open) setRender(null);
        }}
        className={cn(
          "flex items-center gap-x-2 rounded-full border px-3.5 py-2 font-mono text-xs",
          "border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900",
          "text-neutral-900 dark:text-neutral-100",
          "shadow-[0_10px_34px_-8px_rgba(0,0,0,0.35),0_2px_8px_-4px_rgba(0,0,0,0.2)]",
          "origin-bottom will-change-[transform,opacity]",
          "transition-[opacity,transform] [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]",
          // Asymmetric: enter is a touch slower than the snappy exit.
          "data-[state=open]:duration-[280ms] data-[state=closed]:duration-[180ms]",
          "data-[state=closed]:opacity-0 data-[state=open]:opacity-100",
          "data-[state=closed]:translate-y-2 data-[state=open]:translate-y-0",
          "data-[state=closed]:scale-95 data-[state=open]:scale-100",
          // Reduced motion: fade only, no movement.
          "motion-reduce:transition-opacity motion-reduce:translate-y-0! motion-reduce:scale-100!"
        )}
      >
        {render.icon && (
          <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center text-neutral-500 dark:text-neutral-400">
            {render.icon}
          </span>
        )}
        <span className="leading-none">{render.message}</span>
      </div>
    </div>
  );
}

export default Toast;
