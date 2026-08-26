import { JsonRecord } from '../types';
import type { AnalyticsPreferences } from './analytics';

export const RECORDS_STORAGE_KEY = 'json-dataviewer:records:v2';
export const ANALYTICS_PREFERENCES_STORAGE_KEY = 'json-dataviewer:analytics-preferences:v1';

const LEGACY_RECORDS_STORAGE_KEY = 'json-dataviewer:records:v1';
const RECORDS_DATABASE_NAME = 'json-dataviewer';
const RECORDS_DATABASE_VERSION = 2;
const RECORDS_OBJECT_STORE = 'records';
const ANALYSIS_RUNS_OBJECT_STORE = 'analysisRuns';
const ANALYSIS_MODELS_OBJECT_STORE = 'analysisModels';
const RECORDS_OBJECT_KEY = 'current';

export interface AnalysisModel {
  id: string;
  name: string;
  description: string;
  kind: 'preceding-sequence' | 'live-similarity' | 'top-period';
  config: Record<string, unknown>;
  builtIn?: boolean;
  updatedAt: string;
}

export interface SavedAnalysisRun {
  id: string;
  createdAt: string;
  modelId: string;
  modelName: string;
  sourceName?: string;
  configuration: Record<string, unknown>;
  result: Record<string, unknown>;
}

function isJsonRecord(value: unknown): value is JsonRecord {
  if (typeof value !== 'object' || value === null) return false;

  const record = value as Partial<JsonRecord>;
  return (
    typeof record.id === 'string' &&
    typeof record.date_brute === 'string' &&
    typeof record.date_utc === 'string' &&
    typeof record.coefficient === 'number' &&
    Number.isFinite(record.coefficient) &&
    typeof record.hash === 'string'
  );
}

function readLocalFallback(): JsonRecord[] {
  try {
    const stored = window.localStorage.getItem(RECORDS_STORAGE_KEY);
    if (stored === null) return [];

    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed) && parsed.every(isJsonRecord) ? parsed : [];
  } catch {
    return [];
  }
}

function clearLegacyRecordStorage(): void {
  try {
    window.localStorage.removeItem(LEGACY_RECORDS_STORAGE_KEY);
  } catch {
    // Local storage may be disabled; IndexedDB remains the primary store.
  }
}

function openRecordsDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB est indisponible dans ce navigateur.'));
      return;
    }

    const request = window.indexedDB.open(RECORDS_DATABASE_NAME, RECORDS_DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(RECORDS_OBJECT_STORE)) {
        database.createObjectStore(RECORDS_OBJECT_STORE);
      }
      if (!database.objectStoreNames.contains(ANALYSIS_RUNS_OBJECT_STORE)) {
        database.createObjectStore(ANALYSIS_RUNS_OBJECT_STORE, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(ANALYSIS_MODELS_OBJECT_STORE)) {
        database.createObjectStore(ANALYSIS_MODELS_OBJECT_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Impossible d’ouvrir IndexedDB.'));
  });
}

export async function loadPersistedRecords(): Promise<JsonRecord[]> {
  if (typeof window === 'undefined') return [];

  try {
    const database = await openRecordsDatabase();
    const transaction = database.transaction(RECORDS_OBJECT_STORE, 'readonly');
    const request = transaction.objectStore(RECORDS_OBJECT_STORE).get(RECORDS_OBJECT_KEY);

    const records = await new Promise<JsonRecord[]>((resolve, reject) => {
      request.onsuccess = () => {
        const value: unknown = request.result;
        resolve(Array.isArray(value) && value.every(isJsonRecord) ? value : []);
      };
      request.onerror = () => reject(request.error ?? new Error('Impossible de lire IndexedDB.'));
    });

    database.close();
    clearLegacyRecordStorage();
    return records;
  } catch {
    clearLegacyRecordStorage();
    return readLocalFallback();
  }
}

export async function persistRecords(records: JsonRecord[]): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const database = await openRecordsDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(RECORDS_OBJECT_STORE, 'readwrite');
      transaction.objectStore(RECORDS_OBJECT_STORE).put(records, RECORDS_OBJECT_KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Impossible d’écrire dans IndexedDB.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('Écriture IndexedDB interrompue.'));
    });
    database.close();
    clearLegacyRecordStorage();
  } catch {
    try {
      window.localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(records));
      clearLegacyRecordStorage();
    } catch {
      // Le stockage peut être désactivé ou plein ; la session mémoire reste utilisable.
    }
  }
}

const SAVED_ANALYSIS_RUNS_STORAGE_KEY = 'json-dataviewer:analysis-runs:v1';
const ANALYSIS_MODELS_STORAGE_KEY = 'json-dataviewer:analysis-models:v1';

function isSavedAnalysisRun(value: unknown): value is SavedAnalysisRun {
  if (typeof value !== 'object' || value === null) return false;
  const run = value as Partial<SavedAnalysisRun>;
  return typeof run.id === 'string' && typeof run.createdAt === 'string' && typeof run.modelId === 'string' && typeof run.modelName === 'string' && typeof run.configuration === 'object' && run.configuration !== null && typeof run.result === 'object' && run.result !== null;
}

function isAnalysisModel(value: unknown): value is AnalysisModel {
  if (typeof value !== 'object' || value === null) return false;
  const model = value as Partial<AnalysisModel>;
  return typeof model.id === 'string' && typeof model.name === 'string' && typeof model.description === 'string' && typeof model.kind === 'string' && typeof model.config === 'object' && model.config !== null && typeof model.updatedAt === 'string';
}

