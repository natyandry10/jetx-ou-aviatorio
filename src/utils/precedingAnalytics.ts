import { JsonRecord } from '../types';

export type PrecedingSequenceMode = 'bands' | 'exact';

export interface PrecedingSequenceConfig {
  threshold: number;
  lookback: number;
  mode: PrecedingSequenceMode;
  exactPrecision: number;
}

export interface PrecedingSequenceStep {
  timestamp: string;
  coefficient: number;
  intervalSeconds: number | null;
  band: string;
}

export interface PrecedingSequenceOccurrence {
  targetTimestamp: string;
  targetCoefficient: number;
  totalLeadTimeSeconds: number;
  steps: PrecedingSequenceStep[];
}

export interface PrecedingSequencePattern {
  id: string;
  label: string;
  occurrences: number;
  rate: number;
  firstOccurrenceAt: string;
  lastOccurrenceAt: string;
  examples: PrecedingSequenceOccurrence[];
}

export interface PrecedingSequenceResult {
  orderedValidCount: number;
  targetCount: number;
  windowsCount: number;
  ignoredCount: number;
  config: PrecedingSequenceConfig;
  patterns: PrecedingSequencePattern[];
  recentOccurrences: PrecedingSequenceOccurrence[];
}

export const DEFAULT_PRECEDING_SEQUENCE_CONFIG: PrecedingSequenceConfig = {
  threshold: 30,
  lookback: 5,
  mode: 'bands',
  exactPrecision: 2,
};

interface TimedRecord {
  record: JsonRecord;
  timestamp: number;
}

function getTimestamp(record: JsonRecord): number | null {
  const timestamp = new Date(record.date_utc || record.date_brute).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function roundToPrecision(value: number, precision: number): number {
  const factor = 10 ** Math.max(0, precision);
  return Math.round(value * factor) / factor;
}

export function getMultiplierBand(value: number): string {
  if (value <= 1.45) return '≤1,45x';
  if (value <= 4) return '1,46–4x';
  if (value <= 10) return '4,01–10x';
  if (value <= 30) return '10,01–30x';
  return '>30x';
}

function getToken(value: number, config: PrecedingSequenceConfig): string {
  return config.mode === 'bands' ? getMultiplierBand(value) : `${roundToPrecision(value, config.exactPrecision).toFixed(config.exactPrecision)}x`;
}

function getValidRecords(records: JsonRecord[]): TimedRecord[] {
  return records
    .map((record) => ({ record, timestamp: getTimestamp(record) }))
    .filter((item): item is TimedRecord => item.timestamp !== null && Number.isFinite(item.record.coefficient))
    .sort((left, right) => left.timestamp - right.timestamp || left.record.id.localeCompare(right.record.id));
}

function buildOccurrence(ordered: TimedRecord[], targetIndex: number, config: PrecedingSequenceConfig): PrecedingSequenceOccurrence {
  const start = targetIndex - config.lookback;
  const window = ordered.slice(start, targetIndex + 1);
  const steps = window.map((item, index) => ({
    timestamp: new Date(item.timestamp).toISOString(),
    coefficient: item.record.coefficient,
    intervalSeconds: index > 0 ? Math.max(0, (item.timestamp - window[index - 1].timestamp) / 1000) : null,
    band: getMultiplierBand(item.record.coefficient),
  }));
  return {
    targetTimestamp: new Date(ordered[targetIndex].timestamp).toISOString(),
    targetCoefficient: ordered[targetIndex].record.coefficient,
    totalLeadTimeSeconds: Math.max(0, (ordered[targetIndex].timestamp - ordered[start].timestamp) / 1000),
    steps,
  };
}

export function analyzePrecedingSequences(records: JsonRecord[], inputConfig: Partial<PrecedingSequenceConfig> = {}): PrecedingSequenceResult {
  const config: PrecedingSequenceConfig = {
    ...DEFAULT_PRECEDING_SEQUENCE_CONFIG,
    ...inputConfig,
    threshold: Number.isFinite(inputConfig.threshold) ? Math.max(0, inputConfig.threshold as number) : DEFAULT_PRECEDING_SEQUENCE_CONFIG.threshold,
    lookback: Math.min(20, Math.max(2, Math.floor(inputConfig.lookback ?? DEFAULT_PRECEDING_SEQUENCE_CONFIG.lookback))),
    exactPrecision: Math.min(4, Math.max(0, Math.floor(inputConfig.exactPrecision ?? DEFAULT_PRECEDING_SEQUENCE_CONFIG.exactPrecision))),
  };
  const ordered = getValidRecords(records);
  const targets = ordered.filter((item) => item.record.coefficient > config.threshold);
  const patterns = new Map<string, { label: string; occurrences: PrecedingSequenceOccurrence[] }>();
  const occurrences: PrecedingSequenceOccurrence[] = [];

  ordered.forEach((item, targetIndex) => {
    if (item.record.coefficient <= config.threshold || targetIndex < config.lookback) return;
    const occurrence = buildOccurrence(ordered, targetIndex, config);
    const preceding = ordered.slice(targetIndex - config.lookback, targetIndex).map((entry) => getToken(entry.record.coefficient, config));
    const targetToken = getToken(item.record.coefficient, config);
    const id = `${config.mode}:${config.lookback}:${config.exactPrecision}:${config.threshold}:${preceding.join('|')}=>${targetToken}`;
    const current = patterns.get(id) ?? { label: `${preceding.join(' → ')} → ${targetToken}`, occurrences: [] };
    current.occurrences.push(occurrence);
    patterns.set(id, current);
    occurrences.push(occurrence);
  });

  const patternResults = [...patterns.entries()].map(([id, value]) => ({
    id,
    label: value.label,
    occurrences: value.occurrences.length,
    rate: targets.length > 0 ? value.occurrences.length / targets.length : 0,
    firstOccurrenceAt: value.occurrences[0].targetTimestamp,
    lastOccurrenceAt: value.occurrences.at(-1)!.targetTimestamp,
    examples: value.occurrences.slice(-6).reverse(),
  })).sort((left, right) => right.occurrences - left.occurrences || right.lastOccurrenceAt.localeCompare(left.lastOccurrenceAt));

  return {
    orderedValidCount: ordered.length,
    targetCount: targets.length,
    windowsCount: occurrences.length,
    ignoredCount: records.length - ordered.length,
    config,
    patterns: patternResults,
    recentOccurrences: occurrences.slice(-30).reverse(),
  };
}
