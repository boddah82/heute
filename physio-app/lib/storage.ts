"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { CheckIn, PDDMAssessment, TrainingPlan, PSFSGoal, PSFSRating, Patient, PatientRecord, HistoryBundle, QuestionnaireResult } from "./types";

const STORAGE_KEY = "rrt.checkins.v1";
const REGION_KEY = "rrt.activeRegion.v1";
const PDDM_KEY = "rrt.pddm.v1";
const PLAN_KEY = "rrt.plans.v1";
const PSFS_GOALS_KEY = "rrt.psfsGoals.v1";
const PSFS_RATINGS_KEY = "rrt.psfsRatings.v1";
const PATIENTS_KEY = "rrt.patients.v1";
const PATIENT_RECORDS_KEY = "rrt.patientRecords.v1";
const QUESTIONNAIRE_RESULTS_KEY = "rrt.questionnaireResults.v1";

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
const patientsStore = createLocalStorageStore<Patient[]>(PATIENTS_KEY, []);
const patientRecordsStore = createLocalStorageStore<PatientRecord[]>(PATIENT_RECORDS_KEY, []);
const questionnaireResultsStore = createLocalStorageStore<QuestionnaireResult[]>(QUESTIONNAIRE_RESULTS_KEY, []);

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

// Kompletter Trackingstand dieses Geräts (alle Regionen), für den
// Verlauf-Link an den Therapeuten (siehe lib/historyLink.ts).
export function buildHistoryBundle(): HistoryBundle {
  return {
    checkIns: checkInsStore.getSnapshot(),
    pddm: pddmStore.getSnapshot(),
    psfsGoals: psfsGoalsStore.getSnapshot(),
    psfsRatings: psfsRatingsStore.getSnapshot(),
    questionnaireResults: questionnaireResultsStore.getSnapshot(),
    exportedAt: new Date().toISOString(),
  };
}

