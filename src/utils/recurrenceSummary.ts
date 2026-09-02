import { JsonRecord } from '../types';

export type RecurrenceGranularity = 5 | 10 | 15 | 30 | 60;

export interface RecurrenceFilters {
  minCoefficient: number;
  maxCoefficient: number | null;
  granularityMinutes: RecurrenceGranularity;
  startMinute: number;
  endMinute: number;
  minimumDays: number;
}

export interface RecurrenceOccurrence {
  id: string;
  hash: string;
  timestamp: number;
  dateKey: string;
  coefficient: number;
  offsetFromSlotStartSeconds: number;
  intervalFromPreviousMatchSeconds: number | null;
}

export interface RecurrenceSlotSummary {
  startMinute: number;
  endMinute: number;
  label: string;
  totalDays: number;
  daysWithMatch: number;
  presenceRate: number;
  occurrenceCount: number;
  minimumCoefficient: number | null;
  maximumCoefficient: number | null;
  occurrences: RecurrenceOccurrence[];
}

export interface RecurrenceWeekdaySummary {
  weekday: number;
  label: string;
  totalDays: number;
  daysWithMatch: number;
  presenceRate: number;
  occurrenceCount: number;
  minimumCoefficient: number | null;
  maximumCoefficient: number | null;
  occurrences: RecurrenceOccurrence[];
}

export interface RecurrenceSummary {
  totalValidRecords: number;
  totalDates: number;
  matchingRecords: number;
  matchingDates: number;
  globalPresenceRate: number;
  slots: RecurrenceSlotSummary[];
  weekdays: RecurrenceWeekdaySummary[];
  strongestSlot: RecurrenceSlotSummary | null;
  strongestWeekday: RecurrenceWeekdaySummary | null;
}

interface TimedRecord {
  timestamp: number;
  dateKey: string;
  minuteOfDay: number;
  weekday: number;
  coefficient: number;
  id: string;
  hash: string;
}

function parseRecord(record: JsonRecord): TimedRecord | null {
  const timestamp = new Date(record.date_utc || record.date_brute).getTime();
  if (!Number.isFinite(timestamp) || !Number.isFinite(record.coefficient)) return null;
  const date = new Date(timestamp);
  return {
    timestamp,
    dateKey: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
    minuteOfDay: date.getHours() * 60 + date.getMinutes(),
    weekday: date.getDay(),
    coefficient: record.coefficient,
    id: record.id,
    hash: record.hash,
  };
}

function formatMinute(minute: number): string {
  const normalized = Math.max(0, Math.min(1439, minute));
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
}

function rangeContains(minute: number, startMinute: number, endMinute: number): boolean {
  return minute >= startMinute && minute < endMinute;
}

function percentage(part: number, total: number): number {
  return total > 0 ? (part / total) * 100 : 0;
}

function coefficientBounds(items: TimedRecord[]): { minimum: number | null; maximum: number | null } {
  if (items.length === 0) return { minimum: null, maximum: null };
  return { minimum: Math.min(...items.map((item) => item.coefficient)), maximum: Math.max(...items.map((item) => item.coefficient)) };
}

function occurrenceDetails(items: TimedRecord[], slotStartMinute: number): RecurrenceOccurrence[] {
  const ordered = [...items].sort((left, right) => left.timestamp - right.timestamp);
  const previousByDate = new Map<string, number>();
  return ordered.map((item) => {
    const previousTimestamp = previousByDate.get(item.dateKey);
    previousByDate.set(item.dateKey, item.timestamp);
    const offsetFromSlotStartSeconds = Math.max(0, (item.minuteOfDay * 60 + (new Date(item.timestamp).getSeconds()) - slotStartMinute * 60));
    return {
      id: item.id,
      hash: item.hash,
      timestamp: item.timestamp,
      dateKey: item.dateKey,
      coefficient: item.coefficient,
      offsetFromSlotStartSeconds,
      intervalFromPreviousMatchSeconds: previousTimestamp === undefined ? null : Math.max(0, (item.timestamp - previousTimestamp) / 1000),
    };
  });
}

