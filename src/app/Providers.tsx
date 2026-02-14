"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode, JSX } from "react";
import { useEffect, useState } from "react";
import { TracksContext, STORAGE_KEY, type TracksContextValue } from "../hooks/useTracks";
import { defaultTracks, type Track } from "../data/tracks";

function TracksProvider({ children }: { children: ReactNode }): JSX.Element {
  const [tracksState, setTracksState] = useState<Track[]>(defaultTracks);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setTracksState(parsed as Track[]);
      }
    } catch {
      // ignore parse errors and fall back to defaults
    }
  }, []);

  // Persist whenever tracks change
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tracksState));
    } catch {
      // ignore storage errors
    }
  }, [tracksState]);

  // Listen for changes from other tabs/pages using the same storage key
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      try {
        if (!event.newValue) return;
        const parsed = JSON.parse(event.newValue);
        if (Array.isArray(parsed)) {
          setTracksState(parsed as Track[]);
        }
      } catch {
        // ignore parse issues
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const setTracks = (tracks: Track[]) => {
    setTracksState(tracks);
  };

  const updateTrack: TracksContextValue["updateTrack"] = (
    index,
    updated
  ) => {
    setTracksState((prev) =>
      prev.map((track, i) => (i === index ? { ...track, ...updated } : track))
    );
  };

  const addTrack: TracksContextValue["addTrack"] = (partial) => {
    setTracksState((prev) => [
      ...prev,
      {
        ...defaultTracks[0],
        id: partial?.id ?? `custom-${Date.now()}`,
        title: partial?.title ?? "New category",
        description:
          partial?.description ?? "Short description for this learning block.",
        tag: partial?.tag ?? "Custom",
        levels: partial?.levels ?? ["Level 1", "Level 2"],
        image: partial?.image,
        videoUrl: partial?.videoUrl,
        thumbnailUrl: partial?.thumbnailUrl,
        titleClassName: partial?.titleClassName ?? "text-2xl",
        popular: partial?.popular ?? false,
      },
    ]);
  };

  const removeTrack: TracksContextValue["removeTrack"] = (index) => {
    setTracksState((prev) => prev.filter((_, i) => i !== index));
  };

  const value: TracksContextValue = {
    tracks: tracksState,
    setTracks,
    updateTrack,
    addTrack,
    removeTrack,
  };

  return (
    <TracksContext.Provider value={value}>{children}</TracksContext.Provider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <TracksProvider>{children}</TracksProvider>
    </SessionProvider>
  );
}
