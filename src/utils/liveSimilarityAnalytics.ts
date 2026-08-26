import { JsonRecord } from '../types';
import { getMultiplierBand } from './precedingAnalytics';

export interface SimilarityConfig {
  lookback: number;
  threshold: number;
  horizonMinutes: number;
  mode: 'bands' | 'exact';
  exactPrecision: number;
  intervalToleranceSeconds: number;
}

export interface SimilarityStep {
  timestamp: string;
  coefficient: number;
  band: string;
  intervalSeconds: number | null;
}

export interface SimilarityMatch {
  matchedAt: string;
  steps: SimilarityStep[];
  nextTarget: { timestamp: string; coefficient: number; delaySeconds: number } | null;
}

export interface DominantInterval {
  label: string;
  lowerSeconds: number;
  upperSeconds: number | null;
  count: number;
  sampleSize: number;
}

export interface SimilarityResult {
  orderedValidCount: number;
  currentWindow: SimilarityStep[];
  matches: SimilarityMatch[];
  matchCount: number;
  lookback: number;
  threshold: number;
  horizonMinutes: number;
  targetCount: number;
  noTargetCount: number;
  targetRate: number;
  centralDelaySeconds: number | null;
  delayP25Seconds: number | null;
  delayP75Seconds: number | null;
  minDelaySeconds: number | null;
  maxDelaySeconds: number | null;
  dominantInterval: DominantInterval | null;
  matchMode: 'band-and-interval' | 'bands-only-fallback' | 'none';
  calculationRoute: 'historical' | 'direct';
  centralTargetCoefficient: number | null;
  p25TargetCoefficient: number | null;
  p75TargetCoefficient: number | null;
  estimatedNextTimestamp: string | null;
  delayMethod: 'trimmed-mean-20%' | 'arithmetic-mean-small-sample' | null;
  coefficientMethod: 'geometric-mean' | null;
}

const DEFAULT_CONFIG: SimilarityConfig = {
  lookback: 5,
  threshold: 30,
  horizonMinutes: 60,
  mode: 'bands',
  exactPrecision: 2,
  intervalToleranceSeconds: 20,
};

interface TimedRecord {
  record: JsonRecord;
  timestamp: number;
}

function getValidRecords(records: JsonRecord[]): TimedRecord[] {
  return records.map((record) => ({ record, timestamp: new Date(record.date_utc || record.date_brute).getTime() })).filter((item): item is TimedRecord => Number.isFinite(item.timestamp) && Number.isFinite(item.record.coefficient)).sort((left, right) => left.timestamp - right.timestamp || left.record.id.localeCompare(right.record.id));
}

function roundedToken(value: number, precision: number): string {
  const factor = 10 ** precision;
  return `${Math.round(value * factor) / factor}`;
}

function intervalBucket(seconds: number): string {
  return String(Math.max(0, Math.round(seconds / 10) * 10));
}

function token(value: number, config: SimilarityConfig): string {
  return config.mode === 'bands' ? getMultiplierBand(value) : roundedToken(value, config.exactPrecision);
}

function buildSteps(window: TimedRecord[], config: SimilarityConfig): SimilarityStep[] {
  return window.map((item, index) => ({
    timestamp: new Date(item.timestamp).toISOString(),
    coefficient: item.record.coefficient,
    band: getMultiplierBand(item.record.coefficient),
    intervalSeconds: index > 0 ? Math.max(0, (item.timestamp - window[index - 1].timestamp) / 1000) : null,
  }));
}

function signature(window: TimedRecord[], config: SimilarityConfig): string {
  return window.map((item, index) => `${token(item.record.coefficient, config)}:${index > 0 ? intervalBucket((item.timestamp - window[index - 1].timestamp) / 1000) : 'start'}`).join('|');
}

function arithmeticMean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function trimmedMean(values: number[], trimFraction = 0.1): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].filter(Number.isFinite).sort((left, right) => left - right);
  if (sorted.length === 0) return null;
  const trimCount = sorted.length >= 5 ? Math.min(Math.floor(sorted.length * trimFraction), Math.floor((sorted.length - 1) / 2)) : 0;
  return arithmeticMean(sorted.slice(trimCount, sorted.length - trimCount));
}

function geometricMean(values: number[]): number | null {
  const positive = values.filter((value) => Number.isFinite(value) && value > 0);
  if (positive.length === 0) return null;
  return Math.exp(positive.reduce((sum, value) => sum + Math.log(value), 0) / positive.length);
}

