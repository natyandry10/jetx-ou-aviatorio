import { JsonRecord } from '../types';

export interface TimeSeriesPoint {
  time: number;
  label: string;
  coefficient: number;
  recordId: string;
}

export interface HourlyStat {
  hour: number;
  count: number;
  average: number;
  maximum: number;
}

export interface CoefficientStats {
  count: number;
  mean: number;
  median: number;
  p25: number;
  p75: number;
  p90: number;
  minimum: number;
  maximum: number;
}

export interface ComparisonPeriods {
  current: JsonRecord[];
  previous: JsonRecord[];
  currentLabel: string;
  previousLabel: string;
}

export type AnalyticsPeriodPreset = 'all' | '24h' | '7d' | '30d' | 'custom';

export interface AnalyticsPeriod {
  preset: AnalyticsPeriodPreset;
  startDate?: string;
  endDate?: string;
}

export interface AnalyticsPreferences {
  period: AnalyticsPeriod;
  scale: 'linear' | 'logarithmic';
  comparisonFileAId?: string;
  comparisonFileBId?: string;
}

function getValidTimestamp(record: JsonRecord): number | null {
  const timestamp = new Date(record.date_utc || record.date_brute).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function filterRecordsByPeriod(records: JsonRecord[], period: AnalyticsPeriod): JsonRecord[] {
  if (period.preset === 'all') return records;

  if (period.preset === 'custom') {
    const start = period.startDate ? new Date(`${period.startDate}T00:00:00`).getTime() : -Infinity;
    const end = period.endDate ? new Date(`${period.endDate}T23:59:59.999`).getTime() : Infinity;
    return records.filter((record) => {
      const timestamp = getValidTimestamp(record);
      return timestamp !== null && timestamp >= start && timestamp <= end;
    });
  }

  const durationByPreset: Record<'24h' | '7d' | '30d', number> = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  };
  const timestamps = records.map(getValidTimestamp).filter((timestamp): timestamp is number => timestamp !== null);
  if (timestamps.length === 0) return [];

  const latestTimestamp = Math.max(...timestamps);
  const cutoff = latestTimestamp - durationByPreset[period.preset];
  return records.filter((record) => {
    const timestamp = getValidTimestamp(record);
    return timestamp !== null && timestamp >= cutoff && timestamp <= latestTimestamp;
  });
}

export function calculateCoefficientStats(records: JsonRecord[]): CoefficientStats {
  const values = records
    .map((record) => record.coefficient)
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);

  if (values.length === 0) {
    return { count: 0, mean: 0, median: 0, p25: 0, p75: 0, p90: 0, minimum: 0, maximum: 0 };
  }

  const percentile = (ratio: number): number => {
    const position = (values.length - 1) * ratio;
    const lower = Math.floor(position);
    const upper = Math.ceil(position);
    if (lower === upper) return values[lower];
    return values[lower] + (values[upper] - values[lower]) * (position - lower);
  };

  return {
    count: values.length,
    mean: values.reduce((sum, value) => sum + value, 0) / values.length,
    median: percentile(0.5),
    p25: percentile(0.25),
    p75: percentile(0.75),
    p90: percentile(0.9),
    minimum: values[0],
    maximum: values[values.length - 1],
  };
}

function formatPeriodLabel(records: JsonRecord[], fallback: string): string {
  const timestamps = records.map(getValidTimestamp).filter((timestamp): timestamp is number => timestamp !== null).sort((a, b) => a - b);
  if (timestamps.length === 0) return fallback;
  const formatter = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  const start = formatter.format(new Date(timestamps[0]));
  const end = formatter.format(new Date(timestamps[timestamps.length - 1]));
  return start === end ? start : `${start} → ${end}`;
}

