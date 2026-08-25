import React, { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Database, FileCheck2, Layers3 } from 'lucide-react';
import { ImportSummary, JsonRecord } from '../types';

interface DataQualitySummaryProps {
  records: JsonRecord[];
  lastImport: ImportSummary | null;
}

function formatDate(value?: string): string {
  if (!value) return 'Date inconnue';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date inconnue';
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export const DataQualitySummary: React.FC<DataQualitySummaryProps> = ({ records, lastImport }) => {
  const quality = useMemo(() => {
    const hashCounts = new Map<string, number>();
    records.forEach((record) => {
      if (record.hash) hashCounts.set(record.hash, (hashCounts.get(record.hash) ?? 0) + 1);
    });

    const duplicateHashRows = Array.from(hashCounts.values())
      .filter((count) => count > 1)
      .reduce((total, count) => total + count, 0);

    return {
      uniqueHashes: hashCounts.size,
      duplicateHashRows,
    };
  }, [records]);

  const skippedCount = lastImport?.skippedCount ?? 0;
  const isWarning = skippedCount > 0 || quality.duplicateHashRows > 0;
  const sourceLabel = lastImport
    ? `${lastImport.source === 'drive' ? 'Google Drive' : 'Import local'} — ${lastImport.fileName}`
    : 'Aucun import enregistré dans cette session';

  return (
    <section
      className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs p-4 sm:p-5 space-y-4"
      aria-labelledby="data-quality-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-xl ${isWarning ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400' : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'}`}>
            {isWarning ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          </div>
          <div>
            <h3 id="data-quality-title" className="text-sm font-bold text-slate-900 dark:text-white">
              Qualité des données
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Contrôle rapide du jeu actuellement chargé et du dernier import.
            </p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${isWarning ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'}`}>
          {isWarning ? 'Vérification nécessaire' : 'Données cohérentes'}
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-3">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400"><Database className="w-3.5 h-3.5" /> Lignes actives</div>
          <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{records.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-3">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400"><FileCheck2 className="w-3.5 h-3.5" /> Hash uniques</div>
          <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{quality.uniqueHashes}</p>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-3">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400"><Layers3 className="w-3.5 h-3.5" /> Doublons hash</div>
          <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{quality.duplicateHashRows}</p>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-3">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400"><AlertTriangle className="w-3.5 h-3.5" /> Lignes ignorées</div>
          <p className={`mt-1 text-lg font-bold ${skippedCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>{skippedCount}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
        <span className="inline-flex items-center gap-1.5"><FileCheck2 className="w-3.5 h-3.5" /> Source : <strong className="text-slate-700 dark:text-slate-200">{sourceLabel}</strong></span>
        {lastImport && <span className="inline-flex items-center gap-1.5"><Clock3 className="w-3.5 h-3.5" /> Importé le {formatDate(lastImport.importedAt)}</span>}
        {lastImport && <span className="inline-flex items-center gap-1.5">{lastImport.importedCount} ajoutée(s), {lastImport.duplicateCount} doublon(s) évité(s)</span>}
      </div>
    </section>
  );
};
