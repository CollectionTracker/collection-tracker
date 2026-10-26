"use client";

import { createContext, type ReactNode, Suspense, startTransition, use, useCallback, useContext, useState, useSyncExternalStore } from "react";

// Every read goes to the browser's own database (see src/db), so pages load their data here instead of in server
// components. A read is cached by key until the next `refresh()`, which re-runs every read on screen in a transition:
// the old figures stay visible until the new ones are ready.
type Data = { version: number; refresh: () => void };
const DataContext = createContext<Data>({ version: 0, refresh: () => {} });
const cache = new Map<string, Promise<unknown>>();

export function DataProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => {
    cache.clear();
    startTransition(() => setVersion((v) => v + 1));
  }, []);
  return <DataContext value={{ version, refresh }}>{children}</DataContext>;
}

/** Re-read everything on screen after a write to the database. */
export function useRefresh() {
  return useContext(DataContext).refresh;
}

/** The result of `load`, suspending until it resolves. `key` names the read and every argument it depends on. */
export function useData<T>(key: readonly unknown[], load: () => Promise<T>): T {
  const { version } = useContext(DataContext);
  const k = JSON.stringify([version, ...key]);
  let p = cache.get(k) as Promise<T> | undefined;
  if (!p) {
    p = load();
    cache.set(k, p);
    p.catch(() => cache.delete(k)); // a failed read is retried on the next render rather than cached
  }
  return use(p);
}

const noop = () => () => {};

/** True in the browser, false while rendering on the server (or prerendering), where there is no database. */
export function useInBrowser() {
  return useSyncExternalStore(noop, () => true, () => false);
}

/**
 * Renders `children` only in the browser, showing `fallback` on the server and while their reads load. Wrap every
 * component that calls `useData` in one.
 */
export function ClientData({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  return <Suspense fallback={fallback}>{useInBrowser() ? children : fallback}</Suspense>;
}