function percentile(values: number[], ratio: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const position = (sorted.length - 1) * ratio;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return lower === upper ? sorted[lower] : sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

function intervalBand(seconds: number): { label: string; lowerSeconds: number; upperSeconds: number | null } {
  if (seconds < 15) return { label: '< 00:00:15', lowerSeconds: 0, upperSeconds: 15 };
  if (seconds < 30) return { label: '00:00:15–00:00:30', lowerSeconds: 15, upperSeconds: 30 };
  if (seconds < 60) return { label: '00:00:30–00:01:00', lowerSeconds: 30, upperSeconds: 60 };
  if (seconds < 300) return { label: '00:01:00–00:05:00', lowerSeconds: 60, upperSeconds: 300 };
  return { label: '≥ 00:05:00', lowerSeconds: 300, upperSeconds: null };
}

function dominantInterval(values: number[]): DominantInterval | null {
  const finiteValues = values.filter((value) => Number.isFinite(value) && value >= 0);
  if (finiteValues.length === 0) return null;
  const grouped = new Map<string, DominantInterval>();
  finiteValues.forEach((value) => {
    const band = intervalBand(value);
    const existing = grouped.get(band.label);
    if (existing) existing.count += 1;
    else grouped.set(band.label, { ...band, count: 1, sampleSize: finiteValues.length });
  });
  return [...grouped.values()].sort((left, right) => right.count - left.count || left.lowerSeconds - right.lowerSeconds)[0] ?? null;
}

function buildProjectionMetrics(delays: number[], targetCoefficients: number[]): Pick<SimilarityResult, 'centralDelaySeconds' | 'delayP25Seconds' | 'delayP75Seconds' | 'minDelaySeconds' | 'maxDelaySeconds' | 'dominantInterval' | 'centralTargetCoefficient' | 'p25TargetCoefficient' | 'p75TargetCoefficient' | 'delayMethod' | 'coefficientMethod'> {
  return {
    centralDelaySeconds: delays.length >= 10 ? trimmedMean(delays) : arithmeticMean(delays),
    delayP25Seconds: percentile(delays, 0.25),
    delayP75Seconds: percentile(delays, 0.75),
    minDelaySeconds: delays.length > 0 ? Math.min(...delays) : null,
    maxDelaySeconds: delays.length > 0 ? Math.max(...delays) : null,
    dominantInterval: dominantInterval(delays),
    centralTargetCoefficient: geometricMean(targetCoefficients),
    p25TargetCoefficient: percentile(targetCoefficients, 0.25),
    p75TargetCoefficient: percentile(targetCoefficients, 0.75),
    delayMethod: delays.length === 0 ? null : delays.length >= 10 ? 'trimmed-mean-20%' : 'arithmetic-mean-small-sample',
    coefficientMethod: targetCoefficients.length > 0 ? 'geometric-mean' : null,
  };
}

export function analyzeLiveSimilarity(records: JsonRecord[], inputConfig: Partial<SimilarityConfig> = {}, selectedRecords?: JsonRecord[]): SimilarityResult {
  const config: SimilarityConfig = {
    ...DEFAULT_CONFIG,
    ...inputConfig,
    lookback: Math.min(20, Math.max(2, Math.floor(inputConfig.lookback ?? DEFAULT_CONFIG.lookback))),
    threshold: Number.isFinite(inputConfig.threshold) ? Math.max(0, inputConfig.threshold as number) : DEFAULT_CONFIG.threshold,
    horizonMinutes: Math.min(24 * 60, Math.max(1, Math.floor(inputConfig.horizonMinutes ?? DEFAULT_CONFIG.horizonMinutes))),
    exactPrecision: Math.min(4, Math.max(0, Math.floor(inputConfig.exactPrecision ?? DEFAULT_CONFIG.exactPrecision))),
    intervalToleranceSeconds: Math.min(300, Math.max(0, Number(inputConfig.intervalToleranceSeconds ?? DEFAULT_CONFIG.intervalToleranceSeconds))),
  };
  const ordered = getValidRecords(records);
  const selectedWindow = selectedRecords && selectedRecords.length > 0 ? getValidRecords(selectedRecords) : null;
  const currentWindow = selectedWindow && selectedWindow.length > 0 ? selectedWindow : ordered.slice(-config.lookback);
  const effectiveLookback = currentWindow.length;
  const empty: SimilarityResult = { orderedValidCount: ordered.length, currentWindow: buildSteps(currentWindow, config), matches: [], matchCount: 0, lookback: effectiveLookback, threshold: config.threshold, horizonMinutes: config.horizonMinutes, targetCount: 0, noTargetCount: 0, targetRate: 0, centralDelaySeconds: null, delayP25Seconds: null, delayP75Seconds: null, minDelaySeconds: null, maxDelaySeconds: null, dominantInterval: null, centralTargetCoefficient: null, p25TargetCoefficient: null, p75TargetCoefficient: null, estimatedNextTimestamp: null, delayMethod: null, coefficientMethod: null, matchMode: 'none', calculationRoute: 'direct' };
  if (currentWindow.length < 2) return empty;

  const currentBandSignature = currentWindow.map((item) => token(item.record.coefficient, config)).join('|');
  const excludedIds = new Set(currentWindow.map((item) => item.record.id));
  const candidateStarts: number[] = [];
  const strictStarts: number[] = [];
  for (let start = 0; start + effectiveLookback <= ordered.length; start += 1) {
    const window = ordered.slice(start, start + effectiveLookback);
    if (window.some((item) => excludedIds.has(item.record.id))) continue;
    if (window.map((item) => token(item.record.coefficient, config)).join('|') !== currentBandSignature) continue;
    candidateStarts.push(start);
    const intervalsMatch = window.every((item, index) => index === 0 || Math.abs((item.timestamp - window[index - 1].timestamp) / 1000 - (currentWindow[index].timestamp - currentWindow[index - 1].timestamp) / 1000) <= config.intervalToleranceSeconds);
    if (intervalsMatch) strictStarts.push(start);
  }
  const startsToAnalyze = strictStarts.length > 0 ? strictStarts : candidateStarts;
  const matchMode: SimilarityResult['matchMode'] = strictStarts.length > 0 ? 'band-and-interval' : candidateStarts.length > 0 ? 'bands-only-fallback' : 'none';
  const matches: SimilarityMatch[] = [];
  for (const start of startsToAnalyze) {
    const window = ordered.slice(start, start + effectiveLookback);
    const endTimestamp = window.at(-1)!.timestamp;
    const horizonEnd = endTimestamp + config.horizonMinutes * 60 * 1000;
    const nextTarget = ordered.slice(start + effectiveLookback).find((item) => item.timestamp <= horizonEnd && item.record.coefficient > config.threshold);
    matches.push({
      matchedAt: new Date(endTimestamp).toISOString(),
      steps: buildSteps(window, config),
      nextTarget: nextTarget ? { timestamp: new Date(nextTarget.timestamp).toISOString(), coefficient: nextTarget.record.coefficient, delaySeconds: Math.max(0, (nextTarget.timestamp - endTimestamp) / 1000) } : null,
    });
  }
  const delays = matches.map((match) => match.nextTarget?.delaySeconds).filter((value): value is number => value !== undefined);
  const targetCoefficients = matches.map((match) => match.nextTarget?.coefficient).filter((value): value is number => value !== undefined);
  if (startsToAnalyze.length === 0 || delays.length === 0) {
    const selectedCoefficients = currentWindow.map((item) => item.record.coefficient);
    const selectedIntervals = currentWindow.slice(1).map((item, index) => Math.max(0, (item.timestamp - currentWindow[index].timestamp) / 1000));
    const directTargetCount = selectedCoefficients.filter((value) => value > config.threshold).length;
    const metrics = buildProjectionMetrics(selectedIntervals, selectedCoefficients);
    return {
      orderedValidCount: ordered.length,
      currentWindow: buildSteps(currentWindow, config),
      matches: [],
      matchCount: 0,
      lookback: effectiveLookback,
      threshold: config.threshold,
      horizonMinutes: config.horizonMinutes,
      targetCount: directTargetCount,
      noTargetCount: selectedCoefficients.length - directTargetCount,
      targetRate: selectedCoefficients.length > 0 ? directTargetCount / selectedCoefficients.length : 0,
      ...metrics,
      matchMode: 'none',
      calculationRoute: 'direct',
      estimatedNextTimestamp: metrics.centralDelaySeconds !== null ? new Date(currentWindow.at(-1)!.timestamp + metrics.centralDelaySeconds * 1000).toISOString() : null,
    };
  }
  const metrics = buildProjectionMetrics(delays, targetCoefficients);
  const estimatedNextTimestamp = metrics.centralDelaySeconds !== null ? new Date(currentWindow.at(-1)!.timestamp + metrics.centralDelaySeconds * 1000).toISOString() : null;
  return {
    orderedValidCount: ordered.length,
    currentWindow: buildSteps(currentWindow, config),
    matches: matches.slice(-50).reverse(),
    matchCount: matches.length,
    lookback: effectiveLookback,
    threshold: config.threshold,
    horizonMinutes: config.horizonMinutes,
    targetCount: delays.length,
    noTargetCount: matches.length - delays.length,
    targetRate: matches.length > 0 ? delays.length / matches.length : 0,
    ...metrics,
    estimatedNextTimestamp,
    matchMode,
    calculationRoute: 'historical',
  };
}
