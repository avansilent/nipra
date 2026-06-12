"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { AuthProvider } from "./AuthProvider";
import RouteTransition from "./RouteTransition";
import { SmoothScrollProvider } from "./SmoothScrollProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <SmoothScrollProvider>
        <AuthProvider>
          <RouteTransition />
          {children}
        </AuthProvider>
      </SmoothScrollProvider>
    </MotionConfig>
  );
}
