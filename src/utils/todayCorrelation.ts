import { JsonRecord } from '../types';

export interface CorrelationProfile {
  dateKey: string;
  validCount: number;
  aboveThresholdCount: number;
  aboveThresholdRate: number;
  geometricMean: number | null;
  averageIntervalSeconds: number | null;
  bucketCounts: number[];
}

export interface CorrelationRow {
  profile: CorrelationProfile;
  similarityScore: number | null;
  comparable: boolean;
}

export interface TodayCorrelationResult {
  referenceDateKey: string;
  referenceStartSeconds: number;
  referenceEndSeconds: number;
  elapsedSeconds: number;
  baseProfile: CorrelationProfile | null;
  rows: CorrelationRow[];
  historicalDatesWithData: number;
  minimumRecords: number;
}

function timestampFor(record: JsonRecord): number | null {
  const timestamp = new Date(record.date_utc || record.date_brute).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function dateKeyFor(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function secondsOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  return date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
}

function buildProfile(dateKey: string, items: Array<{ timestamp: number; coefficient: number }>, startSeconds: number, endSeconds: number, threshold: number): CorrelationProfile {
  const ordered = [...items].sort((left, right) => left.timestamp - right.timestamp);
  const coefficients = ordered.map((item) => item.coefficient).filter((coefficient) => coefficient > 0);
  const aboveThresholdCount = ordered.filter((item) => item.coefficient > threshold).length;
  const geometricMean = coefficients.length > 0
    ? Math.exp(coefficients.reduce((sum, coefficient) => sum + Math.log(coefficient), 0) / coefficients.length)
    : null;
  const intervals = ordered.slice(1).map((item, index) => Math.max(0, (item.timestamp - ordered[index].timestamp) / 1000));
  const bucketSize = 5 * 60;
  const bucketCount = Math.max(1, Math.ceil(Math.max(1, endSeconds - startSeconds) / bucketSize));
  const bucketCounts = Array.from({ length: bucketCount }, () => 0);
  ordered.forEach((item) => {
    const bucketIndex = Math.min(bucketCount - 1, Math.max(0, Math.floor((secondsOfDay(item.timestamp) - startSeconds) / bucketSize)));
    bucketCounts[bucketIndex] += 1;
  });
  return {
    dateKey,
    validCount: ordered.length,
    aboveThresholdCount,
    aboveThresholdRate: ordered.length > 0 ? (aboveThresholdCount / ordered.length) * 100 : 0,
    geometricMean,
    averageIntervalSeconds: intervals.length > 0 ? intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length : null,
    bucketCounts,
  };
}

function similarity(a: number, b: number): number {
  const scale = Math.max(Math.abs(a), Math.abs(b), 1);
  return Math.max(0, 1 - Math.abs(a - b) / scale);
}

function bucketSimilarity(left: number[], right: number[]): number {
  const size = Math.max(left.length, right.length);
  const leftTotal = left.reduce((sum, value) => sum + value, 0);
  const rightTotal = right.reduce((sum, value) => sum + value, 0);
  if (leftTotal === 0 && rightTotal === 0) return 1;
  if (leftTotal === 0 || rightTotal === 0) return 0;
  let difference = 0;
  for (let index = 0; index < size; index += 1) {
    difference += Math.abs((left[index] ?? 0) / leftTotal - (right[index] ?? 0) / rightTotal);
  }
  return Math.max(0, 1 - difference / 2);
}

function profileSimilarity(base: CorrelationProfile, candidate: CorrelationProfile): number {
  const components: Array<{ value: number; weight: number }> = [
    { value: similarity(base.validCount, candidate.validCount), weight: 0.2 },
    { value: similarity(base.aboveThresholdRate, candidate.aboveThresholdRate), weight: 0.3 },
    { value: bucketSimilarity(base.bucketCounts, candidate.bucketCounts), weight: 0.25 },
  ];
  if (base.geometricMean !== null && candidate.geometricMean !== null) {
    components.push({ value: similarity(Math.log(base.geometricMean), Math.log(candidate.geometricMean)), weight: 0.15 });
  }
  if (base.averageIntervalSeconds !== null && candidate.averageIntervalSeconds !== null) {
    components.push({ value: similarity(base.averageIntervalSeconds, candidate.averageIntervalSeconds), weight: 0.1 });
  }
  const totalWeight = components.reduce((sum, component) => sum + component.weight, 0);
  return totalWeight > 0 ? (components.reduce((sum, component) => sum + component.value * component.weight, 0) / totalWeight) * 100 : 0;
}

export function calculateTodayCorrelation(
  records: JsonRecord[],
  reference: Date,
  threshold = 15,
  minimumRecords = 5,
): TodayCorrelationResult {
  const referenceDateKey = dateKeyFor(reference.getTime());
  const referenceStartSeconds = reference.getHours() * 3600;
  const elapsedSeconds = Math.max(1, reference.getMinutes() * 60 + reference.getSeconds());
  const referenceEndSeconds = Math.min(referenceStartSeconds + 3600, referenceStartSeconds + elapsedSeconds);
  const valid = records.map((record) => {
    const timestamp = timestampFor(record);
    return timestamp === null || !Number.isFinite(record.coefficient) ? null : { timestamp, coefficient: record.coefficient, dateKey: dateKeyFor(timestamp) };
  }).filter((item): item is { timestamp: number; coefficient: number; dateKey: string } => item !== null);
  const byDate = new Map<string, Array<{ timestamp: number; coefficient: number }>>();
  valid.forEach((item) => {
    const seconds = secondsOfDay(item.timestamp);
    if (seconds < referenceStartSeconds || seconds >= referenceEndSeconds) return;
    const items = byDate.get(item.dateKey) ?? [];
    items.push({ timestamp: item.timestamp, coefficient: item.coefficient });
    byDate.set(item.dateKey, items);
  });
  const baseItems = byDate.get(referenceDateKey) ?? [];
  const baseProfile = baseItems.length > 0 ? buildProfile(referenceDateKey, baseItems, referenceStartSeconds, referenceEndSeconds, threshold) : null;
  const historicalDates = Array.from(byDate.keys()).filter((dateKey) => dateKey !== referenceDateKey).sort();
  const rows = historicalDates.map((dateKey) => {
    const profile = buildProfile(dateKey, byDate.get(dateKey) ?? [], referenceStartSeconds, referenceEndSeconds, threshold);
    const comparable = baseProfile !== null && baseProfile.validCount >= minimumRecords && profile.validCount >= minimumRecords;
    return { profile, comparable, similarityScore: comparable ? profileSimilarity(baseProfile, profile) : null };
  }).sort((left, right) => (right.similarityScore ?? -1) - (left.similarityScore ?? -1) || left.profile.dateKey.localeCompare(right.profile.dateKey));
  return {
    referenceDateKey,
    referenceStartSeconds,
    referenceEndSeconds,
    elapsedSeconds,
    baseProfile,
    rows,
    historicalDatesWithData: historicalDates.length,
    minimumRecords,
  };
}

export function formatCorrelationClock(totalSeconds: number): string {
  const normalized = ((Math.floor(totalSeconds) % 86400) + 86400) % 86400;
  return `${String(Math.floor(normalized / 3600)).padStart(2, '0')}:${String(Math.floor((normalized % 3600) / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
}

export function formatCorrelationPercent(value: number | null): string {
  return value === null ? '—' : `${value.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
}

export function formatCorrelationNumber(value: number | null): string {
  return value === null ? '—' : `${value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}x`;
}

export function formatCorrelationInterval(seconds: number | null): string {
  if (seconds === null) return '—';
  return formatCorrelationClock(seconds);
}

export function formatCorrelationDate(dateKey: string): string {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(`${dateKey}T12:00:00`));
}

export function formatCorrelationHour(reference: Date): string {
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(reference);
}

export function formatCorrelationToday(reference: Date): string {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(reference);
}

export function formatCorrelationBucketLabel(index: number, startSeconds: number): string {
  return `${formatCorrelationClock(startSeconds + index * 300).slice(0, 5)}`;
}
