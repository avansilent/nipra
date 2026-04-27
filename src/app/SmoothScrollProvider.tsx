"use client";

import type { ReactNode } from "react";
import Lenis from "lenis";
import { useEffect } from "react";
import { useAdaptiveMotion } from "../hooks/useAdaptiveMotion";

type SmoothScrollProviderProps = {
  children: ReactNode;
};

export function SmoothScrollProvider({ children }: SmoothScrollProviderProps) {
  const { performanceMode, smoothScrollEnabled } = useAdaptiveMotion();

  useEffect(() => {
    if (!smoothScrollEnabled) {
      return;
    }

    const isBalancedMotion = performanceMode === "balanced";

    const lenis = new Lenis({
      autoRaf: false,
      smoothWheel: true,
      syncTouch: false,
      wheelMultiplier: isBalancedMotion ? 0.88 : 0.94,
      touchMultiplier: 1,
      lerp: isBalancedMotion ? 0.12 : 0.15,
    });

    let frameId = 0;

    const raf = (time: number) => {
      lenis.raf(time);
      frameId = window.requestAnimationFrame(raf);
    };

    const stopLoop = () => {
      if (!frameId) {
        return;
      }

      window.cancelAnimationFrame(frameId);
      frameId = 0;
    };

    const startLoop = () => {
      if (frameId) {
        return;
      }

      frameId = window.requestAnimationFrame(raf);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopLoop();
        return;
      }

      startLoop();
    };

    startLoop();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      stopLoop();
      lenis.destroy();
    };
  }, [performanceMode, smoothScrollEnabled]);

  return <>{children}</>;
}