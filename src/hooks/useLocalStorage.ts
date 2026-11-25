import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

function resolveInitialValue<T>(initialValue: T | (() => T)): T {
  return typeof initialValue === "function"
    ? (initialValue as () => T)()
    : initialValue;
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T | (() => T),
): [T, Dispatch<SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return resolveInitialValue(initialValue);
    }

    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) {
        return JSON.parse(raw) as T;
      }
    } catch {
      // Fallback to initialValue if stored JSON is corrupted or storage is blocked.
    }

    return resolveInitialValue(initialValue);
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch {
      // Ignore write failures (e.g. quota exceeded or private mode restrictions).
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}