export function analyzeRecurrences(records: JsonRecord[], filters: RecurrenceFilters): RecurrenceSummary {
  const parsed = records.map(parseRecord).filter((item): item is TimedRecord => item !== null);
  const inRange = parsed.filter((item) => rangeContains(item.minuteOfDay, filters.startMinute, filters.endMinute));
  const dateKeys = new Set(inRange.map((item) => item.dateKey));
  const matching = inRange.filter((item) => item.coefficient >= filters.minCoefficient && (filters.maxCoefficient === null || item.coefficient <= filters.maxCoefficient));
  const matchingDateKeys = new Set(matching.map((item) => item.dateKey));
  const slots = new Map<number, Map<string, TimedRecord[]>>();
  matching.forEach((item) => {
    const startMinute = Math.floor(item.minuteOfDay / filters.granularityMinutes) * filters.granularityMinutes;
    if (startMinute < filters.startMinute || startMinute >= filters.endMinute) return;
    const byDate = slots.get(startMinute) ?? new Map<string, TimedRecord[]>();
    const items = byDate.get(item.dateKey) ?? [];
    items.push(item);
    byDate.set(item.dateKey, items);
    slots.set(startMinute, byDate);
  });
  const slotSummaries = Array.from(slots.entries()).map(([startMinute, byDate]) => {
    const items = Array.from(byDate.values()).flat();
    const bounds = coefficientBounds(items);
    const endMinute = Math.min(filters.endMinute, startMinute + filters.granularityMinutes);
    return {
      startMinute,
      endMinute,
      label: `${formatMinute(startMinute)}–${formatMinute(endMinute)}`,
      totalDays: dateKeys.size,
      daysWithMatch: byDate.size,
      presenceRate: percentage(byDate.size, dateKeys.size),
      occurrenceCount: items.length,
      minimumCoefficient: bounds.minimum,
      maximumCoefficient: bounds.maximum,
      occurrences: occurrenceDetails(items, startMinute),
    };
  }).filter((slot) => slot.totalDays >= filters.minimumDays && slot.daysWithMatch >= 2).sort((left, right) => right.presenceRate - left.presenceRate || right.daysWithMatch - left.daysWithMatch || left.startMinute - right.startMinute);

  const weekdayMap = new Map<number, { dates: Set<string>; matchingDates: Set<string>; items: TimedRecord[] }>();
  inRange.forEach((item) => {
    const entry = weekdayMap.get(item.weekday) ?? { dates: new Set<string>(), matchingDates: new Set<string>(), items: [] };
    entry.dates.add(item.dateKey);
    weekdayMap.set(item.weekday, entry);
  });
  matching.forEach((item) => {
    const entry = weekdayMap.get(item.weekday) ?? { dates: new Set<string>(), matchingDates: new Set<string>(), items: [] };
    entry.matchingDates.add(item.dateKey);
    entry.items.push(item);
    weekdayMap.set(item.weekday, entry);
  });
  const weekdayLabels = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const weekdays = Array.from(weekdayMap.entries()).map(([weekday, entry]) => {
    const bounds = coefficientBounds(entry.items);
    return {
      weekday,
      label: weekdayLabels[weekday],
      totalDays: entry.dates.size,
      daysWithMatch: entry.matchingDates.size,
      presenceRate: percentage(entry.matchingDates.size, entry.dates.size),
      occurrenceCount: entry.items.length,
      minimumCoefficient: bounds.minimum,
      maximumCoefficient: bounds.maximum,
      occurrences: occurrenceDetails(entry.items, filters.startMinute),
    };
  }).filter((day) => day.totalDays >= filters.minimumDays && day.daysWithMatch >= 2).sort((left, right) => right.presenceRate - left.presenceRate || right.daysWithMatch - left.daysWithMatch || left.weekday - right.weekday);

  return {
    totalValidRecords: parsed.length,
    totalDates: dateKeys.size,
    matchingRecords: matching.length,
    matchingDates: matchingDateKeys.size,
    globalPresenceRate: percentage(matchingDateKeys.size, dateKeys.size),
    slots: slotSummaries,
    weekdays,
    strongestSlot: slotSummaries[0] ?? null,
    strongestWeekday: weekdays[0] ?? null,
  };
}

export function formatRecurrencePercent(value: number): string {
  return `${value.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
}

export function formatRecurrenceCoefficient(value: number | null): string {
  return value === null ? '—' : `${value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}x`;
}

export function formatRecurrenceRange(minimum: number | null, maximum: number | null): string {
  if (minimum === null || maximum === null) return '—';
  return `${formatRecurrenceCoefficient(minimum)} → ${formatRecurrenceCoefficient(maximum)}`;
}
