import { JsonRecord } from '../types';
import type { AnalyticsPreferences } from './analytics';

export const RECORDS_STORAGE_KEY = 'json-dataviewer:records:v1';
export const ANALYTICS_PREFERENCES_STORAGE_KEY = 'json-dataviewer:analytics-preferences:v1';

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
    // Storage may be disabled or full; the current session remains available.
  }
}

export function createRecordId(prefix = 'record'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
