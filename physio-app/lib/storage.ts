"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { CheckIn } from "./types";

const STORAGE_KEY = "rrt.checkins.v1";
const REGION_KEY = "rrt.activeRegion.v1";

// Minimal external-store wrapper around localStorage so reads happen during
// render (via useSyncExternalStore) instead of in an effect, and writes from
// this tab notify subscribers immediately (localStorage's own "storage"
// event only fires in *other* tabs).
function createLocalStorageStore<T>(key: string, defaultValue: T) {
  let cache: T | undefined;
  const listeners = new Set<() => void>();

  function read(): T {
    if (typeof window === "undefined") return defaultValue;
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  function getSnapshot(): T {
    if (cache === undefined) cache = read();
    return cache;
  }

  function set(value: T) {
    cache = value;
    window.localStorage.setItem(key, JSON.stringify(value));
    listeners.forEach((l) => l());
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function getServerSnapshot(): T {
    return defaultValue;
  }

  return { getSnapshot, getServerSnapshot, subscribe, set };
}

const checkInsStore = createLocalStorageStore<CheckIn[]>(STORAGE_KEY, []);
const regionStore = createLocalStorageStore<string | null>(REGION_KEY, null);

export function useCheckIns(regionId: string) {
  const all = useSyncExternalStore(
    checkInsStore.subscribe,
    checkInsStore.getSnapshot,
    checkInsStore.getServerSnapshot
  );

  const entries = useMemo(() => all.filter((e) => e.regionId === regionId), [all, regionId]);

  const addEntry = useCallback((entry: Omit<CheckIn, "id" | "createdAt">) => {
    const newEntry: CheckIn = {
      ...entry,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    checkInsStore.set([newEntry, ...checkInsStore.getSnapshot()]);
  }, []);

  const updateEntry = useCallback((id: string, patch: Partial<CheckIn>) => {
    checkInsStore.set(
      checkInsStore.getSnapshot().map((e) => (e.id === id ? { ...e, ...patch } : e))
    );
  }, []);

  const deleteEntry = useCallback((id: string) => {
    checkInsStore.set(checkInsStore.getSnapshot().filter((e) => e.id !== id));
  }, []);

  return { entries, addEntry, updateEntry, deleteEntry };
}

export function useActiveRegion(defaultRegion: string) {
  const stored = useSyncExternalStore(
    regionStore.subscribe,
    regionStore.getSnapshot,
    regionStore.getServerSnapshot
  );

  const select = useCallback((id: string) => {
    regionStore.set(id);
  }, []);

  return { regionId: stored ?? defaultRegion, select };
}
