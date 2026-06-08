"use client";

import { useEffect } from "react";
import { requestFlush } from "@/lib/queue/enqueue";

/**
 * Drains the offline upload queue whenever the app is open and the network is
 * available: once on mount and again every time connectivity returns. The
 * Service Worker handles the app-closed case via Background Sync.
 */
export function QueueFlusher() {
  useEffect(() => {
    void requestFlush();
    const onOnline = () => void requestFlush();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);
  return null;
}
