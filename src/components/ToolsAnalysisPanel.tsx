import React, { useMemo, useState } from 'react';
import { BarChart3, CalendarClock, Clock3, Info, Layers3, Repeat2, RotateCcw, TimerReset } from 'lucide-react';
import { JsonRecord } from '../types';
import {
  DEFAULT_TOOLS_ANALYSIS_CONFIG,
  ToolsTemporalGranularity,
  analyzeTools,
  formatToolsDuration,
  toolsGranularityLabel,
} from '../utils/toolsAnalytics';

interface ToolsAnalysisPanelProps {
  records: JsonRecord[];
  totalRecords: number;
}

const granularityOptions: Array<{ value: ToolsTemporalGranularity; label: string }> = [
  { value: 'hour', label: 'Heure' },
  { value: 'date', label: 'Date précise' },
  { value: 'weekday', label: 'Jour de la semaine' },
  { value: 'month', label: 'Mois' },
  { value: 'year', label: 'Année' },
];

const weekdayLabels = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

const bandClasses: Record<string, string> = {
  low: 'bg-slate-500',
  standard: 'bg-sky-500',
  medium: 'bg-emerald-500',
  high: 'bg-amber-500',
  'very-high': 'bg-violet-500',
  ultra: 'bg-rose-500',
};

function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

function formatSequenceLabel(label: string): string {
  return label.replaceAll('→', ' → ');
}

function getRecordDate(record: JsonRecord): Date | null {
  const timestamp = new Date(record.date_brute || record.date_utc).getTime();
  return Number.isFinite(timestamp) ? new Date(timestamp) : null;
}

function formatDateOption(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(date);
}

