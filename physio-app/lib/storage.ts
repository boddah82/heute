"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { CheckIn, PDDMAssessment, TrainingPlan, PSFSGoal, PSFSRating } from "./types";

const STORAGE_KEY = "rrt.checkins.v1";
const REGION_KEY = "rrt.activeRegion.v1";
const PDDM_KEY = "rrt.pddm.v1";
const PLAN_KEY = "rrt.plans.v1";
const PSFS_GOALS_KEY = "rrt.psfsGoals.v1";
const PSFS_RATINGS_KEY = "rrt.psfsRatings.v1";

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
const pddmStore = createLocalStorageStore<PDDMAssessment[]>(PDDM_KEY, []);
const planStore = createLocalStorageStore<TrainingPlan[]>(PLAN_KEY, []);
const psfsGoalsStore = createLocalStorageStore<PSFSGoal[]>(PSFS_GOALS_KEY, []);
const psfsRatingsStore = createLocalStorageStore<PSFSRating[]>(PSFS_RATINGS_KEY, []);

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

export function usePDDMAssessments(regionId: string) {
  const all = useSyncExternalStore(
    pddmStore.subscribe,
    pddmStore.getSnapshot,
    pddmStore.getServerSnapshot
  );

  const assessments = useMemo(() => all.filter((a) => a.regionId === regionId), [all, regionId]);

  const addAssessment = useCallback((assessment: Omit<PDDMAssessment, "id" | "createdAt">) => {
    const newAssessment: PDDMAssessment = {
      ...assessment,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    pddmStore.set([newAssessment, ...pddmStore.getSnapshot()]);
  }, []);

  const deleteAssessment = useCallback((id: string) => {
    pddmStore.set(pddmStore.getSnapshot().filter((a) => a.id !== id));
  }, []);

  return { assessments, addAssessment, deleteAssessment };
}

// Ersetzt alle Einträge einer Region durch die übergebenen Demo-Datensätze.
// Bewusst außerhalb eines Hooks: reine Schreiboperation auf die Stores, alle
// über useSyncExternalStore angebundenen Komponenten aktualisieren sich automatisch.
export function seedDemoData(
  regionId: string,
  checkIns: Omit<CheckIn, "id" | "createdAt">[],
  pddm: Omit<PDDMAssessment, "id" | "createdAt">
) {
  const now = new Date().toISOString();

  const newCheckIns: CheckIn[] = checkIns.map((c) => ({
    ...c,
    id: crypto.randomUUID(),
    createdAt: now,
  }));
  const otherCheckIns = checkInsStore.getSnapshot().filter((e) => e.regionId !== regionId);
  checkInsStore.set([...newCheckIns, ...otherCheckIns]);

  const newAssessment: PDDMAssessment = { ...pddm, id: crypto.randomUUID(), createdAt: now };
  const otherAssessments = pddmStore.getSnapshot().filter((a) => a.regionId !== regionId);
  pddmStore.set([newAssessment, ...otherAssessments]);
}

// Roh-Zugriff auf alle Daten (alle Regionen), z. B. für den Export.
export function getAllData(): { checkIns: CheckIn[]; pddm: PDDMAssessment[] } {
  return { checkIns: checkInsStore.getSnapshot(), pddm: pddmStore.getSnapshot() };
}

export function usePlan(regionId: string) {
  const all = useSyncExternalStore(planStore.subscribe, planStore.getSnapshot, planStore.getServerSnapshot);

  const plan = useMemo(() => all.find((p) => p.regionId === regionId), [all, regionId]);

  const setPlan = useCallback((next: TrainingPlan) => {
    const others = planStore.getSnapshot().filter((p) => p.regionId !== next.regionId);
    planStore.set([next, ...others]);
  }, []);

  const clearPlan = useCallback((forRegionId: string) => {
    planStore.set(planStore.getSnapshot().filter((p) => p.regionId !== forRegionId));
  }, []);

  return { plan, setPlan, clearPlan };
}

// Importiert einen von einem Plan-Link gelesenen Plan direkt in den Store
// (außerhalb eines Hooks, analog zu seedDemoData).
export function importPlan(plan: TrainingPlan) {
  const others = planStore.getSnapshot().filter((p) => p.regionId !== plan.regionId);
  planStore.set([plan, ...others]);
}

export function usePSFSGoals(regionId: string) {
  const all = useSyncExternalStore(
    psfsGoalsStore.subscribe,
    psfsGoalsStore.getSnapshot,
    psfsGoalsStore.getServerSnapshot
  );

  const goals = useMemo(() => all.filter((g) => g.regionId === regionId), [all, regionId]);

  const addGoal = useCallback(
    (label: string) => {
      const goal: PSFSGoal = { id: crypto.randomUUID(), regionId, label, createdAt: new Date().toISOString() };
      psfsGoalsStore.set([goal, ...psfsGoalsStore.getSnapshot()]);
    },
    [regionId]
  );

  const deleteGoal = useCallback((id: string) => {
    psfsGoalsStore.set(psfsGoalsStore.getSnapshot().filter((g) => g.id !== id));
    psfsRatingsStore.set(psfsRatingsStore.getSnapshot().filter((r) => r.goalId !== id));
  }, []);

  return { goals, addGoal, deleteGoal };
}

export function usePSFSRatings(regionId: string) {
  const all = useSyncExternalStore(
    psfsRatingsStore.subscribe,
    psfsRatingsStore.getSnapshot,
    psfsRatingsStore.getServerSnapshot
  );

  const ratings = useMemo(() => all.filter((r) => r.regionId === regionId), [all, regionId]);

  const addRating = useCallback(
    (goalId: string, value: number) => {
      const rating: PSFSRating = {
        id: crypto.randomUUID(),
        regionId,
        goalId,
        date: new Date().toISOString().slice(0, 10),
        value,
        createdAt: new Date().toISOString(),
      };
      psfsRatingsStore.set([rating, ...psfsRatingsStore.getSnapshot()]);
    },
    [regionId]
  );

  const deleteRating = useCallback((id: string) => {
    psfsRatingsStore.set(psfsRatingsStore.getSnapshot().filter((r) => r.id !== id));
  }, []);

  return { ratings, addRating, deleteRating };
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
