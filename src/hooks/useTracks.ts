"use client";

import { createContext, useContext } from "react";
import type { Track } from "../data/tracks";

export const STORAGE_KEY = "nipra-tracks-v1";

export type TracksContextValue = {
  tracks: Track[];
  setTracks: (tracks: Track[]) => void;
  updateTrack: (index: number, updated: Partial<Track>) => void;
  addTrack: (partial?: Partial<Track>) => void;
  removeTrack: (index: number) => void;
};

export const TracksContext =
  createContext<TracksContextValue | undefined>(undefined);

export function useTracks(): TracksContextValue {
  const ctx = useContext(TracksContext);
  if (!ctx) {
    throw new Error("useTracks must be used within a TracksContext provider");
  }
  return ctx;
}
