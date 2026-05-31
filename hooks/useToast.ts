import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

export interface ToastData {
  // Bumped on every show so the Toast component can reset its timers/animation
  // even when the same message fires twice in a row.
  id: number;
  message: string;
  icon?: ReactNode;
}

// A single, replace-in-place toast. Operations in the palette are infrequent
// and one-at-a-time, so a stack would be noise — a new toast simply supersedes
// the current one and resets the dismiss timer.
export default function useToast(duration = 2200) {
  const [toast, setToast] = useState<ToastData | null>(null);
  const timer = useRef<number | null>(null);
  const idRef = useRef(0);

  const clear = () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const showToast = useCallback(
    (message: string, icon?: ReactNode) => {
      clear();
      setToast({ id: ++idRef.current, message, icon });
      timer.current = window.setTimeout(() => setToast(null), duration);
    },
    [duration]
  );

  useEffect(() => clear, []);

  return { toast, showToast };
}
