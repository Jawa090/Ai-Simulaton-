import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Polls a REST endpoint at a low frequency for state that isn't already
 * pushed over the WebSocket (spec section 26 asks us to avoid tight
 * polling loops — this is intentionally a multi-second interval, not a
 * fast one, and is only used for slowly-changing list/summary data).
 */
export function usePolling<T>(fetcher: () => Promise<T>, intervalMs = 3000, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const reload = useCallback(() => {
    fetcherRef.current()
      .then((res) => {
        setData(res);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err : new Error(String(err))));
  }, []);

  useEffect(() => {
    reload();
    const id = setInterval(reload, intervalMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, reload, ...deps]);

  return { data, error, reload };
}
