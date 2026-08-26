import { JsonRecord } from '../types';

export type ScrapGranularity = 'hour' | 'day' | 'month' | 'year';

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
}

export interface ScrapAnalysisResult {
  validRecords: ScrapRecord[];
  invalidCount: number;
  top30: ScrapRecord[];
  above30Count: number;
  above30Rate: number;
  byGranularity: Record<ScrapGranularity, ScrapPeriodStat[]>;
}

const GRANULARITIES: ScrapGranularity[] = ['hour', 'day', 'month', 'year'];

function toValidRecord(record: JsonRecord): ScrapRecord | null {
  const timestampValue = record.date_utc || record.date_brute;
  const timestamp = new Date(timestampValue);
  if (Number.isNaN(timestamp.getTime()) || !Number.isFinite(record.coefficient)) return null;
  return { ...record, timestamp: timestamp.toISOString() };
}

function periodKey(date: Date, granularity: ScrapGranularity): string {
  if (granularity === 'hour') return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}`;
  if (granularity === 'day') return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  if (granularity === 'month') return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  return String(date.getFullYear());
}

function periodLabel(date: Date, granularity: ScrapGranularity): string {
  if (granularity === 'hour') return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit' }).format(date);
  if (granularity === 'day') return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(date);
  if (granularity === 'month') return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(date);
  return new Intl.DateTimeFormat('fr-FR', { year: 'numeric' }).format(date);
}

function buildPeriodStats(records: ScrapRecord[], granularity: ScrapGranularity): ScrapPeriodStat[] {
  const groups = new Map<string, ScrapRecord[]>();
  records.forEach((record) => {
    const date = new Date(record.timestamp);
    const key = periodKey(date, granularity);
    const group = groups.get(key) ?? [];
    group.push(record);
    groups.set(key, group);
  });

  return [...groups.entries()].map(([key, group]) => {
    const above30 = group.filter((record) => record.coefficient > 30);
    const maximum = Math.max(...group.map((record) => record.coefficient));
    return {
      key,
      label: periodLabel(new Date(group[0].timestamp), granularity),
      totalCount: group.length,
      above30Count: above30.length,
      above30Rate: above30.length / group.length,
      maximum,
      averageAbove30: above30.length > 0 ? above30.reduce((sum, record) => sum + record.coefficient, 0) / above30.length : null,
    };
  }).sort((left, right) => left.key.localeCompare(right.key));
}

export function analyzeScrapTesting(records: JsonRecord[]): ScrapAnalysisResult {
  const validRecords = records.map(toValidRecord).filter((record): record is ScrapRecord => record !== null).sort((left, right) => left.timestamp.localeCompare(right.timestamp));
  const top30 = [...validRecords].sort((left, right) => right.coefficient - left.coefficient || right.timestamp.localeCompare(left.timestamp)).slice(0, 30);
  const above30Count = validRecords.filter((record) => record.coefficient > 30).length;
  const byGranularity = Object.fromEntries(GRANULARITIES.map((granularity) => [granularity, buildPeriodStats(validRecords, granularity)])) as Record<ScrapGranularity, ScrapPeriodStat[]>;
  return {
    validRecords,
    invalidCount: records.length - validRecords.length,
    top30,
    above30Count,
    above30Rate: validRecords.length > 0 ? above30Count / validRecords.length : 0,
    byGranularity,
  };
}
