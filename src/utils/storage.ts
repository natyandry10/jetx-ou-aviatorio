import { JsonRecord } from '../types';
import type { AnalyticsPreferences } from './analytics';

export const RECORDS_STORAGE_KEY = 'json-dataviewer:records:v2';
export const ANALYTICS_PREFERENCES_STORAGE_KEY = 'json-dataviewer:analytics-preferences:v1';

const LEGACY_RECORDS_STORAGE_KEY = 'json-dataviewer:records:v1';
const RECORDS_DATABASE_NAME = 'json-dataviewer';
const RECORDS_DATABASE_VERSION = 1;
const RECORDS_OBJECT_STORE = 'records';
const RECORDS_OBJECT_KEY = 'current';

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
      if (!request.result.objectStoreNames.contains(RECORDS_OBJECT_STORE)) {
        request.result.createObjectStore(RECORDS_OBJECT_STORE);
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