export function buildComparisonPeriods(records: JsonRecord[], period: AnalyticsPeriod): ComparisonPeriods {
  const validRecords = records
    .map((record) => ({ record, timestamp: getValidTimestamp(record) }))
    .filter((item): item is { record: JsonRecord; timestamp: number } => item.timestamp !== null)
    .sort((a, b) => a.timestamp - b.timestamp);

  if (validRecords.length === 0) {
    return { current: [], previous: [], currentLabel: 'Période actuelle', previousLabel: 'Période précédente' };
  }

  if (period.preset === 'all') {
    const splitIndex = Math.ceil(validRecords.length / 2);
    const previous = validRecords.slice(0, splitIndex).map((item) => item.record);
    const current = validRecords.slice(splitIndex).map((item) => item.record);
    return {
      current,
      previous,
      currentLabel: formatPeriodLabel(current, 'Seconde moitié'),
      previousLabel: formatPeriodLabel(previous, 'Première moitié'),
    };
  }

  let current = filterRecordsByPeriod(records, period);
  const currentTimestamps = current.map(getValidTimestamp).filter((timestamp): timestamp is number => timestamp !== null);
  if (currentTimestamps.length === 0) {
    return { current: [], previous: [], currentLabel: 'Période actuelle', previousLabel: 'Période précédente' };
  }

  let currentStart = Math.min(...currentTimestamps);
  let currentEnd = Math.max(...currentTimestamps);
  if (period.preset === 'custom') {
    const customStart = period.startDate ? new Date(`${period.startDate}T00:00:00`).getTime() : currentStart;
    const customEnd = period.endDate ? new Date(`${period.endDate}T23:59:59.999`).getTime() : currentEnd;
    currentStart = Number.isFinite(customStart) ? customStart : currentStart;
    currentEnd = Number.isFinite(customEnd) ? customEnd : currentEnd;
  } else {
    const durationByPreset: Record<'24h' | '7d' | '30d', number> = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    };
    currentEnd = Math.max(...validRecords.map((item) => item.timestamp));
    currentStart = currentEnd - durationByPreset[period.preset];
  }

  const duration = Math.max(currentEnd - currentStart, 1);
  const previousStart = currentStart - duration;
  const previousEnd = currentStart - 1;
  const previous = validRecords
    .filter((item) => item.timestamp >= previousStart && item.timestamp <= previousEnd)
    .map((item) => item.record);
  current = validRecords
    .filter((item) => item.timestamp >= currentStart && item.timestamp <= currentEnd)
    .map((item) => item.record);

  return {
    current,
    previous,
    currentLabel: formatPeriodLabel(current, 'Période actuelle'),
    previousLabel: formatPeriodLabel(previous, 'Période précédente'),
  };
}

export function buildTimeSeries(records: JsonRecord[], maxPoints = 140): TimeSeriesPoint[] {
  const points = records
    .map((record) => {
      const time = getValidTimestamp(record);
      if (time === null) return null;
      return {
        time,
        label: record.date_utc || record.date_brute,
        coefficient: record.coefficient,
        recordId: record.id,
      };
    })
    .filter((point): point is TimeSeriesPoint => point !== null)
    .sort((a, b) => a.time - b.time);

  if (points.length <= maxPoints) return points;

  const step = (points.length - 1) / (maxPoints - 1);
  return Array.from({ length: maxPoints }, (_, index) => points[Math.round(index * step)]);
}

export function buildHourlyStats(records: JsonRecord[]): HourlyStat[] {
  const valuesByHour = Array.from({ length: 24 }, () => [] as number[]);

  records.forEach((record) => {
    const timestamp = getValidTimestamp(record);
    if (timestamp === null || !Number.isFinite(record.coefficient)) return;
    valuesByHour[new Date(timestamp).getHours()].push(record.coefficient);
  });

  return valuesByHour.map((values, hour) => ({
    hour,
    count: values.length,
    average: values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0,
    maximum: values.length > 0 ? Math.max(...values) : 0,
  }));
}

export function getTopHourlyStats(stats: HourlyStat[], limit = 3): HourlyStat[] {
  return stats
    .filter((stat) => stat.count > 0)
    .sort((a, b) => b.count - a.count || b.average - a.average)
    .slice(0, limit);
}

export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}h`;
}
