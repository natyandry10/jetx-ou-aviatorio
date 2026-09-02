import assert from 'node:assert/strict';
import { analyzeRecurrences } from '../src/utils/recurrenceSummary';
import type { JsonRecord } from '../src/types';

function record(id: string, year: number, month: number, day: number, hour: number, minute: number, second: number, coefficient: number): JsonRecord {
  const timestamp = new Date(year, month - 1, day, hour, minute, second).toISOString();
  return { id, date_brute: timestamp, date_utc: timestamp, coefficient, hash: `hash-${id}` };
}

const filters = {
  minCoefficient: 15,
  maxCoefficient: null,
  granularityMinutes: 15 as const,
  startMinute: 0,
  endMinute: 1440,
  minimumDays: 2,
};

const multiDateRecords = [
  record('day-1-a', 2026, 8, 1, 9, 16, 10, 20),
  record('day-1-b', 2026, 8, 1, 9, 17, 20, 25),
  record('day-2-a', 2026, 8, 2, 9, 16, 30, 22),
  record('day-3-a', 2026, 8, 8, 9, 18, 40, 30),
];

const multiDateSummary = analyzeRecurrences(multiDateRecords, filters);
const nineFifteenSlot = multiDateSummary.slots.find((slot) => slot.startMinute === 9 * 60 + 15);
assert.ok(nineFifteenSlot, 'Le créneau 09:15–09:30 doit être reconnu sur plusieurs dates.');
assert.equal(nineFifteenSlot.daysWithMatch, 3, 'Le créneau doit compter trois dates distinctes.');
assert.equal(nineFifteenSlot.occurrenceCount, 4, 'Les lignes du même jour restent des occurrences détaillées.');
assert.equal(multiDateSummary.weekdays.find((day) => day.label === 'samedi')?.totalDays, 2, 'Le samedi doit couvrir deux dates distinctes.');
assert.equal(multiDateSummary.weekdays.find((day) => day.label === 'samedi')?.daysWithMatch, 2, 'La récurrence du samedi doit être confirmée sur deux dates.');

const sameDateSummary = analyzeRecurrences(multiDateRecords.slice(0, 2), filters);
assert.equal(sameDateSummary.slots.length, 0, 'Plusieurs occurrences sur une seule date ne doivent pas être une récurrence.');
assert.equal(sameDateSummary.weekdays.length, 0, 'Une seule date ne doit pas créer une récurrence de jour.');

console.log('recurrence-distinct-dates: PASS');
