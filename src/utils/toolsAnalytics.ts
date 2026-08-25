import { JsonRecord } from '../types';

export type ToolsTemporalGranularity = 'hour' | 'date' | 'weekday' | 'month' | 'year';

export type MultiplierBand = 'low' | 'standard' | 'medium' | 'high' | 'very-high' | 'ultra';

export interface ToolsAnalysisConfig {
  sequenceLength: number;
  minOccurrences: number;
  granularity: ToolsTemporalGranularity;
}

export const DEFAULT_TOOLS_ANALYSIS_CONFIG: ToolsAnalysisConfig = {
  sequenceLength: 3,
  minOccurrences: 2,
  granularity: 'hour',
};

export interface CoefficientBandSummary {
  key: MultiplierBand;
  label: string;
  count: number;
  rate: number;
}

export interface TimeIntervalSummary {
  key: string;
  label: string;
  count: number;
  rate: number;
  averageSeconds: number;
}

export interface TemporalWindowSummary {
  key: string;
  label: string;
  count: number;
  rate: number;
}

export interface ToolSequenceSummary {
  key: string;
  label: string;
  bands: MultiplierBand[];
  occurrences: number;
  rate: number;
  firstSeen: string;
  lastSeen: string;
  averageGapSeconds: number;
  medianGapSeconds: number;
  averageSpanSeconds: number;
  dominantTemporalLabel: string;
}

export interface ToolsAnalysisResult {
  inputCount: number;
  validCount: number;
  ignoredCount: number;
  windowCount: number;
  distinctSequenceCount: number;
  coefficientBands: CoefficientBandSummary[];
  timeIntervals: TimeIntervalSummary[];
  temporalWindows: TemporalWindowSummary[];
  sequences: ToolSequenceSummary[];
  recap: string;
}

interface OrderedRecord {
  record: JsonRecord;
  timestamp: number;
}

interface MutableSequence {
  bands: MultiplierBand[];
  occurrences: Array<{
    timestamps: number[];
    gaps: number[];
  }>;
}

const BAND_DEFINITIONS: Array<{ key: MultiplierBand; label: string; matches: (value: number) => boolean }> = [
  { key: 'low', label: '≤ 1,45x', matches: (value) => value <= 1.45 },
  { key: 'standard', label: '1,46–1,99x', matches: (value) => value < 2 },
  { key: 'medium', label: '2–2,99x', matches: (value) => value < 3 },
  { key: 'high', label: '3–3,99x', matches: (value) => value < 4 },
  { key: 'very-high', label: '4–10x', matches: (value) => value <= 10 },
  { key: 'ultra', label: '> 10x', matches: () => true },
];

const TIME_INTERVAL_DEFINITIONS = [
  { key: 'under-15s', label: '< 15 s', matches: (seconds: number) => seconds < 15 },
  { key: '15-30s', label: '15–30 s', matches: (seconds: number) => seconds < 30 },
  { key: '30-60s', label: '30–60 s', matches: (seconds: number) => seconds < 60 },
  { key: '1-2m', label: '1–2 min', matches: (seconds: number) => seconds < 120 },
  { key: '2-5m', label: '2–5 min', matches: (seconds: number) => seconds < 300 },
  { key: 'over-5m', label: '> 5 min', matches: () => true },
] as const;

const WEEKDAY_LABELS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

