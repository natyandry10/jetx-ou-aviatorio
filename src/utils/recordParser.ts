import { JsonRecord } from '../types';
import { createRecordId } from './storage';

export interface RecordParseResult {
  records: JsonRecord[];
  warnings: string[];
  skippedCount: number;
  nonDataCount: number;
}

function isValidDate(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '' && !Number.isNaN(new Date(value).getTime());
}

export function parseJsonRecords(input: unknown, source = 'JSON'): RecordParseResult {
  if (!Array.isArray(input)) {
    throw new Error(`${source} doit contenir une liste (tableau [...]) d'objets.`);
  }

  if (input.length === 0) {
    throw new Error(`${source} est vide (0 élément).`);
  }

  const warnings: string[] = [];
  const records: JsonRecord[] = [];
  let skippedCount = 0;
  let nonDataCount = 0;

  input.forEach((item, index) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      skippedCount += 1;
      warnings.push(`Ligne ${index + 1} ignorée : l'élément n'est pas un objet.`);
      return;
    }

    const sourceRecord = item as Record<string, unknown>;
    const dateBrute = sourceRecord.date_brute ?? sourceRecord.date ?? sourceRecord.timestamp;
    const dateUtc = sourceRecord.date_utc ?? sourceRecord.utc ?? dateBrute;
    const marker = typeof dateBrute === 'string' ? dateBrute.trim().toUpperCase() : '';
    const isNonDataStatus = (marker === 'JEU EN COURS' || marker === 'GAME IN PROGRESS') && typeof dateUtc === 'string' && dateUtc.trim() === '';
    if (isNonDataStatus) {
      nonDataCount += 1;
      return;
    }
    const coefficientValue = sourceRecord.coefficient ?? sourceRecord.multiplier ?? sourceRecord.coeff;
    const hash = sourceRecord.hash ?? sourceRecord.sha256;
    const coefficient = Number(coefficientValue);
    const normalizedDateBrute = isValidDate(dateBrute) ? dateBrute : null;
    const normalizedDateUtc = isValidDate(dateUtc) ? dateUtc : normalizedDateBrute;
    const normalizedHash = typeof hash === 'string' && hash.trim() !== '' ? hash : null;
    const problems: string[] = [];

    if (!normalizedDateBrute) problems.push('date_brute invalide');
    if (dateUtc !== undefined && !normalizedDateUtc) problems.push('date_utc invalide');
    if (!Number.isFinite(coefficient)) problems.push('coefficient invalide');
    if (!normalizedHash) problems.push('hash invalide');

    if (problems.length > 0) {
      skippedCount += 1;
      warnings.push(`Ligne ${index + 1} ignorée : ${problems.join(', ')}.`);
      return;
    }

    records.push({
      id: createRecordId('imported'),
      date_brute: normalizedDateBrute,
      date_utc: normalizedDateUtc ?? normalizedDateBrute,
      coefficient,
      hash: normalizedHash,
    });
  });

  if (records.length === 0) {
    throw new Error(`Aucun enregistrement valide n'a été trouvé dans ${source}.`);
  }

  if (warnings.length > 0) {
    warnings.unshift(`${warnings.length} ligne(s) invalide(s) ignorée(s) dans ${source}.`);
  }

  return { records, warnings, skippedCount, nonDataCount };
}
