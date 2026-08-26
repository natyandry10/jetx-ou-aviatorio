import { JsonRecord } from '../types';

export interface ContextSearchMatch {
  record: JsonRecord;
  timestamp: number;
}

export interface ContextWindowItem extends ContextSearchMatch {
  position: 'before' | 'selected' | 'after';
  intervalFromPreviousSeconds: number | null;
}

export interface ContextWindowResult {
  selected: ContextSearchMatch;
  items: ContextWindowItem[];
  beforeCount: number;
  afterCount: number;
}

export function recordKey(record: JsonRecord): string {
  return record.hash || record.id;
}

export function getRecordTimestamp(record: JsonRecord): number | null {
  const timestamp = new Date(record.date_utc || record.date_brute).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function orderRecordsChronologically(records: JsonRecord[]): ContextSearchMatch[] {
  return records
    .map((record) => ({ record, timestamp: getRecordTimestamp(record) }))
    .filter((item): item is ContextSearchMatch => item.timestamp !== null && Number.isFinite(item.record.coefficient))
    .sort((left, right) => left.timestamp - right.timestamp || recordKey(left.record).localeCompare(recordKey(right.record)));
}

function normalizeSearchValue(value: string): string {
  return value.trim().toLowerCase().replace(/x$/, '').replace(',', '.');
}

export function searchMultiplierMatches(records: JsonRecord[], query: string, precision = 2): ContextSearchMatch[] {
  const normalized = normalizeSearchValue(query);
  if (!normalized || !/^\d*(?:\.\d*)?$/.test(normalized) || !/\d/.test(normalized)) return [];
  const factor = 10 ** precision;
  return orderRecordsChronologically(records)
    .filter(({ record }) => {
      const rounded = (Math.round(record.coefficient * factor) / factor).toFixed(precision);
      return rounded.startsWith(normalized);
    })
    .sort((left, right) => right.timestamp - left.timestamp);
}

export function buildContextWindow(records: JsonRecord[], selectedKey: string, beforeCount: number, afterCount: number): ContextWindowResult | null {
  const ordered = orderRecordsChronologically(records);
  const selectedIndex = ordered.findIndex(({ record }) => recordKey(record) === selectedKey);
  if (selectedIndex < 0) return null;
  const safeBefore = Math.min(100, Math.max(0, Math.floor(beforeCount)));
  const safeAfter = Math.min(100, Math.max(0, Math.floor(afterCount)));
  const start = Math.max(0, selectedIndex - safeBefore);
  const end = Math.min(ordered.length, selectedIndex + safeAfter + 1);
  const items = ordered.slice(start, end).map((item, index) => {
    const absoluteIndex = start + index;
    const previous = ordered[absoluteIndex - 1];
    return {
      ...item,
      position: (absoluteIndex === selectedIndex ? 'selected' : absoluteIndex < selectedIndex ? 'before' : 'after') as ContextWindowItem['position'],
      intervalFromPreviousSeconds: previous ? Math.max(0, (item.timestamp - previous.timestamp) / 1000) : null,
    };
  });
  return { selected: ordered[selectedIndex], items, beforeCount: Math.min(selectedIndex, safeBefore), afterCount: Math.min(ordered.length - selectedIndex - 1, safeAfter) };
}