function getTimestamp(record: JsonRecord): number | null {
  const timestamp = new Date(record.date_utc || record.date_brute).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function getBand(value: number): { key: MultiplierBand; label: string } {
  const definition = BAND_DEFINITIONS.find((candidate) => candidate.matches(value)) ?? BAND_DEFINITIONS[BAND_DEFINITIONS.length - 1];
  return { key: definition.key, label: definition.label };
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(timestamp));
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return '—';
  if (seconds < 60) return `${Math.round(seconds)} s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.round(seconds % 60);
  return remaining === 0 ? `${minutes} min` : `${minutes} min ${remaining} s`;
}

function percentile(values: number[], ratio: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * ratio;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return lower === upper ? sorted[lower] : sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

function getTemporalBucket(timestamp: number, granularity: ToolsTemporalGranularity): { key: string; label: string } {
  const date = new Date(timestamp);
  if (granularity === 'hour') {
    const hour = String(date.getHours()).padStart(2, '0');
    return { key: hour, label: `${hour}h` };
  }
  if (granularity === 'date') {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return { key, label: new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(date) };
  }
  if (granularity === 'weekday') {
    const weekday = date.getDay();
    return { key: String(weekday).padStart(2, '0'), label: WEEKDAY_LABELS[weekday] };
  }
  if (granularity === 'month') {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return { key, label: new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(date) };
  }
  const key = String(date.getFullYear());
  return { key, label: key };
}

function getGranularityLabel(granularity: ToolsTemporalGranularity): string {
  return {
    hour: 'heure',
    date: 'date',
    weekday: 'jour de la semaine',
    month: 'mois',
    year: 'année',
  }[granularity];
}

function createCoefficientBandSummaries(records: OrderedRecord[]): CoefficientBandSummary[] {
  return BAND_DEFINITIONS.map((definition) => {
    const count = records.filter(({ record }) => getBand(record.coefficient).key === definition.key).length;
    return { key: definition.key, label: definition.label, count, rate: records.length > 0 ? count / records.length : 0 };
  });
}

function createTimeIntervalSummaries(records: OrderedRecord[]): TimeIntervalSummary[] {
  const counts = new Map<string, { count: number; seconds: number[] }>();
  TIME_INTERVAL_DEFINITIONS.forEach((definition) => counts.set(definition.key, { count: 0, seconds: [] }));
  for (let index = 1; index < records.length; index += 1) {
    const seconds = Math.max(0, (records[index].timestamp - records[index - 1].timestamp) / 1000);
    const definition = TIME_INTERVAL_DEFINITIONS.find((candidate) => candidate.matches(seconds)) ?? TIME_INTERVAL_DEFINITIONS[TIME_INTERVAL_DEFINITIONS.length - 1];
    const current = counts.get(definition.key);
    if (current) {
      current.count += 1;
      current.seconds.push(seconds);
    }
  }
  const total = Math.max(records.length - 1, 0);
  return TIME_INTERVAL_DEFINITIONS.map((definition) => {
    const current = counts.get(definition.key) ?? { count: 0, seconds: [] };
    return {
      key: definition.key,
      label: definition.label,
      count: current.count,
      rate: total > 0 ? current.count / total : 0,
      averageSeconds: current.seconds.length > 0 ? current.seconds.reduce((sum, value) => sum + value, 0) / current.seconds.length : 0,
    };
  });
}

function createTemporalWindowSummaries(records: OrderedRecord[], sequenceLength: number, granularity: ToolsTemporalGranularity): TemporalWindowSummary[] {
  const counts = new Map<string, { label: string; count: number }>();
  for (let index = 0; index + sequenceLength <= records.length; index += 1) {
    const bucket = getTemporalBucket(records[index].timestamp, granularity);
    const current = counts.get(bucket.key) ?? { label: bucket.label, count: 0 };
    current.count += 1;
    counts.set(bucket.key, current);
  }
  const total = Math.max(records.length - sequenceLength + 1, 0);
  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => ({ key, label: value.label, count: value.count, rate: total > 0 ? value.count / total : 0 }));
}

function sequenceLabel(bands: MultiplierBand[]): string {
  return bands.map((band) => BAND_DEFINITIONS.find((definition) => definition.key === band)?.label ?? band).join(' → ');
}

export function analyzeTools(records: JsonRecord[], inputConfig: Partial<ToolsAnalysisConfig> = {}): ToolsAnalysisResult {
  const config: ToolsAnalysisConfig = {
    ...DEFAULT_TOOLS_ANALYSIS_CONFIG,
    ...inputConfig,
    sequenceLength: Math.min(12, Math.max(2, Math.floor(inputConfig.sequenceLength ?? DEFAULT_TOOLS_ANALYSIS_CONFIG.sequenceLength))),
    minOccurrences: Math.min(100, Math.max(1, Math.floor(inputConfig.minOccurrences ?? DEFAULT_TOOLS_ANALYSIS_CONFIG.minOccurrences))),
  };

  const orderedRecords = records
    .map((record) => ({ record, timestamp: getTimestamp(record) }))
    .filter((item): item is OrderedRecord => item.timestamp !== null && Number.isFinite(item.record.coefficient))
    .sort((left, right) => left.timestamp - right.timestamp || left.record.id.localeCompare(right.record.id));

  const sequenceMap = new Map<string, MutableSequence>();
  const windowCount = Math.max(orderedRecords.length - config.sequenceLength + 1, 0);
  for (let start = 0; start < windowCount; start += 1) {
    const window = orderedRecords.slice(start, start + config.sequenceLength);
    const bands = window.map(({ record }) => getBand(record.coefficient).key);
    const key = bands.join('|');
    const timestamps = window.map(({ timestamp }) => timestamp);
    const gaps = timestamps.slice(1).map((timestamp, index) => Math.max(0, (timestamp - timestamps[index]) / 1000));
    const current = sequenceMap.get(key) ?? { bands, occurrences: [] };
    current.occurrences.push({ timestamps, gaps });
    sequenceMap.set(key, current);
  }

  const totalWindows = Math.max(windowCount, 1);
  const sequences = [...sequenceMap.entries()]
    .filter(([, sequence]) => sequence.occurrences.length >= config.minOccurrences)
    .map(([key, sequence]) => {
      const allGaps = sequence.occurrences.flatMap((occurrence) => occurrence.gaps);
      const timestamps = sequence.occurrences.flatMap((occurrence) => occurrence.timestamps);
      const temporalCounts = new Map<string, number>();
      sequence.occurrences.forEach((occurrence) => {
        const bucket = getTemporalBucket(occurrence.timestamps[0], config.granularity);
        temporalCounts.set(bucket.label, (temporalCounts.get(bucket.label) ?? 0) + 1);
      });
      const dominantTemporalLabel = [...temporalCounts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0]?.[0] ?? '—';
      return {
        key,
        label: sequenceLabel(sequence.bands),
        bands: sequence.bands,
        occurrences: sequence.occurrences.length,
        rate: sequence.occurrences.length / totalWindows,
        firstSeen: formatDate(Math.min(...timestamps)),
        lastSeen: formatDate(Math.max(...timestamps)),
        averageGapSeconds: allGaps.length > 0 ? allGaps.reduce((sum, value) => sum + value, 0) / allGaps.length : 0,
        medianGapSeconds: percentile(allGaps, 0.5),
        averageSpanSeconds: sequence.occurrences.length > 0
          ? sequence.occurrences.reduce((sum, occurrence) => sum + (occurrence.timestamps[occurrence.timestamps.length - 1] - occurrence.timestamps[0]) / 1000, 0) / sequence.occurrences.length
          : 0,
        dominantTemporalLabel,
      };
    })
    .sort((left, right) => right.occurrences - left.occurrences || right.rate - left.rate || left.label.localeCompare(right.label));

  const coefficientBands = createCoefficientBandSummaries(orderedRecords);
  const timeIntervals = createTimeIntervalSummaries(orderedRecords);
  const temporalWindows = createTemporalWindowSummaries(orderedRecords, config.sequenceLength, config.granularity);
  const topSequence = sequences[0];
  const dominantInterval = timeIntervals.filter((interval) => interval.count > 0).sort((left, right) => right.count - left.count)[0];
  const temporalLabel = getGranularityLabel(config.granularity);
  const recap = orderedRecords.length === 0
    ? 'Aucune donnée chronologique valide à analyser.'
    : windowCount === 0
      ? `Il faut au moins ${config.sequenceLength} résultats valides pour former une chaîne de cette longueur.`
      : topSequence
        ? `Sur ${windowCount} fenêtre(s) chronologique(s), la chaîne la plus fréquente est « ${topSequence.label} » : ${topSequence.occurrences} occurrence(s), soit ${(topSequence.rate * 100).toFixed(1)} % des fenêtres. Son intervalle moyen entre résultats est ${formatDuration(topSequence.averageGapSeconds)} et elle apparaît le plus souvent le ${temporalLabel} « ${topSequence.dominantTemporalLabel} ». Ces pourcentages décrivent uniquement l’échantillon filtré et ne prédisent pas le prochain résultat.`
        : `Aucune chaîne n’atteint le minimum de ${config.minOccurrences} occurrence(s) dans les ${windowCount} fenêtre(s) analysées. Essaie une longueur plus courte ou un minimum d’occurrences égal à 1.`;

  return {
    inputCount: records.length,
    validCount: orderedRecords.length,
    ignoredCount: records.length - orderedRecords.length,
    windowCount,
    distinctSequenceCount: sequenceMap.size,
    coefficientBands,
    timeIntervals,
    temporalWindows,
    sequences,
    recap,
  };
}

export function formatToolsDuration(seconds: number): string {
  return formatDuration(seconds);
}

export function toolsGranularityLabel(granularity: ToolsTemporalGranularity): string {
  return getGranularityLabel(granularity);
}
