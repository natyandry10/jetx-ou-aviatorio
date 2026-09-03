import assert from 'node:assert/strict';
import { analyzeConditionalTransitions } from '../src/utils/transitionAnalytics';
import type { JsonRecord } from '../src/types';

function record(id: string, day: number, minute: number, coefficient: number): JsonRecord {
  const timestamp = new Date(2026, 7, day, 9, minute, 0).toISOString();
  return { id, date_brute: timestamp, date_utc: timestamp, coefficient, hash: `transition-${id}` };
}

const records: JsonRecord[] = [
  record('d1-1', 1, 0, 1.2), record('d1-2', 1, 1, 1.3), record('d1-3', 1, 2, 1.4), record('d1-4', 1, 3, 5), record('d1-5', 1, 4, 2),
  record('d2-1', 2, 0, 1.1), record('d2-2', 2, 1, 1.2), record('d2-3', 2, 2, 1.3), record('d2-4', 2, 3, 2), record('d2-5', 2, 4, 6),
];

const result = analyzeConditionalTransitions(records, { sequenceLength: 3, conditionMax: 1.45, targetMin: 4, lookahead: 2, minimumDistinctDates: 2 });
assert.equal(result.conditionCount, 2, 'Deux conditions doivent être détectées.');
assert.equal(result.distinctConditionDates, 2, 'Les conditions doivent couvrir deux dates distinctes.');
assert.equal(result.positions[0].evaluatedCount, 2, 'La position +1 doit avoir deux résultats évalués.');
assert.equal(result.positions[0].targetCount, 1, 'Une seule cible doit apparaître en position +1.');
assert.equal(result.positions[0].distinctTargetDates, 1, 'La cible de +1 doit concerner une seule date.');
assert.equal(result.positions[1].targetCount, 1, 'Une cible doit apparaître en position +2.');
assert.equal(result.occurrences.length, 4, 'Deux conditions sur deux positions donnent quatre détails.');
console.log('conditional-transitions: PASS');
