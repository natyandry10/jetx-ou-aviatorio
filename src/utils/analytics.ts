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


export type SequenceAnalysisMode = 'exact' | 'low-high';
export type SequenceTemporalGranularity = 'hour' | 'day' | 'month' | 'year';

export interface SequenceScannerConfig {
  minLength: number;
  maxLength: number;
  lookahead: number;
  lowThreshold: number;
  triggerThreshold: number;
  targetThreshold: number;
  exactPrecision: number;
}

export const DEFAULT_SEQUENCE_SCANNER_CONFIG: SequenceScannerConfig = {
  minLength: 2,
  maxLength: 6,
  lookahead: 5,
  lowThreshold: 1.45,
  triggerThreshold: 4,
  targetThreshold: 4,
  exactPrecision: 2,
};

export interface SequencePositionSummary {
  position: number;
  sampleCount: number;
  aboveTargetCount: number;
  aboveTargetRate: number;
  mean: number;
  median: number;
  p90: number;
  maximum: number;
}

export interface SequenceTemporalSummary {
  key: string;
  label: string;
  occurrences: number;
  nextEvaluatedCount: number;
  aboveTargetCount: number;
  aboveTargetRate: number;
}

export interface SequencePatternResult {
  id: string;
  mode: SequenceAnalysisMode;
  length: number;
  label: string;
  triggerLabel?: string;
  occurrences: number;
  firstOccurrenceAt: string;
  lastOccurrenceAt: string;
  nextByPosition: SequencePositionSummary[];
  temporal: Record<SequenceTemporalGranularity, SequenceTemporalSummary[]>;
}

export interface SequenceScannerResult {
  orderedValidCount: number;
  ignoredCount: number;
  patterns: SequencePatternResult[];
}

interface SequenceOccurrence {
  timestamp: number;
  nextRecords: JsonRecord[];
}

interface MutableSequencePattern {
  id: string;
  mode: SequenceAnalysisMode;
  length: number;
  label: string;
  triggerLabel?: string;
  occurrences: SequenceOccurrence[];
}

function roundToPrecision(value: number, precision: number): number {
  const factor = 10 ** Math.max(0, precision);
  return Math.round(value * factor) / factor;
}

function sameCoefficient(left: number, right: number, precision: number): boolean {
  return roundToPrecision(left, precision) === roundToPrecision(right, precision);
}

function formatThreshold(value: number): string {
  return `${value.toFixed(2)}x`;
}

function formatSequenceTimestamp(timestamp: number, granularity: SequenceTemporalGranularity): { key: string; label: string } {
  const date = new Date(timestamp);
  if (granularity === 'hour') {
    const key = String(date.getHours()).padStart(2, '0');
    return { key, label: `${key}h` };
  }
  if (granularity === 'day') {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return { key, label: new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date) };
  }
  if (granularity === 'month') {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return { key, label: new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(date) };
  }
  const key = String(date.getFullYear());
  return { key, label: key };
}

function summarizeSequenceValues(values: number[], targetThreshold: number, position: number): SequencePositionSummary {
  const sorted = [...values].sort((a, b) => a - b);
  const sampleCount = sorted.length;
  if (sampleCount === 0) {
    return { position, sampleCount: 0, aboveTargetCount: 0, aboveTargetRate: 0, mean: 0, median: 0, p90: 0, maximum: 0 };
  }
  const percentile = (ratio: number): number => {
    const index = (sorted.length - 1) * ratio;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    return lower === upper ? sorted[lower] : sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
  };
  const aboveTargetCount = sorted.filter((value) => value > targetThreshold).length;
  return {
    position,
    sampleCount,
    aboveTargetCount,
    aboveTargetRate: aboveTargetCount / sampleCount,
    mean: sorted.reduce((sum, value) => sum + value, 0) / sampleCount,
    median: percentile(0.5),
    p90: percentile(0.9),
    maximum: sorted[sorted.length - 1],
  };
}

