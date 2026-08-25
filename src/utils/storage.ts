import { JsonRecord } from '../types';

export const RECORDS_STORAGE_KEY = 'json-dataviewer:records:v1';

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

export function loadPersistedRecords(fallback: () => JsonRecord[]): JsonRecord[] {
  if (typeof window === 'undefined') return fallback();

  try {
    const stored = window.localStorage.getItem(RECORDS_STORAGE_KEY);
    if (stored === null) return fallback();

    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed) || !parsed.every(isJsonRecord)) return fallback();

    return parsed;
  } catch {
    return fallback();
  }
}

export function persistRecords(records: JsonRecord[]): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Storage may be disabled or full; the in-memory experience remains available.
  }
}

export function createRecordId(prefix = 'record'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
