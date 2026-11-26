import { useCallback, useEffect, useRef, useState } from "react";
import type { Application } from "../types";

const DEFAULT_UNDO_DURATION_MS = 5000;

interface UseUndoDeleteResult {
  pendingDeleted: Application | null;
  secondsRemaining: number;
  scheduleUndo: (application: Application) => void;
  triggerUndo: () => Application | null;
  dismissUndo: () => void;
}

export function useUndoDelete(
  durationMs = DEFAULT_UNDO_DURATION_MS,
): UseUndoDeleteResult {
  const [pendingDeleted, setPendingDeleted] = useState<Application | null>(
    null,
  );
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  const timeoutRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (countdownRef.current !== null) {
      window.clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const dismissUndo = useCallback(() => {
    clearTimers();
    setPendingDeleted(null);
    setSecondsRemaining(0);
  }, [clearTimers]);

  const scheduleUndo = useCallback(
    (application: Application) => {
      // Bersihkan timer lama jika user menghapus 2 lamaran berturut-turut < 5 detik
      clearTimers();

      const totalSeconds = Math.max(1, Math.ceil(durationMs / 1000));
      setPendingDeleted(application);
      setSecondsRemaining(totalSeconds);

      countdownRef.current = window.setInterval(() => {
        setSecondsRemaining((prev) => (prev > 1 ? prev - 1 : 0));
      }, 1000);

      timeoutRef.current = window.setTimeout(() => {
        clearTimers();
        setPendingDeleted(null);
        setSecondsRemaining(0);
      }, durationMs);
    },
    [clearTimers, durationMs],
  );

  const triggerUndo = useCallback((): Application | null => {
    clearTimers();
    const restored = pendingDeleted;
    setPendingDeleted(null);
    setSecondsRemaining(0);
    return restored;
  }, [clearTimers, pendingDeleted]);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  return {
    pendingDeleted,
    secondsRemaining,
    scheduleUndo,
    triggerUndo,
    dismissUndo,
  };
}
