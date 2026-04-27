"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

export type PerformanceMode = "full" | "balanced" | "lite";

type AdaptiveMotionState = {
  performanceMode: PerformanceMode;
  canHover: boolean;
  supportsFinePointer: boolean;
};

const resolvePerformanceMode = (): PerformanceMode => {
  if (typeof document !== "undefined") {
    const mode = document.documentElement.dataset.performanceMode;
    if (mode === "full" || mode === "balanced" || mode === "lite") {
      return mode;
    }
  }

  if (typeof navigator === "undefined") {
    return "full";
  }

  const navigatorWithHints = navigator as Navigator & {
    deviceMemory?: number;
    connection?: {
      saveData?: boolean;
      effectiveType?: string;
    };
  };

  const deviceMemory = navigatorWithHints.deviceMemory;
  const connection = navigatorWithHints.connection;
  const lowMemory = typeof deviceMemory === "number" && deviceMemory <= 4;
  const lowCpu = typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency <= 4;

  if (lowMemory || lowCpu || connection?.saveData || /2g/.test(connection?.effectiveType ?? "")) {
    return "lite";
  }

  return "full";
};

const resolveAdaptiveMotionState = (): AdaptiveMotionState => {
  const performanceMode = resolvePerformanceMode();

  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return {
      performanceMode,
      canHover: false,
      supportsFinePointer: false,
    };
  }

  return {
    performanceMode,
    canHover: window.matchMedia("(hover: hover)").matches,
    supportsFinePointer: window.matchMedia("(pointer: fine)").matches,
  };
};

const isSameAdaptiveMotionState = (current: AdaptiveMotionState, next: AdaptiveMotionState) => {
  return (
    current.performanceMode === next.performanceMode &&
    current.canHover === next.canHover &&
    current.supportsFinePointer === next.supportsFinePointer
  );
};

export function useAdaptiveMotion() {
  const reducedMotion = useReducedMotion();
  const [adaptiveMotionState, setAdaptiveMotionState] = useState<AdaptiveMotionState>(() => resolveAdaptiveMotionState());

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const syncAdaptiveMotionState = () => {
      const nextState = resolveAdaptiveMotionState();

      setAdaptiveMotionState((currentState) => {
        return isSameAdaptiveMotionState(currentState, nextState) ? currentState : nextState;
      });
    };

    const hoverQuery = window.matchMedia("(hover: hover)");
    const finePointerQuery = window.matchMedia("(pointer: fine)");
    const queries = [hoverQuery, finePointerQuery];

    const addListener = (query: MediaQueryList, listener: () => void) => {
      if (typeof query.addEventListener === "function") {
        query.addEventListener("change", listener);
      } else {
        query.addListener(listener);
      }
    };

    const removeListener = (query: MediaQueryList, listener: () => void) => {
      if (typeof query.removeEventListener === "function") {
        query.removeEventListener("change", listener);
      } else {
        query.removeListener(listener);
      }
    };

    queries.forEach((query) => addListener(query, syncAdaptiveMotionState));

    const observer = new MutationObserver(syncAdaptiveMotionState);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-performance-mode"],
    });

    syncAdaptiveMotionState();

    return () => {
      queries.forEach((query) => removeListener(query, syncAdaptiveMotionState));
      observer.disconnect();
    };
  }, []);

  const prefersReducedMotion = Boolean(reducedMotion);
  const allowRichMotion = !prefersReducedMotion && adaptiveMotionState.performanceMode === "full";
  const allowHoverMotion =
    allowRichMotion &&
    adaptiveMotionState.canHover &&
    adaptiveMotionState.supportsFinePointer;

  return {
    performanceMode: adaptiveMotionState.performanceMode,
    prefersReducedMotion,
    canHover: adaptiveMotionState.canHover,
    supportsFinePointer: adaptiveMotionState.supportsFinePointer,
    allowRichMotion,
    allowHoverMotion,
    allowEntranceMotion: allowRichMotion,
    smoothScrollEnabled: allowHoverMotion,
  };
}
