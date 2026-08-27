import { JsonRecord } from '../types';

export type RecordedDateFilter = 'all' | string;

export interface RecordedWindowRow {
  record: JsonRecord;
  timestamp: number;
  roundedCoefficient: string;
  occurrenceCount: number;
  occurrenceRate: number;
}

export interface RecordedWindowResult {
  rows: RecordedWindowRow[];
  totalValidInWindow: number;
  totalAboveThreshold: number;
  startSeconds: number;
  endSeconds: number;
  dateFilter: RecordedDateFilter;
}

export interface RecordedDateOption {
  value: string;
  label: string;
}

function timestampFor(record: JsonRecord): number | null {
  const timestamp = new Date(record.date_utc || record.date_brute).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function localDateKey(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function secondsOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  return date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
}

function inTimeWindow(value: number, startSeconds: number, endSeconds: number): boolean {
  if (endSeconds <= 24 * 3600) return value >= startSeconds && value < endSeconds;
  return value >= startSeconds || value < endSeconds - 24 * 3600;
}

export function getRecordedDateOptions(records: JsonRecord[]): RecordedDateOption[] {
  const values = new Set<string>();
  records.forEach((record) => {
    const timestamp = timestampFor(record);
    if (timestamp !== null) values.add(localDateKey(timestamp));
  });
  return Array.from(values).sort().map((value) => ({
    value,
    label: new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(`${value}T12:00:00`)),
  }));
}

export function calculateRecordedWindow(
  records: JsonRecord[],
  reference: Date,
  dateFilter: RecordedDateFilter,
  threshold = 15,
  windowMinutes = 15,
  precision = 2,
): RecordedWindowResult {
  const startSeconds = reference.getHours() * 3600 + reference.getMinutes() * 60;
  const endSeconds = startSeconds + Math.max(1, windowMinutes) * 60;
  const factor = 10 ** Math.max(0, Math.min(4, precision));
  const valid = records.map((record) => ({ record, timestamp: timestampFor(record) })).filter((item): item is { record: JsonRecord; timestamp: number } => item.timestamp !== null && Number.isFinite(item.record.coefficient));
  const inWindow = valid.filter(({ timestamp }) => (dateFilter === 'all' || localDateKey(timestamp) === dateFilter) && inTimeWindow(secondsOfDay(timestamp), startSeconds, endSeconds));
  const occurrenceCounts = new Map<string, number>();
  inWindow.forEach(({ record }) => {
    const key = (Math.round(record.coefficient * factor) / factor).toFixed(Math.max(0, Math.min(4, precision)));
    occurrenceCounts.set(key, (occurrenceCounts.get(key) ?? 0) + 1);
  });
  const rows = inWindow
    .filter(({ record }) => record.coefficient > threshold)
    .map(({ record, timestamp }) => {
      const roundedCoefficient = (Math.round(record.coefficient * factor) / factor).toFixed(Math.max(0, Math.min(4, precision)));
      const occurrenceCount = occurrenceCounts.get(roundedCoefficient) ?? 0;
      return { record, timestamp, roundedCoefficient, occurrenceCount, occurrenceRate: inWindow.length > 0 ? (occurrenceCount / inWindow.length) * 100 : 0 };
    })
    .sort((left, right) => left.timestamp - right.timestamp || left.record.id.localeCompare(right.record.id));
  return { rows, totalValidInWindow: inWindow.length, totalAboveThreshold: rows.length, startSeconds, endSeconds, dateFilter };
}

export function formatWindowClock(totalSeconds: number): string {
  const normalized = ((Math.floor(totalSeconds) % 86400) + 86400) % 86400;
  return `${String(Math.floor(normalized / 3600)).padStart(2, '0')}:${String(Math.floor((normalized % 3600) / 60)).padStart(2, '0')}:00`;
}

export function formatOccurrenceRate(rate: number): string {
  return `${rate.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
}
