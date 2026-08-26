import React, { useMemo, useState } from 'react';
import { BarChart3, CalendarClock, ChevronRight, FileSearch, RotateCcw, Table2, Wrench } from 'lucide-react';
import { JsonRecord } from '../types';
import { analyzeScrapTesting, ScrapGranularity, ScrapPeriodStat } from '../utils/scrapAnalytics';

interface ScrapTestingViewProps {
  filteredRecords: JsonRecord[];
  onNavigateToSaisie: () => void;
  onNavigateToAnalyse: () => void;
  onNavigateToTools: () => void;
}

const granularityOptions: Array<{ value: ScrapGranularity; label: string }> = [
  { value: 'hour', label: 'Heure' },
  { value: 'day', label: 'Jour' },
  { value: 'month', label: 'Mois' },
  { value: 'year', label: 'Année' },
];

function formatValue(value: number): string {
  return `${value.toFixed(2)}x`;
}

function formatRate(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatThreshold(value: number): string {
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2);
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date inconnue';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'medium' }).format(date);
}

function formatClock(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(date);
}

function formatSpan(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return '—';
  const safeSeconds = Math.max(0, Math.round(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function coefficientClass(value: number): string {
  if (value >= 100) return 'border-fuchsia-300 bg-fuchsia-100 text-fuchsia-800 dark:border-fuchsia-800 dark:bg-fuchsia-950/50 dark:text-fuchsia-200';
  if (value > 30) return 'border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200';
  if (value >= 10) return 'border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200';
  return 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200';
}

function getHighestCount(rows: ScrapPeriodStat[]): ScrapPeriodStat | null {
  return rows.reduce<ScrapPeriodStat | null>((best, row) => !best || row.above30Count > best.above30Count || (row.above30Count === best.above30Count && row.above30Rate > best.above30Rate) ? row : best, null);
}

function getStrongestRate(rows: ScrapPeriodStat[], minimumRows: number): ScrapPeriodStat | null {
  return rows.filter((row) => row.totalCount >= minimumRows).reduce<ScrapPeriodStat | null>((best, row) => !best || row.above30Rate > best.above30Rate || (row.above30Rate === best.above30Rate && row.above30Count > best.above30Count) ? row : best, null);
}

export const ScrapTestingView: React.FC<ScrapTestingViewProps> = ({ filteredRecords, onNavigateToSaisie, onNavigateToAnalyse, onNavigateToTools }) => {
  const [granularity, setGranularity] = useState<ScrapGranularity>('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [thresholdInput, setThresholdInput] = useState('30');
  const [minimumRowsInput, setMinimumRowsInput] = useState('10');
  const [showOnlyWithHits, setShowOnlyWithHits] = useState(false);
  const [selectedPeriodKey, setSelectedPeriodKey] = useState<string | null>(null);

  const threshold = Number.isFinite(Number(thresholdInput)) ? Math.max(0, Number(thresholdInput)) : 30;
  const minimumRows = Number.isFinite(Number(minimumRowsInput)) ? Math.max(1, Math.floor(Number(minimumRowsInput))) : 10;
  const invalidDateRange = Boolean(startDate && endDate && startDate > endDate);
  const result = useMemo(() => analyzeScrapTesting(filteredRecords, { startDate, endDate, threshold }), [filteredRecords, startDate, endDate, threshold]);
  const rows = result.byGranularity[granularity];
  const visibleRows = showOnlyWithHits ? rows.filter((row) => row.above30Count > 0) : rows;
  const selectedPeriod = visibleRows.find((row) => row.key === selectedPeriodKey) ?? visibleRows[0] ?? null;
  const highestCount = getHighestCount(visibleRows);
  const strongestRate = getStrongestRate(visibleRows, minimumRows);
  const maxRecord = result.validRecords.reduce<typeof result.validRecords[number] | null>((best, record) => !best || record.coefficient > best.coefficient ? record : best, null);
  const periodLabel = granularityOptions.find((option) => option.value === granularity)?.label ?? 'Période';

  const resetScrapFilters = () => {
    setGranularity('month');
    setStartDate('');
    setEndDate('');
    setThresholdInput('30');
    setMinimumRowsInput('10');
    setShowOnlyWithHits(false);
    setSelectedPeriodKey(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in duration-300">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-rose-700 dark:text-rose-300"><FileSearch className="h-4 w-4" />Rubrique SCRAP TESTING</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">Top 30 et concentration des multiplicateurs &gt;{formatThreshold(threshold)}x</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">Classement historique des plus grands coefficients et repérage des périodes où les résultats au-dessus du seuil sont les plus nombreux ou les plus fréquents.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onNavigateToAnalyse} className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 dark:border-indigo-900/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"><BarChart3 className="h-4 w-4" />Analyse</button>
          <button type="button" onClick={onNavigateToTools} className="inline-flex items-center gap-2 rounded-xl border border-cyan-200 dark:border-cyan-900/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-cyan-700 dark:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-950/40"><Wrench className="h-4 w-4" />Tools</button>
          <button type="button" onClick={onNavigateToSaisie} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-500"><Table2 className="h-4 w-4" />Saisie</button>
        </div>
      </header>

      <div className="flex items-start gap-2 rounded-xl border border-rose-200 dark:border-rose-900/70 bg-rose-50/70 dark:bg-rose-950/20 p-4 text-xs text-rose-950 dark:text-rose-100">
        <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
        <p><strong>Lecture historique :</strong> la sélection de Saisie reste la base. Les contrôles ci-dessous affinent uniquement SCRAP TESTING. Une période peut avoir un taux élevé avec peu de lignes ; le minimum configurable sert à signaler les échantillons insuffisants. Aucun filtre ne modifie les données IndexedDB.</p>
      </div>

      <section className="rounded-2xl border border-rose-200 dark:border-rose-900/70 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-4" aria-labelledby="scrap-filters-title">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 id="scrap-filters-title" className="text-sm font-bold text-slate-900 dark:text-white">Filtres SCRAP TESTING</h3><p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Ces filtres sont locaux à cette rubrique et se combinent avec les filtres actifs de Saisie.</p></div><button type="button" onClick={resetScrapFilters} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"><RotateCcw className="h-3.5 w-3.5" />Réinitialiser</button></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <label className="space-y-1"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Date de début</span><input type="date" value={startDate} onChange={(event) => { setStartDate(event.target.value); setSelectedPeriodKey(null); }} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-rose-500" /></label>
          <label className="space-y-1"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Date de fin</span><input type="date" value={endDate} onChange={(event) => { setEndDate(event.target.value); setSelectedPeriodKey(null); }} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-rose-500" /></label>
          <label className="space-y-1"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Seuil des gros résultats</span><div className="flex items-center gap-1"><input type="number" min="0" step="0.1" value={thresholdInput} onChange={(event) => { setThresholdInput(event.target.value); setSelectedPeriodKey(null); }} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-rose-500" /><span className="text-xs font-bold text-slate-500">x</span></div></label>
          <label className="space-y-1"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Minimum de lignes</span><input type="number" min="1" step="1" value={minimumRowsInput} onChange={(event) => setMinimumRowsInput(event.target.value)} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-rose-500" /></label>
          <label className="flex items-end gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200"><input type="checkbox" checked={showOnlyWithHits} onChange={(event) => { setShowOnlyWithHits(event.target.checked); setSelectedPeriodKey(null); }} className="mb-0.5 accent-rose-600" />Uniquement les périodes avec &gt; seuil</label>
        </div>
        {invalidDateRange && <p className="text-[11px] font-semibold text-rose-700 dark:text-rose-300">La date de début doit être antérieure ou égale à la date de fin.</p>}
      </section>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Données valides</p><p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{result.validRecords.length}</p><p className="text-[10px] text-slate-500 dark:text-slate-400">sur {filteredRecords.length} sélectionnées</p></div>
        <div className="rounded-xl border border-rose-200 dark:border-rose-900/70 bg-rose-50/60 dark:bg-rose-950/20 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">Résultats &gt;{formatThreshold(result.threshold)}x</p><p className="mt-1 text-2xl font-bold text-rose-800 dark:text-rose-200">{result.above30Count}</p><p className="text-[10px] text-rose-700 dark:text-rose-300">{formatRate(result.above30Rate)} de l’échantillon</p></div>
        <div className="rounded-xl border border-amber-200 dark:border-amber-900/70 bg-amber-50/60 dark:bg-amber-950/20 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">Maximum</p><p className="mt-1 text-2xl font-bold text-amber-800 dark:text-amber-200">{maxRecord ? formatValue(maxRecord.coefficient) : '—'}</p><p className="text-[10px] text-amber-700 dark:text-amber-300">dans la sélection actuelle</p></div>
        <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/70 bg-indigo-50/60 dark:bg-indigo-950/20 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">Top affiché</p><p className="mt-1 text-2xl font-bold text-indigo-800 dark:text-indigo-200">{result.top30.length}</p><p className="text-[10px] text-indigo-700 dark:text-indigo-300">sur 30 maximum</p></div>
      </div>

      <section className="rounded-2xl border border-indigo-200 dark:border-indigo-900/70 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-4" aria-labelledby="scrap-top30-title">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 id="scrap-top30-title" className="text-sm font-bold text-slate-900 dark:text-white">Top 30 des meilleurs multiplicateurs</h3><p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Classement par coefficient décroissant ; chaque ligne conserve sa date et son heure avec secondes.</p></div><span className="rounded-full bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1 text-[10px] font-semibold text-indigo-700 dark:text-indigo-300">{result.top30.length} résultat(s)</span></div>
        {result.top30.length > 0 ? <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800"><table className="w-full min-w-[720px] text-xs"><thead className="bg-slate-50 dark:bg-slate-950/60 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400"><tr><th className="px-3 py-2 text-left">Rang</th><th className="px-3 py-2 text-right">Multiplicateur</th><th className="px-3 py-2 text-left">Date et heure HH:MM:SS</th><th className="px-3 py-2 text-left">Hash</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{result.top30.map((record, index) => <tr key={record.id} className="text-slate-700 dark:text-slate-300"><td className="px-3 py-2 font-bold text-indigo-700 dark:text-indigo-300">#{index + 1}</td><td className="px-3 py-2 text-right"><span className={`inline-flex rounded-md border px-2 py-1 text-xs font-bold ${coefficientClass(record.coefficient)}`}>{formatValue(record.coefficient)}</span></td><td className="px-3 py-2 font-medium">{formatDateTime(record.timestamp)}</td><td className="max-w-[260px] truncate px-3 py-2 font-mono text-[10px] text-slate-400" title={record.hash}>{record.hash}</td></tr>)}</tbody></table></div> : <p className="rounded-xl bg-slate-50 dark:bg-slate-950/50 p-5 text-center text-xs text-slate-500 dark:text-slate-400">Aucune donnée chronologique valide dans la sélection actuelle.</p>}
      </section>

      <section className="rounded-2xl border border-rose-200 dark:border-rose-900/70 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-4" aria-labelledby="scrap-period-title">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 id="scrap-period-title" className="text-sm font-bold text-slate-900 dark:text-white">Quand les résultats &gt;{formatThreshold(result.threshold)}x apparaissent-ils le plus souvent ?</h3><p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Le Top 10 de chaque période est disponible en sélectionnant une ligne du tableau.</p></div><div className="inline-flex rounded-lg border border-rose-200 dark:border-rose-900/70 bg-rose-50/60 dark:bg-rose-950/30 p-0.5">{granularityOptions.map((option) => <button key={option.value} type="button" onClick={() => { setGranularity(option.value); setSelectedPeriodKey(null); }} className={`rounded-md px-2.5 py-1.5 text-[10px] font-semibold ${granularity === option.value ? 'bg-rose-600 text-white' : 'text-rose-700 dark:text-rose-300'}`}>{option.label}</button>)}</div></div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-xl border border-rose-200 dark:border-rose-900/70 bg-rose-50/60 dark:bg-rose-950/20 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">Plus grand nombre — {periodLabel.toLowerCase()}</p>{highestCount ? <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{highestCount.label} : {highestCount.above30Count} résultat(s) &gt;{formatThreshold(result.threshold)}x</p> : <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Pas de période disponible.</p>}<p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">Volume total : {highestCount?.totalCount ?? 0} ligne(s) · première apparition : {formatClock(highestCount?.firstAbove30Timestamp ?? null)} · dernière : {formatClock(highestCount?.lastAbove30Timestamp ?? null)}.</p></div>
          <div className="rounded-xl border border-amber-200 dark:border-amber-900/70 bg-amber-50/60 dark:bg-amber-950/20 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">Taux le plus élevé — minimum {minimumRows} lignes</p>{strongestRate ? <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{strongestRate.label} : {formatRate(strongestRate.above30Rate)}</p> : <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Échantillon insuffisant pour conclure.</p>}<p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">{strongestRate ? `${strongestRate.above30Count} résultat(s) >${formatThreshold(result.threshold)}x sur ${strongestRate.totalCount}.` : `Aucune période ne contient au moins ${minimumRows} lignes valides.`}</p></div>
        </div>

        {visibleRows.length > 0 ? <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800"><table className="w-full min-w-[860px] text-xs"><thead className="bg-slate-50 dark:bg-slate-950/60 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400"><tr><th className="px-3 py-2 text-left">Période</th><th className="px-3 py-2 text-right">Total</th><th className="px-3 py-2 text-right">&gt; seuil</th><th className="px-3 py-2 text-right">Pourcentage</th><th className="px-3 py-2 text-right">Premier HH:MM:SS</th><th className="px-3 py-2 text-right">Dernier HH:MM:SS</th><th className="px-3 py-2 text-right">Fenêtre HH:MM:SS</th><th className="px-3 py-2 text-right">Top 10</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{visibleRows.map((row) => <tr key={row.key} className={`text-slate-700 dark:text-slate-300 ${selectedPeriod?.key === row.key ? 'bg-rose-50/70 dark:bg-rose-950/30' : ''}`}><td className="px-3 py-2 font-semibold text-slate-900 dark:text-white">{row.label}</td><td className="px-3 py-2 text-right">{row.totalCount}</td><td className="px-3 py-2 text-right font-bold text-rose-700 dark:text-rose-300">{row.above30Count}</td><td className="px-3 py-2 text-right font-bold">{formatRate(row.above30Rate)}</td><td className="px-3 py-2 text-right font-mono text-[10px]">{formatClock(row.firstAbove30Timestamp)}</td><td className="px-3 py-2 text-right font-mono text-[10px]">{formatClock(row.lastAbove30Timestamp)}</td><td className="px-3 py-2 text-right font-mono text-[10px]">{formatSpan(row.spanSeconds)}</td><td className="px-3 py-2 text-right"><button type="button" onClick={() => setSelectedPeriodKey(row.key)} className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-rose-500">Voir {row.top10.length}<ChevronRight className="h-3 w-3" /></button></td></tr>)}</tbody></table></div> : <p className="rounded-xl bg-slate-50 dark:bg-slate-950/50 p-5 text-center text-xs text-slate-500 dark:text-slate-400">Aucune période ne contient de donnée valide ou de résultat au-dessus du seuil.</p>}

        {selectedPeriod && <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/70 bg-indigo-50/50 dark:bg-indigo-950/20 p-4 space-y-3"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">Top 10 des &gt;{formatThreshold(result.threshold)}x — {selectedPeriod.label}</p><p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">Fenêtre observée : <span className="font-mono font-semibold">{formatSpan(selectedPeriod.spanSeconds)}</span> · de {formatClock(selectedPeriod.firstAbove30Timestamp)} à {formatClock(selectedPeriod.lastAbove30Timestamp)}.</p></div><span className="rounded-full bg-white/80 dark:bg-slate-900/70 px-2.5 py-1 text-[10px] font-semibold text-indigo-700 dark:text-indigo-300">{selectedPeriod.top10.length} résultat(s)</span></div>{selectedPeriod.top10.length > 0 ? <div className="overflow-x-auto rounded-lg border border-indigo-200/80 dark:border-indigo-800/70"><table className="w-full min-w-[650px] text-xs"><thead className="bg-white/80 dark:bg-slate-900/70 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400"><tr><th className="px-3 py-2 text-left">Rang</th><th className="px-3 py-2 text-right">Multiplicateur</th><th className="px-3 py-2 text-left">Date et heure HH:MM:SS</th><th className="px-3 py-2 text-left">Hash</th></tr></thead><tbody className="divide-y divide-indigo-100 dark:divide-indigo-900/50">{selectedPeriod.top10.map((record, index) => <tr key={record.id} className="text-slate-700 dark:text-slate-300"><td className="px-3 py-2 font-bold text-indigo-700 dark:text-indigo-300">#{index + 1}</td><td className="px-3 py-2 text-right"><span className={`inline-flex rounded-md border px-2 py-1 text-xs font-bold ${coefficientClass(record.coefficient)}`}>{formatValue(record.coefficient)}</span></td><td className="px-3 py-2 font-mono">{formatDateTime(record.timestamp)}</td><td className="max-w-[220px] truncate px-3 py-2 font-mono text-[10px] text-slate-400" title={record.hash}>{record.hash}</td></tr>)}</tbody></table></div> : <p className="text-xs text-slate-500 dark:text-slate-400">Aucun résultat au-dessus du seuil dans cette période.</p>}</div>}
      </section>
    </div>
  );
};
