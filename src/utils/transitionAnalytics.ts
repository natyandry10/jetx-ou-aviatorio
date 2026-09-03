import { JsonRecord } from '../types';

export interface TransitionConfig {
  sequenceLength: number;
  conditionMax: number;
  targetMin: number;
  lookahead: number;
  minimumDistinctDates: number;
}

export interface TransitionBandSummary {
  label: string;
  count: number;
  rate: number;
}

export interface TransitionPositionSummary {
  position: number;
  evaluatedCount: number;
  targetCount: number;
  distinctConditionDates: number;
  distinctTargetDates: number;
  targetRate: number;
  averageIntervalSeconds: number | null;
  dominantBand: TransitionBandSummary | null;
  bands: TransitionBandSummary[];
}

export interface TransitionOccurrence {
  conditionDate: string;
  conditionTimestamp: string;
  position: number;
  timestamp: string;
  coefficient: number;
  intervalSeconds: number;
  isTarget: boolean;
}

export interface TransitionAnalysisResult {
  orderedValidCount: number;
  conditionCount: number;
  distinctConditionDates: number;
  positions: TransitionPositionSummary[];
  occurrences: TransitionOccurrence[];
}

export const DEFAULT_TRANSITION_CONFIG: TransitionConfig = {
  sequenceLength: 3,
  conditionMax: 1.45,
  targetMin: 4,
  lookahead: 5,
  minimumDistinctDates: 2,
};

interface TimedRecord {
  record: JsonRecord;
  timestamp: number;
  dateKey: string;
}

function parseRecord(record: JsonRecord): TimedRecord | null {
  const timestamp = new Date(record.date_utc || record.date_brute).getTime();
  if (!Number.isFinite(timestamp) || !Number.isFinite(record.coefficient)) return null;
  const date = new Date(timestamp);
  return { record, timestamp, dateKey: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` };
}

function bandFor(value: number, targetMin: number): string {
  if (value >= targetMin) return `≥ ${targetMin.toFixed(2)}x`;
  if (value <= 1.45) return '≤ 1,45x';
  if (value < 2) return '1,46–1,99x';
  if (value < 4) return '2,00–3,99x';
  return `4,00–${Math.max(4, targetMin - 0.01).toFixed(2)}x`;
}

function average(values: number[]): number | null {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

export function analyzeConditionalTransitions(records: JsonRecord[], inputConfig: Partial<TransitionConfig> = {}): TransitionAnalysisResult {
  const config: TransitionConfig = {
    ...DEFAULT_TRANSITION_CONFIG,
    ...inputConfig,
    sequenceLength: Math.max(1, Math.min(12, Math.floor(inputConfig.sequenceLength ?? DEFAULT_TRANSITION_CONFIG.sequenceLength))),
    conditionMax: Math.max(0, Number(inputConfig.conditionMax ?? DEFAULT_TRANSITION_CONFIG.conditionMax)),
    targetMin: Math.max(0, Number(inputConfig.targetMin ?? DEFAULT_TRANSITION_CONFIG.targetMin)),
    lookahead: Math.max(1, Math.min(10, Math.floor(inputConfig.lookahead ?? DEFAULT_TRANSITION_CONFIG.lookahead))),
    minimumDistinctDates: Math.max(1, Math.floor(inputConfig.minimumDistinctDates ?? DEFAULT_TRANSITION_CONFIG.minimumDistinctDates)),
  };
  const ordered = records.map(parseRecord).filter((item): item is TimedRecord => item !== null).sort((a, b) => a.timestamp - b.timestamp);
  const candidateConditions: Array<{ start: number; end: number; dateKey: string; timestamp: number }> = [];
  for (let start = 0; start + config.sequenceLength <= ordered.length; start += 1) {
    const sequence = ordered.slice(start, start + config.sequenceLength);
    if (sequence.every((item) => item.record.coefficient <= config.conditionMax)) {
      candidateConditions.push({ start, end: start + config.sequenceLength, dateKey: sequence[0].dateKey, timestamp: sequence[0].timestamp });
    }
  }
  const conditionDateCounts = new Map<string, number>();
  candidateConditions.forEach((condition) => conditionDateCounts.set(condition.dateKey, (conditionDateCounts.get(condition.dateKey) ?? 0) + 1));
  const conditions = candidateConditions.filter((condition) => (conditionDateCounts.get(condition.dateKey) ?? 0) > 0 && new Set(candidateConditions.map((candidate) => candidate.dateKey)).size >= config.minimumDistinctDates);

  const positions = Array.from({ length: config.lookahead }, (_, index) => {
    const position = index + 1;
    const values: Array<{ item: TimedRecord; conditionDate: string; intervalSeconds: number }> = [];
    conditions.forEach((condition) => {
      const item = ordered[condition.end + index];
      if (!item) return;
      const endTimestamp = ordered[condition.end - 1].timestamp;
      values.push({ item, conditionDate: condition.dateKey, intervalSeconds: Math.max(0, (item.timestamp - endTimestamp) / 1000) });
    });
    const bands = new Map<string, { count: number; dates: Set<string> }>();
    values.forEach(({ item }) => {
      const label = bandFor(item.record.coefficient, config.targetMin);
      const current = bands.get(label) ?? { count: 0, dates: new Set<string>() };
      current.count += 1;
      current.dates.add(item.dateKey);
      bands.set(label, current);
    });
    const bandRows = [...bands.entries()].map(([label, value]) => ({ label, count: value.count, rate: values.length > 0 ? value.count / values.length : 0 })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
    const targetValues = values.filter(({ item }) => item.record.coefficient >= config.targetMin);
    return {
      position,
      evaluatedCount: values.length,
      targetCount: targetValues.length,
      distinctConditionDates: new Set(values.map(({ conditionDate }) => conditionDate)).size,
      distinctTargetDates: new Set(targetValues.map(({ item }) => item.dateKey)).size,
      targetRate: values.length > 0 ? targetValues.length / values.length : 0,
      averageIntervalSeconds: average(values.map(({ intervalSeconds }) => intervalSeconds)),
      dominantBand: bandRows[0] ?? null,
      bands: bandRows,
    };
  });

  const occurrences: TransitionOccurrence[] = [];
  conditions.forEach((condition) => {
    for (let index = 0; index < config.lookahead; index += 1) {
      const item = ordered[condition.end + index];
      if (!item) continue;
      const intervalSeconds = Math.max(0, (item.timestamp - ordered[condition.end - 1].timestamp) / 1000);
      occurrences.push({ conditionDate: condition.dateKey, conditionTimestamp: new Date(condition.timestamp).toISOString(), position: index + 1, timestamp: new Date(item.timestamp).toISOString(), coefficient: item.record.coefficient, intervalSeconds, isTarget: item.record.coefficient >= config.targetMin });
    }
  });

  return { orderedValidCount: ordered.length, conditionCount: conditions.length, distinctConditionDates: new Set(conditions.map((condition) => condition.dateKey)).size, positions, occurrences };
}

export function formatTransitionRate(rate: number): string {
  return `${(rate * 100).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
}

export function formatTransitionInterval(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return '—';
  if (seconds < 60) return `${Math.round(seconds)} s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.round(seconds % 60);
  return remaining === 0 ? `${minutes} min` : `${minutes} min ${remaining} s`;
}
