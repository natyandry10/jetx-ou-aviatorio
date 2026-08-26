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
  medianDelaySeconds: number | null;
  minDelaySeconds: number | null;
  maxDelaySeconds: number | null;
  matchMode: 'band-and-interval' | 'bands-only-fallback' | 'none';
  medianTargetCoefficient: number | null;
  p25TargetCoefficient: number | null;
  p75TargetCoefficient: number | null;
  estimatedNextTimestamp: string | null;
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

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function percentile(values: number[], ratio: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const position = (sorted.length - 1) * ratio;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return lower === upper ? sorted[lower] : sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

export function analyzeLiveSimilarity(records: JsonRecord[], inputConfig: Partial<SimilarityConfig> = {}): SimilarityResult {
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
  const currentWindow = ordered.slice(-config.lookback);
  const empty: SimilarityResult = { orderedValidCount: ordered.length, currentWindow: buildSteps(currentWindow, config), matches: [], matchCount: 0, lookback: config.lookback, threshold: config.threshold, horizonMinutes: config.horizonMinutes, targetCount: 0, noTargetCount: 0, targetRate: 0, medianDelaySeconds: null, minDelaySeconds: null, maxDelaySeconds: null, medianTargetCoefficient: null, p25TargetCoefficient: null, p75TargetCoefficient: null, estimatedNextTimestamp: null, matchMode: 'none' };
  if (currentWindow.length < config.lookback) return empty;

  const currentBandSignature = currentWindow.map((item) => token(item.record.coefficient, config)).join('|');
  const currentStartIndex = ordered.length - config.lookback;
  const candidateStarts: number[] = [];
  const strictStarts: number[] = [];
  for (let start = 0; start + config.lookback < currentStartIndex; start += 1) {
    const window = ordered.slice(start, start + config.lookback);
    if (window.map((item) => token(item.record.coefficient, config)).join('|') !== currentBandSignature) continue;
    candidateStarts.push(start);
    const intervalsMatch = window.every((item, index) => index === 0 || Math.abs((item.timestamp - window[index - 1].timestamp) / 1000 - (currentWindow[index].timestamp - currentWindow[index - 1].timestamp) / 1000) <= config.intervalToleranceSeconds);
    if (intervalsMatch) strictStarts.push(start);
  }
  const startsToAnalyze = strictStarts.length > 0 ? strictStarts : candidateStarts;
  const matchMode: SimilarityResult['matchMode'] = strictStarts.length > 0 ? 'band-and-interval' : candidateStarts.length > 0 ? 'bands-only-fallback' : 'none';
  const matches: SimilarityMatch[] = [];
  for (const start of startsToAnalyze) {
    const window = ordered.slice(start, start + config.lookback);
    const endTimestamp = window.at(-1)!.timestamp;
    const horizonEnd = endTimestamp + config.horizonMinutes * 60 * 1000;
    const nextTarget = ordered.slice(start + config.lookback).find((item) => item.timestamp <= horizonEnd && item.record.coefficient > config.threshold);
    matches.push({
      matchedAt: new Date(endTimestamp).toISOString(),
      steps: buildSteps(window, config),
      nextTarget: nextTarget ? { timestamp: new Date(nextTarget.timestamp).toISOString(), coefficient: nextTarget.record.coefficient, delaySeconds: Math.max(0, (nextTarget.timestamp - endTimestamp) / 1000) } : null,
    });
  }
  const delays = matches.map((match) => match.nextTarget?.delaySeconds).filter((value): value is number => value !== undefined);
  const targetCoefficients = matches.map((match) => match.nextTarget?.coefficient).filter((value): value is number => value !== undefined);
  const medianDelaySeconds = median(delays);
  const estimatedNextTimestamp = medianDelaySeconds !== null ? new Date(currentWindow.at(-1)!.timestamp + medianDelaySeconds * 1000).toISOString() : null;
  return {
    orderedValidCount: ordered.length,
    currentWindow: buildSteps(currentWindow, config),
    matches: matches.slice(-50).reverse(),
    matchCount: matches.length,
    lookback: config.lookback,
    threshold: config.threshold,
    horizonMinutes: config.horizonMinutes,
    targetCount: delays.length,
    noTargetCount: matches.length - delays.length,
    targetRate: matches.length > 0 ? delays.length / matches.length : 0,
    medianDelaySeconds: median(delays),
    minDelaySeconds: delays.length > 0 ? Math.min(...delays) : null,
    maxDelaySeconds: delays.length > 0 ? Math.max(...delays) : null,
    matchMode,
    medianTargetCoefficient: median(targetCoefficients),
    p25TargetCoefficient: percentile(targetCoefficients, 0.25),
    p75TargetCoefficient: percentile(targetCoefficients, 0.75),
    estimatedNextTimestamp,
  };
}