export async function loadSavedAnalysisRuns(): Promise<SavedAnalysisRun[]> {
  if (typeof window === 'undefined') return [];
  try {
    const database = await openRecordsDatabase();
    const request = database.transaction(ANALYSIS_RUNS_OBJECT_STORE, 'readonly').objectStore(ANALYSIS_RUNS_OBJECT_STORE).getAll();
    const runs = await new Promise<SavedAnalysisRun[]>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result.filter(isSavedAnalysisRun));
      request.onerror = () => reject(request.error ?? new Error('Impossible de lire les analyses enregistrées.'));
    });
    database.close();
    return runs.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  } catch {
    try {
      const parsed: unknown = JSON.parse(window.localStorage.getItem(SAVED_ANALYSIS_RUNS_STORAGE_KEY) ?? '[]');
      return Array.isArray(parsed) ? parsed.filter(isSavedAnalysisRun).sort((left, right) => right.createdAt.localeCompare(left.createdAt)) : [];
    } catch {
      return [];
    }
  }
}

export async function persistSavedAnalysisRun(run: SavedAnalysisRun): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const database = await openRecordsDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(ANALYSIS_RUNS_OBJECT_STORE, 'readwrite');
      transaction.objectStore(ANALYSIS_RUNS_OBJECT_STORE).put(run);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Impossible d’enregistrer l’analyse.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('Enregistrement de l’analyse interrompu.'));
    });
    database.close();
  } catch {
    try {
      const existing = await loadSavedAnalysisRuns();
      window.localStorage.setItem(SAVED_ANALYSIS_RUNS_STORAGE_KEY, JSON.stringify([run, ...existing.filter((item) => item.id !== run.id)]));
    } catch {
      // La session mémoire reste utilisable.
    }
  }
}

export async function deleteSavedAnalysisRun(id: string): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const database = await openRecordsDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(ANALYSIS_RUNS_OBJECT_STORE, 'readwrite');
      transaction.objectStore(ANALYSIS_RUNS_OBJECT_STORE).delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Impossible de supprimer l’analyse.'));
    });
    database.close();
  } catch {
    try {
      const existing = await loadSavedAnalysisRuns();
      window.localStorage.setItem(SAVED_ANALYSIS_RUNS_STORAGE_KEY, JSON.stringify(existing.filter((item) => item.id !== id)));
    } catch {
      // Le stockage peut être indisponible.
    }
  }
}

export async function loadAnalysisModels(fallback: AnalysisModel[]): Promise<AnalysisModel[]> {
  if (typeof window === 'undefined') return fallback;
  try {
    const database = await openRecordsDatabase();
    const request = database.transaction(ANALYSIS_MODELS_OBJECT_STORE, 'readonly').objectStore(ANALYSIS_MODELS_OBJECT_STORE).getAll();
    const models = await new Promise<AnalysisModel[]>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result.filter(isAnalysisModel));
      request.onerror = () => reject(request.error ?? new Error('Impossible de lire les modèles.'));
    });
    database.close();
    return models.length > 0 ? models : fallback;
  } catch {
    try {
      const parsed: unknown = JSON.parse(window.localStorage.getItem(ANALYSIS_MODELS_STORAGE_KEY) ?? '[]');
      return Array.isArray(parsed) && parsed.every(isAnalysisModel) && parsed.length > 0 ? parsed : fallback;
    } catch {
      return fallback;
    }
  }
}

export async function persistAnalysisModels(models: AnalysisModel[]): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const database = await openRecordsDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(ANALYSIS_MODELS_OBJECT_STORE, 'readwrite');
      const store = transaction.objectStore(ANALYSIS_MODELS_OBJECT_STORE);
      models.forEach((model) => store.put(model));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Impossible d’enregistrer les modèles.'));
    });
    database.close();
  } catch {
    try {
      window.localStorage.setItem(ANALYSIS_MODELS_STORAGE_KEY, JSON.stringify(models));
    } catch {
      // Les modèles restent actifs en mémoire.
    }
  }
}

export function loadAnalyticsPreferences(fallback: AnalyticsPreferences): AnalyticsPreferences {
  if (typeof window === 'undefined') return fallback;

  try {
    const stored = window.localStorage.getItem(ANALYTICS_PREFERENCES_STORAGE_KEY);
    if (stored === null) return fallback;
    const parsed = JSON.parse(stored) as Partial<AnalyticsPreferences>;
    if (!parsed.period || typeof parsed.period.preset !== 'string') return fallback;

    const validPresets = new Set(['all', '24h', '7d', '30d', 'custom']);
    const validScales = new Set(['linear', 'logarithmic']);
    if (!validPresets.has(parsed.period.preset) || !validScales.has(parsed.scale ?? 'linear')) return fallback;

    return {
      period: {
        preset: parsed.period.preset as AnalyticsPreferences['period']['preset'],
        startDate: typeof parsed.period.startDate === 'string' ? parsed.period.startDate : undefined,
        endDate: typeof parsed.period.endDate === 'string' ? parsed.period.endDate : undefined,
      },
      scale: (parsed.scale ?? 'linear') as AnalyticsPreferences['scale'],
      comparisonFileAId: typeof parsed.comparisonFileAId === 'string' ? parsed.comparisonFileAId : undefined,
      comparisonFileBId: typeof parsed.comparisonFileBId === 'string' ? parsed.comparisonFileBId : undefined,
    };
  } catch {
    return fallback;
  }
}

export function persistAnalyticsPreferences(preferences: AnalyticsPreferences): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(ANALYTICS_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Les préférences restent actives en mémoire si le stockage est indisponible.
  }
}

export function createRecordId(prefix = 'record'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