export function useQuestionnaireResults(regionId: string) {
  const all = useSyncExternalStore(
    questionnaireResultsStore.subscribe,
    questionnaireResultsStore.getSnapshot,
    questionnaireResultsStore.getServerSnapshot
  );

  const results = useMemo(() => all.filter((r) => r.regionId === regionId), [all, regionId]);

  const addResult = useCallback(
    (result: Omit<QuestionnaireResult, "id" | "createdAt">) => {
      const newResult: QuestionnaireResult = {
        ...result,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      questionnaireResultsStore.set([newResult, ...questionnaireResultsStore.getSnapshot()]);
    },
    []
  );

  const deleteResult = useCallback((id: string) => {
    questionnaireResultsStore.set(questionnaireResultsStore.getSnapshot().filter((r) => r.id !== id));
  }, []);

  return { results, addResult, deleteResult };
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

// Mandantenverwaltung (Therapeuten-Bereich). Ein Patient hat selbst keine
// Trackingdaten in diesem Store – die kommen per importPatientRecord aus
// einem Verlauf-Link (siehe lib/historyLink.ts).
export function usePatients() {
  const patients = useSyncExternalStore(
    patientsStore.subscribe,
    patientsStore.getSnapshot,
    patientsStore.getServerSnapshot
  );

  const addPatient = useCallback((name: string) => {
    const patient: Patient = { id: crypto.randomUUID(), name, createdAt: new Date().toISOString() };
    patientsStore.set([patient, ...patientsStore.getSnapshot()]);
    return patient;
  }, []);

  const deletePatient = useCallback((id: string) => {
    patientsStore.set(patientsStore.getSnapshot().filter((p) => p.id !== id));
    patientRecordsStore.set(patientRecordsStore.getSnapshot().filter((r) => r.patientId !== id));
  }, []);

  return { patients, addPatient, deletePatient };
}

export function usePatientRecord(patientId: string | null) {
  const all = useSyncExternalStore(
    patientRecordsStore.subscribe,
    patientRecordsStore.getSnapshot,
    patientRecordsStore.getServerSnapshot
  );

  const record = useMemo(() => all.find((r) => r.patientId === patientId), [all, patientId]);

  return { record };
}

// Importiert einen per Verlauf-Link erhaltenen Datenstand für einen Patienten
// (außerhalb eines Hooks, analog zu importPlan). Ersetzt den bisherigen
// Stand für diesen Patienten komplett.
export function importPatientRecord(patientId: string, bundle: HistoryBundle) {
  const record: PatientRecord = {
    patientId,
    checkIns: bundle.checkIns,
    pddm: bundle.pddm,
    psfsGoals: bundle.psfsGoals,
    psfsRatings: bundle.psfsRatings,
    questionnaireResults: bundle.questionnaireResults,
    importedAt: new Date().toISOString(),
  };
  const others = patientRecordsStore.getSnapshot().filter((r) => r.patientId !== patientId);
  patientRecordsStore.set([record, ...others]);
}

function emptyPatientRecord(patientId: string): PatientRecord {
  return {
    patientId,
    checkIns: [],
    pddm: [],
    psfsGoals: [],
    psfsRatings: [],
    questionnaireResults: [],
    importedAt: new Date().toISOString(),
  };
}

function getOrCreatePatientRecord(patientId: string): PatientRecord {
  const existing = patientRecordsStore.getSnapshot().find((r) => r.patientId === patientId);
  if (existing) return existing;
  const created = emptyPatientRecord(patientId);
  patientRecordsStore.set([created, ...patientRecordsStore.getSnapshot()]);
  return created;
}

function updatePatientRecord(patientId: string, patch: Partial<PatientRecord>) {
  const record = getOrCreatePatientRecord(patientId);
  const updated = { ...record, ...patch };
  patientRecordsStore.set(patientRecordsStore.getSnapshot().map((r) => (r.patientId === patientId ? updated : r)));
}

// Direkte Dateneingabe für einen Mandanten durch die Therapeutin/den
// Therapeuten selbst (z. B. Erstanamnese im Termin), unabhängig vom eigenen
// Tracking-Stand dieses Geräts. Analog zu den persönlichen Hooks oben, aber
// auf patientRecordsStore statt der eigenen Stores.
export function usePatientCheckIns(patientId: string, regionId: string) {
  const all = useSyncExternalStore(
    patientRecordsStore.subscribe,
    patientRecordsStore.getSnapshot,
    patientRecordsStore.getServerSnapshot
  );
  const record = useMemo(() => all.find((r) => r.patientId === patientId), [all, patientId]);
  const entries = useMemo(
    () => (record?.checkIns ?? []).filter((c) => c.regionId === regionId),
    [record, regionId]
  );

  const addEntry = useCallback(
    (entry: Omit<CheckIn, "id" | "createdAt">) => {
      const rec = getOrCreatePatientRecord(patientId);
      const newEntry: CheckIn = { ...entry, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
      updatePatientRecord(patientId, { checkIns: [newEntry, ...rec.checkIns] });
    },
    [patientId]
  );

  const updateEntry = useCallback(
    (id: string, patch: Partial<CheckIn>) => {
      const rec = getOrCreatePatientRecord(patientId);
      updatePatientRecord(patientId, { checkIns: rec.checkIns.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
    },
    [patientId]
  );

  const deleteEntry = useCallback(
    (id: string) => {
      const rec = getOrCreatePatientRecord(patientId);
      updatePatientRecord(patientId, { checkIns: rec.checkIns.filter((c) => c.id !== id) });
    },
    [patientId]
  );

  return { entries, addEntry, updateEntry, deleteEntry };
}

export function usePatientPDDMAssessments(patientId: string, regionId: string) {
  const all = useSyncExternalStore(
    patientRecordsStore.subscribe,
    patientRecordsStore.getSnapshot,
    patientRecordsStore.getServerSnapshot
  );
  const record = useMemo(() => all.find((r) => r.patientId === patientId), [all, patientId]);
  const assessments = useMemo(
    () => (record?.pddm ?? []).filter((a) => a.regionId === regionId),
    [record, regionId]
  );

  const addAssessment = useCallback(
    (assessment: Omit<PDDMAssessment, "id" | "createdAt">) => {
      const rec = getOrCreatePatientRecord(patientId);
      const newAssessment: PDDMAssessment = { ...assessment, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
      updatePatientRecord(patientId, { pddm: [newAssessment, ...rec.pddm] });
    },
    [patientId]
  );

  const deleteAssessment = useCallback(
    (id: string) => {
      const rec = getOrCreatePatientRecord(patientId);
      updatePatientRecord(patientId, { pddm: rec.pddm.filter((a) => a.id !== id) });
    },
    [patientId]
  );

  return { assessments, addAssessment, deleteAssessment };
}

export function usePatientPSFSGoals(patientId: string, regionId: string) {
  const all = useSyncExternalStore(
    patientRecordsStore.subscribe,
    patientRecordsStore.getSnapshot,
    patientRecordsStore.getServerSnapshot
  );
  const record = useMemo(() => all.find((r) => r.patientId === patientId), [all, patientId]);
  const goals = useMemo(() => (record?.psfsGoals ?? []).filter((g) => g.regionId === regionId), [record, regionId]);

  const addGoal = useCallback(
    (label: string) => {
      const rec = getOrCreatePatientRecord(patientId);
      const goal: PSFSGoal = { id: crypto.randomUUID(), regionId, label, createdAt: new Date().toISOString() };
      updatePatientRecord(patientId, { psfsGoals: [goal, ...rec.psfsGoals] });
    },
    [patientId, regionId]
  );

  const deleteGoal = useCallback(
    (id: string) => {
      const rec = getOrCreatePatientRecord(patientId);
      updatePatientRecord(patientId, {
        psfsGoals: rec.psfsGoals.filter((g) => g.id !== id),
        psfsRatings: rec.psfsRatings.filter((r) => r.goalId !== id),
      });
    },
    [patientId]
  );

  return { goals, addGoal, deleteGoal };
}

export function usePatientPSFSRatings(patientId: string, regionId: string) {
  const all = useSyncExternalStore(
    patientRecordsStore.subscribe,
    patientRecordsStore.getSnapshot,
    patientRecordsStore.getServerSnapshot
  );
  const record = useMemo(() => all.find((r) => r.patientId === patientId), [all, patientId]);
  const ratings = useMemo(
    () => (record?.psfsRatings ?? []).filter((r) => r.regionId === regionId),
    [record, regionId]
  );

  const addRating = useCallback(
    (goalId: string, value: number) => {
      const rec = getOrCreatePatientRecord(patientId);
      const rating: PSFSRating = {
        id: crypto.randomUUID(),
        regionId,
        goalId,
        date: new Date().toISOString().slice(0, 10),
        value,
        createdAt: new Date().toISOString(),
      };
      updatePatientRecord(patientId, { psfsRatings: [rating, ...rec.psfsRatings] });
    },
    [patientId, regionId]
  );

  return { ratings, addRating };
}

export function usePatientQuestionnaireResults(patientId: string, regionId: string) {
  const all = useSyncExternalStore(
    patientRecordsStore.subscribe,
    patientRecordsStore.getSnapshot,
    patientRecordsStore.getServerSnapshot
  );
  const record = useMemo(() => all.find((r) => r.patientId === patientId), [all, patientId]);
  const results = useMemo(
    () => (record?.questionnaireResults ?? []).filter((r) => r.regionId === regionId),
    [record, regionId]
  );

  const addResult = useCallback(
    (result: Omit<QuestionnaireResult, "id" | "createdAt">) => {
      const rec = getOrCreatePatientRecord(patientId);
      const newResult: QuestionnaireResult = { ...result, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
      updatePatientRecord(patientId, { questionnaireResults: [newResult, ...rec.questionnaireResults] });
    },
    [patientId]
  );

  const deleteResult = useCallback(
    (id: string) => {
      const rec = getOrCreatePatientRecord(patientId);
      updatePatientRecord(patientId, { questionnaireResults: rec.questionnaireResults.filter((r) => r.id !== id) });
    },
    [patientId]
  );

  return { results, addResult, deleteResult };
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
