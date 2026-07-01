"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const prefetchRoutes = [
  "/",
  "/about",
  "/courses",
  "/books",
  "/notes",
  "/join",
  "/login",
  "/student/dashboard",
  "/test-series",
  "/question-papers",
  "/terms-and-conditions",
  "/privacy-policy",
  "/refund-policy",
];

function isPlainLeftClick(event: MouseEvent) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

export default function RouteTransition() {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const windowWithIdle = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    const prefetch = () => {
      prefetchRoutes.forEach((route) => {
        router.prefetch(route);
      });
    };

    if (typeof windowWithIdle.requestIdleCallback === "function") {
      const handle = windowWithIdle.requestIdleCallback(prefetch);
      return () => windowWithIdle.cancelIdleCallback?.(handle);
    }

    const handle = window.setTimeout(prefetch, 350);
    return () => window.clearTimeout(handle);
  }, [router]);

  useEffect(() => {
    const prefetched = new Set<string>();

    const prefetchAnchor = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target || anchor.hasAttribute("download")) {
        return;
      }

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname.startsWith("/api/")) {
        return;
      }

      const route = `${url.pathname}${url.search}`;
      if (prefetched.has(route)) {
        return;
      }

      prefetched.add(route);
      router.prefetch(route);
    };

    document.addEventListener("mouseover", prefetchAnchor, true);
    document.addEventListener("focusin", prefetchAnchor, true);
    document.addEventListener("touchstart", prefetchAnchor, { capture: true, passive: true });

    return () => {
      document.removeEventListener("mouseover", prefetchAnchor, true);
      document.removeEventListener("focusin", prefetchAnchor, true);
      document.removeEventListener("touchstart", prefetchAnchor, true);
    };
  }, [router]);

  useEffect(() => {
    const handle = window.setTimeout(() => setPending(false), 0);
    return () => window.clearTimeout(handle);
  }, [pathname]);

  useEffect(() => {
    let timeoutId: number | null = null;

    const clearPendingLater = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }

      timeoutId = window.setTimeout(() => setPending(false), 2200);
    };

    const handleClick = (event: MouseEvent) => {
      if (!isPlainLeftClick(event) || event.defaultPrevented) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target || anchor.hasAttribute("download")) {
        return;
      }

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) {
        return;
      }

      const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const next = `${url.pathname}${url.search}${url.hash}`;
      if (current === next || (url.pathname === window.location.pathname && url.hash)) {
        return;
      }

      setPending(true);
      clearPendingLater();
    };

    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  return <div aria-hidden="true" className={`site-route-progress${pending ? " is-active" : ""}`} />;
}
