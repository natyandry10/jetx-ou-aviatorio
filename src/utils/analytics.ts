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

export type AnalyticsPeriodPreset = 'all' | '24h' | '7d' | '30d' | 'custom';

export interface AnalyticsPeriod {
  preset: AnalyticsPeriodPreset;
  startDate?: string;
  endDate?: string;
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
