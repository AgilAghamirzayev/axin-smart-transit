"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export function useLiveData<T>(path: string | null, authorization?: string, intervalMs = 3000) {
  const [state, setState] = useState<{ data?: T; error?: string; updatedAt?: Date }>({});
  useEffect(() => {
    if (!path) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    let controller: AbortController;
    let succeeded = false;
    async function poll() {
      controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const data = await api<T>(path!, {
          headers: authorization ? { Authorization: authorization } : {},
          signal: controller.signal,
        });
        if (!disposed) setState({ data, updatedAt: new Date() });
        succeeded = true;
      } catch (error) {
        if (!disposed) setState(previous => ({ ...previous, error: error instanceof Error ? error.message : "Bağlantı xətası" }));
      } finally {
        clearTimeout(timeout);
        if (!disposed && (intervalMs > 0 || !succeeded)) timer = setTimeout(poll, intervalMs || 3000);
      }
    }
    // Clear an old route's snapshot before requesting the newly selected route.
    setState({});
    void poll();
    return () => { disposed = true; clearTimeout(timer); controller?.abort(); };
  }, [path, authorization, intervalMs]);
  return state;
}
