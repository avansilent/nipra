"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

type DraftEnvelope<T> = {
  version: number;
  updatedAt: number;
  value: T;
};

type PersistentDraftOptions<T> = {
  version?: number;
  maxAgeMs?: number;
  sanitize?: (value: T) => T;
  shouldPersist?: (value: T) => boolean;
};

type PersistentDraftControls<T> = {
  clearDraft: () => void;
  replaceValue: Dispatch<SetStateAction<T>>;
};

const DEFAULT_VERSION = 1;
const DEFAULT_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;
const WRITE_DELAY_MS = 250;

function getLocalStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function resolveInitialValue<T>(initialValue: T | (() => T)): T {
  return typeof initialValue === "function" ? (initialValue as () => T)() : initialValue;
}

export function readPersistentDraft<T>(
  storageKey: string | null,
  options: Pick<PersistentDraftOptions<T>, "version" | "maxAgeMs"> = {}
) {
  if (!storageKey) {
    return null;
  }

  const storage = getLocalStorage();
  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(storageKey);
    if (!raw) {
      return null;
    }

    const envelope = JSON.parse(raw) as Partial<DraftEnvelope<T>>;
    const version = options.version ?? DEFAULT_VERSION;
    const maxAgeMs = options.maxAgeMs ?? DEFAULT_MAX_AGE_MS;
    const updatedAt = typeof envelope.updatedAt === "number" ? envelope.updatedAt : 0;

    if (envelope.version !== version || !updatedAt || Date.now() - updatedAt > maxAgeMs) {
      storage.removeItem(storageKey);
      return null;
    }

    return envelope.value ?? null;
  } catch {
    storage.removeItem(storageKey);
    return null;
  }
}

export function hasPersistentDraft(storageKey: string | null) {
  return readPersistentDraft<unknown>(storageKey) !== null;
}

export function clearPersistentDraft(storageKey: string | null) {
  if (!storageKey) {
    return;
  }

  const storage = getLocalStorage();
  if (!storage) {
    return;
  }

  storage.removeItem(storageKey);
}

export function usePersistentDraft<T>(
  storageKey: string | null,
  initialValue: T | (() => T),
  options: PersistentDraftOptions<T> = {}
): [T, Dispatch<SetStateAction<T>>, PersistentDraftControls<T>] {
  const version = options.version ?? DEFAULT_VERSION;
  const maxAgeMs = options.maxAgeMs ?? DEFAULT_MAX_AGE_MS;
  const sanitizeRef = useRef(options.sanitize);
  const shouldPersistRef = useRef(options.shouldPersist);
  const readyForWritesRef = useRef(Boolean(storageKey));
  const touchedRef = useRef(false);
  const skipNextPersistRef = useRef(false);

  const [value, setValue] = useState<T>(() => {
    const fallback = resolveInitialValue(initialValue);
    const restored = readPersistentDraft<T>(storageKey, { version, maxAgeMs });
    return restored === null ? fallback : restored;
  });

  useEffect(() => {
    sanitizeRef.current = options.sanitize;
    shouldPersistRef.current = options.shouldPersist;
  }, [options.sanitize, options.shouldPersist]);

  useEffect(() => {
    readyForWritesRef.current = false;

    if (!storageKey) {
      return;
    }

    const restoreTimer = window.setTimeout(() => {
      const restored = readPersistentDraft<T>(storageKey, { version, maxAgeMs });
      if (restored !== null) {
        const sanitize = sanitizeRef.current;
        skipNextPersistRef.current = true;
        setValue(sanitize ? sanitize(restored) : restored);
      }
      readyForWritesRef.current = true;
    }, 0);

    return () => window.clearTimeout(restoreTimer);
  }, [maxAgeMs, storageKey, version]);

  const setDraftValue = useCallback<Dispatch<SetStateAction<T>>>((action) => {
    touchedRef.current = true;
    skipNextPersistRef.current = false;
    setValue(action);
  }, []);

  const replaceValue = useCallback<Dispatch<SetStateAction<T>>>((action) => {
    touchedRef.current = false;
    skipNextPersistRef.current = true;
    setValue(action);
  }, []);

  const clearDraft = useCallback(() => {
    clearPersistentDraft(storageKey);
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || !readyForWritesRef.current || !touchedRef.current) {
      return;
    }

    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }

    const writeTimer = window.setTimeout(() => {
      const storage = getLocalStorage();
      if (!storage) {
        return;
      }

      const sanitize = sanitizeRef.current;
      const shouldPersist = shouldPersistRef.current;
      const nextValue = sanitize ? sanitize(value) : value;

      if (shouldPersist && !shouldPersist(nextValue)) {
        storage.removeItem(storageKey);
        return;
      }

      const envelope: DraftEnvelope<T> = {
        version,
        updatedAt: Date.now(),
        value: nextValue,
      };

      try {
        storage.setItem(storageKey, JSON.stringify(envelope));
      } catch {
        // Draft recovery is best-effort and should never block admin work.
      }
    }, WRITE_DELAY_MS);

    return () => window.clearTimeout(writeTimer);
  }, [maxAgeMs, storageKey, value, version]);

  const controls = useMemo(
    () => ({
      clearDraft,
      replaceValue,
    }),
    [clearDraft, replaceValue]
  );

  return [value, setDraftValue, controls];
}
