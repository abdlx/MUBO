"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const storageKey = (id: string) => `mubo-scroll:${id}`;
type Position = { y: number; rails: Record<string, number> };

export default function ScrollRestoration() {
  const pathname = usePathname();
  const currentId = useRef<string | null>(null);
  const pendingId = useRef<string | null>(null);
  const restoreTimer = useRef<number | null>(null);

  useEffect(() => {
    const originalRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    function ensureId() {
      const state = (window.history.state ?? {}) as Record<string, unknown>;
      if (typeof state.muboScrollId === "string") return state.muboScrollId;
      const id = crypto.randomUUID();
      window.history.replaceState({ ...state, muboScrollId: id }, "", window.location.href);
      return id;
    }
    function save(id?: string | null) {
      if (pendingId.current) return;
      const targetId = id ?? ensureId();
      currentId.current = targetId;
      const rails: Record<string, number> = {};
      document.querySelectorAll<HTMLElement>("[data-scroll-restore]").forEach(element => {
        const key = element.dataset.scrollRestore;
        if (key) rails[key] = element.scrollLeft;
      });
      try { sessionStorage.setItem(storageKey(targetId), JSON.stringify({ y: window.scrollY, rails } satisfies Position)); } catch {}
    }
    function restore(id: string) {
      if (restoreTimer.current !== null) window.clearTimeout(restoreTimer.current);
      let position: Position = { y: 0, rails: {} };
      try {
        const stored = sessionStorage.getItem(storageKey(id));
        if (stored) position = stored.startsWith("{") ? JSON.parse(stored) as Position : { y: Number(stored) || 0, rails: {} };
      } catch {}
      let attempts = 0;
      const tick = () => {
        if (pendingId.current !== id) return;
        window.scrollTo({ top: position.y, behavior: "instant" });
        let railsReady = true;
        for (const [key, left] of Object.entries(position.rails)) {
          const element = [...document.querySelectorAll<HTMLElement>("[data-scroll-restore]")].find(item => item.dataset.scrollRestore === key);
          if (!element) { railsReady = false; continue; }
          element.scrollLeft = left;
          if (Math.abs(element.scrollLeft - left) > 2) railsReady = false;
        }
        if ((Math.abs(window.scrollY - position.y) < 2 && railsReady) || attempts++ > 60) { pendingId.current = null; return; }
        restoreTimer.current = window.setTimeout(tick, 70);
      };
      restoreTimer.current = window.setTimeout(tick, 100);
    }
    currentId.current = ensureId();
    let saveTimer: number | null = null;
    const onScroll = () => {
      if (pendingId.current || saveTimer !== null) return;
      saveTimer = window.setTimeout(() => { saveTimer = null; save(); }, 220);
    };
    const onLeave = () => save();
    const onBeforePush = () => save();
    const onAfterPush = () => { currentId.current = ensureId(); save(); };
    const onPopState = (event: PopStateEvent) => {
      save(currentId.current);
      const state = (event.state ?? {}) as Record<string, unknown>;
      const id = typeof state.muboScrollId === "string" ? state.muboScrollId : ensureId();
      currentId.current = id;
      pendingId.current = id;
      restore(id);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("scroll", onScroll, true);
    window.addEventListener("popstate", onPopState);
    window.addEventListener("pagehide", onLeave);
    document.addEventListener("click", onLeave, true);
    document.addEventListener("mubo:before-push", onBeforePush);
    document.addEventListener("mubo:after-push", onAfterPush);
    return () => {
      save();
      window.history.scrollRestoration = originalRestoration;
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("pagehide", onLeave);
      document.removeEventListener("click", onLeave, true);
      document.removeEventListener("mubo:before-push", onBeforePush);
      document.removeEventListener("mubo:after-push", onAfterPush);
      if (saveTimer !== null) window.clearTimeout(saveTimer);
      if (restoreTimer.current !== null) window.clearTimeout(restoreTimer.current);
    };
  }, []);

  useEffect(() => {
    const state = (window.history.state ?? {}) as Record<string, unknown>;
    if (typeof state.muboScrollId !== "string") {
      const id = crypto.randomUUID();
      window.history.replaceState({ ...state, muboScrollId: id }, "", window.location.href);
      currentId.current = id;
    } else currentId.current = state.muboScrollId;
  }, [pathname]);

  return null;
}
