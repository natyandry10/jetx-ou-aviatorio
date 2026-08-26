import { JsonRecord } from '../types';

export type ScrapGranularity = 'hour' | 'day' | 'month' | 'year';

export interface ScrapAnalysisOptions {
  startDate?: string;
  endDate?: string;
  threshold?: number;
}

export interface ScrapRecord extends JsonRecord {
  timestamp: string;
}

export interface ScrapPeriodStat {
  key: string;
  label: string;
  totalCount: number;
  above30Count: number;
  above30Rate: number;
  maximum: number;
  averageAbove30: number | null;
  top10: ScrapRecord[];
  firstAbove30Timestamp: string | null;
  lastAbove30Timestamp: string | null;
  spanSeconds: number | null;
}

export interface ScrapAnalysisResult {
  validRecords: ScrapRecord[];
  invalidCount: number;
  threshold: number;
  top30: ScrapRecord[];
  above30Count: number;
  above30Rate: number;
  byGranularity: Record<ScrapGranularity, ScrapPeriodStat[]>;
}

const GRANULARITIES: ScrapGranularity[] = ['hour', 'day', 'month', 'year'];
const DEFAULT_THRESHOLD = 30;

function toValidRecord(record: JsonRecord): ScrapRecord | null {
  const timestampValue = record.date_utc || record.date_brute;
  const timestamp = new Date(timestampValue);
  if (Number.isNaN(timestamp.getTime()) || !Number.isFinite(record.coefficient)) return null;
  return { ...record, timestamp: timestamp.toISOString() };
}

function periodKey(date: Date, granularity: ScrapGranularity): string {
  if (granularity === 'hour') return String(date.getHours()).padStart(2, '0');
  if (granularity === 'day') return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  if (granularity === 'month') return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  return String(date.getFullYear());
}

function periodLabel(date: Date, granularity: ScrapGranularity): string {
  if (granularity === 'hour') return `${String(date.getHours()).padStart(2, '0')}h`;
  if (granularity === 'day') return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(date);
  if (granularity === 'month') return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(date);
  return new Intl.DateTimeFormat('fr-FR', { year: 'numeric' }).format(date);
}

function isWithinDateRange(record: ScrapRecord, options: ScrapAnalysisOptions): boolean {
  const date = new Date(record.timestamp);
  if (options.startDate) {
    const start = new Date(`${options.startDate}T00:00:00`);
    if (!Number.isNaN(start.getTime()) && date < start) return false;
  }
  if (options.endDate) {
    const end = new Date(`${options.endDate}T23:59:59.999`);
    if (!Number.isNaN(end.getTime()) && date > end) return false;
  }
  return true;
}

function buildPeriodStats(records: ScrapRecord[], granularity: ScrapGranularity, threshold: number): ScrapPeriodStat[] {
  const groups = new Map<string, ScrapRecord[]>();
  records.forEach((record) => {
    const date = new Date(record.timestamp);
    const key = periodKey(date, granularity);
    const group = groups.get(key) ?? [];
    group.push(record);
    groups.set(key, group);
  });

  return [...groups.entries()].map(([key, group]) => {
    const aboveThreshold = group.filter((record) => record.coefficient > threshold).sort((left, right) => right.coefficient - left.coefficient || right.timestamp.localeCompare(left.timestamp));
    const chronologicalAbove = [...aboveThreshold].sort((left, right) => left.timestamp.localeCompare(right.timestamp));
    const firstAbove30Timestamp = chronologicalAbove[0]?.timestamp ?? null;
    const lastAbove30Timestamp = chronologicalAbove.at(-1)?.timestamp ?? null;
    const spanSeconds = firstAbove30Timestamp && lastAbove30Timestamp ? (new Date(lastAbove30Timestamp).getTime() - new Date(firstAbove30Timestamp).getTime()) / 1000 : null;
    const maximum = Math.max(...group.map((record) => record.coefficient));
    return {
      key,
      label: periodLabel(new Date(group[0].timestamp), granularity),
      totalCount: group.length,
      above30Count: aboveThreshold.length,
      above30Rate: aboveThreshold.length / group.length,
      maximum,
      averageAbove30: aboveThreshold.length > 0 ? aboveThreshold.reduce((sum, record) => sum + record.coefficient, 0) / aboveThreshold.length : null,
      top10: aboveThreshold.slice(0, 10),
      firstAbove30Timestamp,
      lastAbove30Timestamp,
      spanSeconds,
    };
  }).sort((left, right) => left.key.localeCompare(right.key));
}

export function analyzeScrapTesting(records: JsonRecord[], options: ScrapAnalysisOptions = {}): ScrapAnalysisResult {
  const threshold = Number.isFinite(options.threshold) ? Math.max(0, options.threshold as number) : DEFAULT_THRESHOLD;
  const parsedRecords = records.map(toValidRecord);
  const validRecords = parsedRecords.filter((record): record is ScrapRecord => record !== null && isWithinDateRange(record, options)).sort((left, right) => left.timestamp.localeCompare(right.timestamp));
  const invalidCount = parsedRecords.filter((record) => record === null).length;
  const top30 = [...validRecords].sort((left, right) => right.coefficient - left.coefficient || right.timestamp.localeCompare(left.timestamp)).slice(0, 30);
  const above30Count = validRecords.filter((record) => record.coefficient > threshold).length;
  const byGranularity = Object.fromEntries(GRANULARITIES.map((granularity) => [granularity, buildPeriodStats(validRecords, granularity, threshold)])) as Record<ScrapGranularity, ScrapPeriodStat[]>;
  return {
    validRecords,
    invalidCount,
    threshold,
    top30,
    above30Count,
    above30Rate: validRecords.length > 0 ? above30Count / validRecords.length : 0,
    byGranularity,
  };
}