export const ToolsAnalysisPanel: React.FC<ToolsAnalysisPanelProps> = ({ records, totalRecords }) => {
  const [sequenceLength, setSequenceLength] = useState(DEFAULT_TOOLS_ANALYSIS_CONFIG.sequenceLength);
  const [minOccurrences, setMinOccurrences] = useState(DEFAULT_TOOLS_ANALYSIS_CONFIG.minOccurrences);
  const [granularity, setGranularity] = useState<ToolsTemporalGranularity>(DEFAULT_TOOLS_ANALYSIS_CONFIG.granularity);
  const [selectedDate, setSelectedDate] = useState('all');
  const [selectedHour, setSelectedHour] = useState('all');
  const [selectedWeekday, setSelectedWeekday] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');

  const filterOptions = useMemo(() => {
    const dates = new Map<string, string>();
    const months = new Map<string, string>();
    const years = new Set<string>();
    const hours = new Set<string>();
    records.forEach((record) => {
      const date = getRecordDate(record);
      if (!date) return;
      const year = String(date.getFullYear());
      const month = `${year}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const dateKey = `${month}-${String(date.getDate()).padStart(2, '0')}`;
      dates.set(dateKey, formatDateOption(date));
      months.set(month, new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(date));
      years.add(year);
      hours.add(String(date.getHours()).padStart(2, '0'));
    });
    return {
      dates: [...dates.entries()].sort(([left], [right]) => right.localeCompare(left)),
      months: [...months.entries()].sort(([left], [right]) => right.localeCompare(left)),
      years: [...years].sort((left, right) => Number(right) - Number(left)),
      hours: [...hours].sort(),
    };
  }, [records]);

  const scopedRecords = useMemo(() => records.filter((record) => {
    const date = getRecordDate(record);
    if (!date) return false;
    const year = String(date.getFullYear());
    const month = `${year}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const dateKey = `${month}-${String(date.getDate()).padStart(2, '0')}`;
    const hour = String(date.getHours()).padStart(2, '0');
    const weekday = String(date.getDay());
    return (selectedDate === 'all' || dateKey === selectedDate)
      && (selectedHour === 'all' || hour === selectedHour)
      && (selectedWeekday === 'all' || weekday === selectedWeekday)
      && (selectedMonth === 'all' || month === selectedMonth)
      && (selectedYear === 'all' || year === selectedYear);
  }), [records, selectedDate, selectedHour, selectedWeekday, selectedMonth, selectedYear]);

  const result = useMemo(() => analyzeTools(scopedRecords, { sequenceLength, minOccurrences, granularity }), [scopedRecords, sequenceLength, minOccurrences, granularity]);
  const displayedSequences = result.sequences.slice(0, 10);
  const maxBandCount = Math.max(...result.coefficientBands.map((band) => band.count), 1);
  const maxIntervalCount = Math.max(...result.timeIntervals.map((interval) => interval.count), 1);
  const maxTemporalCount = Math.max(...result.temporalWindows.map((window) => window.count), 1);
  const hasTimeFilters = selectedDate !== 'all' || selectedHour !== 'all' || selectedWeekday !== 'all' || selectedMonth !== 'all' || selectedYear !== 'all';
  const selectionLabel = hasTimeFilters ? `${scopedRecords.length} ligne(s) après filtres sur ${records.length}` : records.length === totalRecords ? 'jeu complet' : `${records.length} ligne(s) filtrée(s) sur ${totalRecords}`;

  const resetTimeFilters = () => {
    setSelectedDate('all');
    setSelectedHour('all');
    setSelectedWeekday('all');
    setSelectedMonth('all');
    setSelectedYear('all');
  };

  return (
    <section className="rounded-2xl border border-cyan-200 dark:border-cyan-900/70 bg-white dark:bg-slate-850 p-5 sm:p-6 shadow-xs space-y-5" aria-labelledby="tools-analysis-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-cyan-50 dark:bg-cyan-950/50 p-2 text-cyan-600 dark:text-cyan-400"><Layers3 className="h-5 w-5" /></div>
          <div>
            <h3 id="tools-analysis-title" className="text-sm font-bold text-slate-900 dark:text-white">Ruban Tools</h3>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Recherche descriptive des chaînes répétées dans les données actuellement sélectionnées.</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 dark:bg-cyan-950/40 px-2.5 py-1 text-[10px] font-semibold text-cyan-700 dark:text-cyan-300"><BarChart3 className="h-3.5 w-3.5" />{selectionLabel}</span>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-cyan-100 dark:border-cyan-900/60 bg-cyan-50/60 dark:bg-cyan-950/20 p-3 text-[11px] text-cyan-950 dark:text-cyan-100">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600 dark:text-cyan-400" />
        <p><strong>Lecture historique :</strong> les filtres ci-dessous s’appliquent uniquement à Tools. Chaque chaîne est formée après tri par date et heure. Son pourcentage correspond à sa part des fenêtres analysées dans la sélection actuelle ; il mesure une fréquence passée et ne prédit pas le prochain résultat.</p>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/30 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">Sélection temporelle Tools</p><p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">Choisis un ou plusieurs critères ; ils se combinent entre eux.</p></div><button type="button" onClick={resetTimeFilters} disabled={!hasTimeFilters} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-40"><RotateCcw className="h-3.5 w-3.5" />Réinitialiser</button></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          <label className="space-y-1"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Date</span><select value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-cyan-500"><option value="all">Toutes les dates</option>{filterOptions.dates.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="space-y-1"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Heure</span><select value={selectedHour} onChange={(event) => setSelectedHour(event.target.value)} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-cyan-500"><option value="all">Toutes les heures</option>{filterOptions.hours.map((value) => <option key={value} value={value}>{value}h00–{value}h59</option>)}</select></label>
          <label className="space-y-1"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Jour</span><select value={selectedWeekday} onChange={(event) => setSelectedWeekday(event.target.value)} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-cyan-500"><option value="all">Tous les jours</option>{weekdayLabels.map((label, index) => <option key={label} value={index}>{label}</option>)}</select></label>
          <label className="space-y-1"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Mois</span><select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-cyan-500"><option value="all">Tous les mois</option>{filterOptions.months.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="space-y-1"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Année</span><select value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-cyan-500"><option value="all">Toutes les années</option>{filterOptions.years.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="space-y-1"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Longueur de chaîne</span><select value={sequenceLength} onChange={(event) => setSequenceLength(Number(event.target.value))} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-cyan-500">{Array.from({ length: 7 }, (_, index) => index + 2).map((value) => <option key={value} value={value}>{value} intervalles consécutifs</option>)}</select></label>
        <label className="space-y-1"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Minimum d’occurrences</span><select value={minOccurrences} onChange={(event) => setMinOccurrences(Number(event.target.value))} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-cyan-500">{Array.from({ length: 9 }, (_, index) => index + 1).map((value) => <option key={value} value={value}>{value} occurrence{value > 1 ? 's' : ''} minimum</option>)}</select></label>
        <label className="space-y-1"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Regroupement temporel</span><span className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"><CalendarClock className="h-3.5 w-3.5 shrink-0 text-cyan-500" /><select value={granularity} onChange={(event) => setGranularity(event.target.value as ToolsTemporalGranularity)} className="min-w-0 flex-1 bg-transparent text-xs font-semibold outline-none">{granularityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></span></label>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Données valides</p><p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{result.validCount}</p><p className="text-[10px] text-slate-500 dark:text-slate-400">sur {result.inputCount} sélectionnées</p></div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Fenêtres</p><p className="mt-1 text-lg font-bold text-cyan-700 dark:text-cyan-300">{result.windowCount}</p><p className="text-[10px] text-slate-500 dark:text-slate-400">de {sequenceLength} résultats</p></div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Chaînes distinctes</p><p className="mt-1 text-lg font-bold text-indigo-700 dark:text-indigo-300">{result.distinctSequenceCount}</p><p className="text-[10px] text-slate-500 dark:text-slate-400">avant le filtre minimum</p></div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Chaînes retenues</p><p className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">{result.sequences.length}</p><p className="text-[10px] text-slate-500 dark:text-slate-400">au moins {minOccurrences} occurrence(s)</p></div>
      </div>

      <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/70 bg-indigo-50/60 dark:bg-indigo-950/20 p-4">
        <div className="flex items-center gap-2"><Repeat2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" /><p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">Récapitulatif de l’analyse</p></div>
        <p className="mt-2 text-sm leading-6 text-indigo-950 dark:text-indigo-100">{result.recap}</p>
      </div>

      {result.validCount > 0 && <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2"><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Répartition des multiplicateurs</p><p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">Part de chaque intervalle dans la sélection valide.</p></div><BarChart3 className="h-4 w-4 text-cyan-500" /></div>
          <div className="space-y-2.5">{result.coefficientBands.map((band) => <div key={band.key}><div className="flex justify-between gap-2 text-[10px]"><span className="font-semibold text-slate-700 dark:text-slate-300">{band.label}</span><span className="font-bold text-slate-900 dark:text-white">{band.count} · {formatRate(band.rate)}</span></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className={`h-2 rounded-full ${bandClasses[band.key]}`} style={{ width: `${band.count > 0 ? Math.max(3, (band.count / maxBandCount) * 100) : 0}%` }} /></div></div>)}</div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2"><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Intervalles entre les résultats</p><p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">Distribution des écarts chronologiques consécutifs.</p></div><TimerReset className="h-4 w-4 text-cyan-500" /></div>
          <div className="space-y-2.5">{result.timeIntervals.map((interval) => <div key={interval.key}><div className="flex justify-between gap-2 text-[10px]"><span className="font-semibold text-slate-700 dark:text-slate-300">{interval.label}</span><span className="font-bold text-slate-900 dark:text-white">{interval.count} · {formatRate(interval.rate)}</span></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-2 rounded-full bg-cyan-500" style={{ width: `${interval.count > 0 ? Math.max(3, (interval.count / maxIntervalCount) * 100) : 0}%` }} /></div><p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">moyenne : {interval.count > 0 ? formatToolsDuration(interval.averageSeconds) : '—'}</p></div>)}</div>
        </div>
      </div>}

      {displayedSequences.length > 0 ? <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800"><div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 px-4 py-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">Chaînes les plus fréquentes</p><p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">Les pourcentages sont calculés sur {result.windowCount} fenêtre(s) chronologique(s), pas sur des résultats futurs.</p></div><table className="w-full min-w-[860px] text-xs"><thead className="bg-white dark:bg-slate-900 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400"><tr><th className="px-3 py-2 text-left">Chaîne de tranches</th><th className="px-3 py-2 text-right">Occurrences</th><th className="px-3 py-2 text-right">Part des fenêtres</th><th className="px-3 py-2 text-right">Écart moyen</th><th className="px-3 py-2 text-right">Médiane écart</th><th className="px-3 py-2 text-left">Période dominante</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{displayedSequences.map((sequence) => <tr key={sequence.key} className="text-slate-700 dark:text-slate-300"><td className="px-3 py-2.5 font-semibold text-slate-900 dark:text-white">{formatSequenceLabel(sequence.label)}</td><td className="px-3 py-2.5 text-right font-bold">{sequence.occurrences}</td><td className="px-3 py-2.5 text-right font-bold text-cyan-700 dark:text-cyan-300">{formatRate(sequence.rate)}</td><td className="px-3 py-2.5 text-right">{formatToolsDuration(sequence.averageGapSeconds)}</td><td className="px-3 py-2.5 text-right">{formatToolsDuration(sequence.medianGapSeconds)}</td><td className="px-3 py-2.5">{sequence.dominantTemporalLabel}</td></tr>)}</tbody></table></div> : <div className="flex items-start gap-2 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-4 text-xs text-amber-800 dark:text-amber-300"><Info className="h-4 w-4 shrink-0" />Aucune chaîne ne correspond au minimum d’occurrences choisi dans cette sélection.</div>}

      {result.temporalWindows.length > 0 && <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800"><div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 px-4 py-3"><Clock3 className="h-4 w-4 text-cyan-500" /><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">Fenêtres par {toolsGranularityLabel(granularity)}</p><p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">Répartition de toutes les fenêtres analysées selon le regroupement choisi.</p></div></div><table className="w-full min-w-[540px] text-xs"><thead className="bg-white dark:bg-slate-900 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400"><tr><th className="px-3 py-2 text-left">{granularityOptions.find((option) => option.value === granularity)?.label}</th><th className="px-3 py-2 text-right">Fenêtres</th><th className="px-3 py-2 text-right">Part</th><th className="px-3 py-2 text-left">Intensité relative</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{result.temporalWindows.map((window) => <tr key={window.key} className="text-slate-700 dark:text-slate-300"><td className="px-3 py-2 font-semibold">{window.label}</td><td className="px-3 py-2 text-right">{window.count}</td><td className="px-3 py-2 text-right font-bold text-cyan-700 dark:text-cyan-300">{formatRate(window.rate)}</td><td className="px-3 py-2"><div className="h-2 w-full min-w-[180px] rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-2 rounded-full bg-cyan-500" style={{ width: `${Math.max(3, (window.count / maxTemporalCount) * 100)}%` }} /></div></td></tr>)}</tbody></table></div>}

      {result.ignoredCount > 0 && <p className="text-[10px] text-slate-500 dark:text-slate-400">{result.ignoredCount} ligne(s) ont été écartées de Tools car leur date ou leur coefficient n’est pas exploitable.</p>}
    </section>
  );
};