function finalizeSequencePattern(pattern: MutableSequencePattern, config: SequenceScannerConfig): SequencePatternResult {
  const timestamps = pattern.occurrences.map((occurrence) => occurrence.timestamp).sort((a, b) => a - b);
  const nextByPosition = Array.from({ length: config.lookahead }, (_, index) => {
    const values = pattern.occurrences
      .map((occurrence) => occurrence.nextRecords[index]?.coefficient)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    return summarizeSequenceValues(values, config.targetThreshold, index + 1);
  });
  const temporal = {} as Record<SequenceTemporalGranularity, SequenceTemporalSummary[]>;
  (['hour', 'day', 'month', 'year'] as SequenceTemporalGranularity[]).forEach((granularity) => {
    const buckets = new Map<string, { label: string; occurrences: number; nextEvaluatedCount: number; aboveTargetCount: number }>();
    pattern.occurrences.forEach((occurrence) => {
      const bucket = formatSequenceTimestamp(occurrence.timestamp, granularity);
      const current = buckets.get(bucket.key) ?? { label: bucket.label, occurrences: 0, nextEvaluatedCount: 0, aboveTargetCount: 0 };
      current.occurrences += 1;
      const nextValue = occurrence.nextRecords[0]?.coefficient;
      if (typeof nextValue === 'number' && Number.isFinite(nextValue)) {
        current.nextEvaluatedCount += 1;
        if (nextValue > config.targetThreshold) current.aboveTargetCount += 1;
      }
      buckets.set(bucket.key, current);
    });
    temporal[granularity] = [...buckets.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => ({
        key,
        label: value.label,
        occurrences: value.occurrences,
        nextEvaluatedCount: value.nextEvaluatedCount,
        aboveTargetCount: value.aboveTargetCount,
        aboveTargetRate: value.nextEvaluatedCount > 0 ? value.aboveTargetCount / value.nextEvaluatedCount : 0,
      }));
  });

  return {
    id: pattern.id,
    mode: pattern.mode,
    length: pattern.length,
    label: pattern.label,
    triggerLabel: pattern.triggerLabel,
    occurrences: pattern.occurrences.length,
    firstOccurrenceAt: new Date(timestamps[0]).toISOString(),
    lastOccurrenceAt: new Date(timestamps[timestamps.length - 1]).toISOString(),
    nextByPosition,
    temporal,
  };
}

export function scanConditionalSequences(records: JsonRecord[], inputConfig: Partial<SequenceScannerConfig> = {}): SequenceScannerResult {
  const config: SequenceScannerConfig = {
    ...DEFAULT_SEQUENCE_SCANNER_CONFIG,
    ...inputConfig,
    minLength: Math.max(2, Math.floor(inputConfig.minLength ?? DEFAULT_SEQUENCE_SCANNER_CONFIG.minLength)),
    maxLength: Math.max(2, Math.floor(inputConfig.maxLength ?? DEFAULT_SEQUENCE_SCANNER_CONFIG.maxLength)),
    lookahead: Math.max(1, Math.floor(inputConfig.lookahead ?? DEFAULT_SEQUENCE_SCANNER_CONFIG.lookahead)),
  };
  if (config.maxLength < config.minLength) config.maxLength = config.minLength;

  const orderedRecords = records
    .map((record) => ({ record, timestamp: getValidTimestamp(record) }))
    .filter((item): item is { record: JsonRecord; timestamp: number } => item.timestamp !== null && Number.isFinite(item.record.coefficient))
    .sort((left, right) => left.timestamp - right.timestamp || left.record.id.localeCompare(right.record.id));
  const ordered = orderedRecords.map((item) => item.record);
  const timestamps = orderedRecords.map((item) => item.timestamp);
  const patternMap = new Map<string, MutableSequencePattern>();

  const addOccurrence = (pattern: MutableSequencePattern, startIndex: number, nextStartIndex: number) => {
    pattern.occurrences.push({
      timestamp: timestamps[startIndex],
      nextRecords: ordered.slice(nextStartIndex, nextStartIndex + config.lookahead),
    });
  };

  for (let length = config.minLength; length <= config.maxLength; length += 1) {
    for (let start = 0; start + length < ordered.length; start += 1) {
      const firstCoefficient = ordered[start].coefficient;
      const repeated = ordered.slice(start, start + length).every((record) => sameCoefficient(record.coefficient, firstCoefficient, config.exactPrecision));
      if (repeated) {
        const token = roundToPrecision(firstCoefficient, config.exactPrecision).toFixed(config.exactPrecision);
        const id = `exact:${length}:${token}`;
        const pattern = patternMap.get(id) ?? {
          id,
          mode: 'exact',
          length,
          label: `${formatThreshold(Number(token))} répété ${length} fois`,
          occurrences: [],
        };
        addOccurrence(pattern, start, start + length);
        patternMap.set(id, pattern);
      }

      const lowSequence = ordered.slice(start, start + length).every((record) => record.coefficient <= config.lowThreshold);
      const trigger = ordered[start + length]?.coefficient;
      if (lowSequence && typeof trigger === 'number' && trigger > config.triggerThreshold) {
        const id = `low-high:${length}:${config.lowThreshold}:${config.triggerThreshold}`;
        const pattern = patternMap.get(id) ?? {
          id,
          mode: 'low-high',
          length,
          label: `≤ ${formatThreshold(config.lowThreshold)} pendant ${length} résultats`,
          triggerLabel: `puis > ${formatThreshold(config.triggerThreshold)}`,
          occurrences: [],
        };
        addOccurrence(pattern, start, start + length + 1);
        patternMap.set(id, pattern);
      }
    }
  }

  const patterns = [...patternMap.values()]
    .filter((pattern) => pattern.occurrences.length > 0)
    .map((pattern) => finalizeSequencePattern(pattern, config))
    .sort((left, right) => right.occurrences - left.occurrences || left.length - right.length || left.label.localeCompare(right.label));

  return {
    orderedValidCount: ordered.length,
    ignoredCount: records.length - ordered.length,
    patterns,
  };
}
