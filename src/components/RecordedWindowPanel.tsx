import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Database, RefreshCw } from 'lucide-react';
import { JsonRecord } from '../types';
import { formatDateFrench, getCoefficientBadgeStyle } from '../utils/formatters';
import { calculateRecordedWindow, formatOccurrenceRate, formatWindowClock, getRecordedDateOptions, RecordedDateFilter } from '../utils/recordedWindow';

interface RecordedWindowPanelProps {
  records: JsonRecord[];
  sourceName?: string;
}

function formatClock(value: Date): string {
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(value);
}

function formatDateOnly(value: Date): string {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(value);
}

export const RecordedWindowPanel: React.FC<RecordedWindowPanelProps> = ({ records, sourceName }) => {
  const [now, setNow] = useState(() => new Date());
  const [dateFilter, setDateFilter] = useState<RecordedDateFilter>('all');
  const [threshold, setThreshold] = useState(15);
  const [windowMinutes, setWindowMinutes] = useState(15);
  const [precision, setPrecision] = useState(2);

  useEffect(() => {
    let intervalId: number | undefined;
    const delay = Math.max(250, 60000 - now.getSeconds() * 1000 - now.getMilliseconds());
    const timeoutId = window.setTimeout(() => {
      setNow(new Date());
      intervalId = window.setInterval(() => setNow(new Date()), 60000);
    }, delay);
    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
  }, [now]);

  const dateOptions = useMemo(() => getRecordedDateOptions(records), [records]);
  const result = useMemo(() => calculateRecordedWindow(records, now, dateFilter, threshold, windowMinutes, precision), [dateFilter, now, precision, records, threshold, windowMinutes]);
  const startClock = formatWindowClock(result.startSeconds);
  const endClock = formatWindowClock(result.endSeconds);
  const dateLabel = dateFilter === 'all' ? 'Toutes les dates' : dateOptions.find((option) => option.value === dateFilter)?.label ?? dateFilter;

  useEffect(() => {
    if (dateFilter !== 'all' && !dateOptions.some((option) => option.value === dateFilter)) setDateFilter('all');
  }, [dateFilter, dateOptions]);

  const updateNumber = (setter: React.Dispatch<React.SetStateAction<number>>, value: string, minimum: number, maximum: number) => {
    const parsed = Number(value);
    setter(Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, Math.floor(parsed))) : minimum);
  };

  return <section className="rounded-2xl border border-amber-200 bg-white p-5 shadow-xs dark:border-amber-900/70 dark:bg-slate-900" aria-labelledby="recorded-window-title"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-start gap-3"><div className="rounded-xl bg-amber-100 p-2 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"><CalendarClock className="h-5 w-5" /></div><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">Fenêtre historique du fichier</p><h3 id="recorded-window-title" className="mt-1 text-base font-bold text-slate-900 dark:text-white">Résultats enregistrés sur 15 minutes</h3><p className="mt-1 max-w-3xl text-[11px] text-slate-500 dark:text-slate-400">Lecture uniquement des tours déjà présents dans le JSON chargé. La période avance automatiquement à chaque nouvelle minute, sans interroger ni recalculer le flux LIVE.</p></div></div><span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-200"><Database className="h-3.5 w-3.5" />{sourceName ?? 'Aucun fichier JSON'}</span></div><div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_auto_auto_auto] lg:items-end"><label className="space-y-1"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Date</span><select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-amber-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"><option value="all">Toutes les dates</option>{dateOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><label className="space-y-1"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Seuil &gt;</span><input type="number" min={0} max={100000} step="0.01" value={threshold} onChange={(event) => updateNumber(setThreshold, event.target.value, 0, 100000)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-amber-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label><label className="space-y-1"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Durée (min)</span><input type="number" min={1} max={120} value={windowMinutes} onChange={(event) => updateNumber(setWindowMinutes, event.target.value, 1, 120)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-amber-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label><label className="space-y-1"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Décimales</span><select value={precision} onChange={(event) => setPrecision(Number(event.target.value))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-amber-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"><option value={0}>0</option><option value={1}>1</option><option value={2}>2</option><option value={3}>3</option></select></label></div><div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-100 bg-amber-50/60 p-3 dark:border-amber-900/50 dark:bg-amber-950/20"><div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-amber-900 dark:text-amber-100"><span><strong>Date :</strong> {dateLabel}</span><span><strong>Période :</strong> {startClock} → {endClock}</span><span><strong>Référence :</strong> {formatClock(now)}</span><span><strong>Fichier :</strong> {sourceName ?? 'non chargé'}</span></div><span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-amber-800 dark:text-amber-200"><RefreshCw className="h-3.5 w-3.5" />Actualisation à la prochaine minute</span></div>{records.length === 0 ? <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-400">Aucun tour JSON chargé. Sélectionne un fichier Drive et démarre sa lecture pour remplir cette fenêtre historique.</div> : <><div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3"><div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tours valides</p><p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{result.totalValidInWindow}</p><p className="text-[10px] text-slate-500 dark:text-slate-400">dans la fenêtre</p></div><div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/60 dark:bg-amber-950/30"><p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">Résultats &gt;{threshold}x</p><p className="mt-1 text-xl font-bold text-amber-900 dark:text-amber-100">{result.totalAboveThreshold}</p><p className="text-[10px] text-amber-700 dark:text-amber-300">dans cette période</p></div><div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 dark:border-indigo-900/60 dark:bg-indigo-950/30"><p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">Taux global</p><p className="mt-1 text-xl font-bold text-indigo-900 dark:text-indigo-100">{result.totalValidInWindow > 0 ? formatOccurrenceRate((result.totalAboveThreshold / result.totalValidInWindow) * 100) : '0,0 %'}</p><p className="text-[10px] text-indigo-700 dark:text-indigo-300">au-dessus du seuil</p></div></div><div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800"><table className="min-w-[760px] w-full text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 dark:bg-slate-950/70 dark:text-slate-400"><tr><th className="px-3 py-3 font-bold">Date</th><th className="px-3 py-3 font-bold">Heure</th><th className="px-3 py-3 font-bold">Multiplicateur</th><th className="px-3 py-3 font-bold">Occurrences</th><th className="px-3 py-3 font-bold">Pourcentage</th><th className="px-3 py-3 font-bold">Code couleur</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{result.rows.length > 0 ? result.rows.map((row) => { const badge = getCoefficientBadgeStyle(row.record.coefficient); const timestamp = new Date(row.timestamp); return <tr key={row.record.hash || row.record.id} className="bg-white hover:bg-amber-50/40 dark:bg-slate-900 dark:hover:bg-amber-950/20"><td className="whitespace-nowrap px-3 py-3 font-medium text-slate-700 dark:text-slate-200">{formatDateOnly(timestamp)}</td><td className="whitespace-nowrap px-3 py-3 font-mono text-slate-600 dark:text-slate-300">{formatClock(timestamp)}</td><td className="px-3 py-3"><span className={`inline-flex rounded-md border px-2 py-1 text-sm font-extrabold ${badge.bg} ${badge.text} ${badge.border}`}>{row.roundedCoefficient}x</span></td><td className="px-3 py-3 font-semibold text-slate-700 dark:text-slate-200">{row.occurrenceCount} fois</td><td className="px-3 py-3 font-bold text-indigo-700 dark:text-indigo-300">{formatOccurrenceRate(row.occurrenceRate)}</td><td className="px-3 py-3"><span className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-semibold ${badge.bg} ${badge.text} ${badge.border}`}>{badge.label}</span></td></tr>; }) : <tr><td colSpan={6} className="px-4 py-8 text-center text-xs text-slate-500 dark:text-slate-400">Aucun multiplicateur supérieur à {threshold}x dans la période et le filtre de date sélectionnés.</td></tr>}</tbody></table></div></>}</section>;
};
