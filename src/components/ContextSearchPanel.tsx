import React, { useEffect, useMemo, useState } from 'react';
import { CalendarSearch, ChevronRight, Copy, Download, Search, Target } from 'lucide-react';
import { JsonRecord } from '../types';
import { formatDateFrench, getCoefficientBadgeStyle } from '../utils/formatters';
import { buildContextWindow, ContextWindowItem, recordKey, searchMultiplierMatches } from '../utils/contextSearch';

interface ContextSearchPanelProps {
  records: JsonRecord[];
}

function formatDuration(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return '—';
  const safe = Math.max(0, Math.round(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const remaining = safe % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
}

function contextRowClass(position: ContextWindowItem['position']): string {
  if (position === 'selected') return 'border-fuchsia-300 bg-fuchsia-50/90 ring-2 ring-fuchsia-200 dark:border-fuchsia-700 dark:bg-fuchsia-950/40 dark:ring-fuchsia-900/60';
  if (position === 'before') return 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60';
  return 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/60 dark:bg-emerald-950/20';
}

export const ContextSearchPanel: React.FC<ContextSearchPanelProps> = ({ records }) => {
  const [query, setQuery] = useState('');
  const [precision, setPrecision] = useState(2);
  const [beforeCount, setBeforeCount] = useState(20);
  const [afterCount, setAfterCount] = useState(20);
  const [selectedKey, setSelectedKey] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const matches = useMemo(() => searchMultiplierMatches(records, query, precision), [records, query, precision]);
  const context = useMemo(() => selectedKey ? buildContextWindow(records, selectedKey, beforeCount, afterCount) : null, [records, selectedKey, beforeCount, afterCount]);

  useEffect(() => {
    if (selectedKey && !matches.some(({ record }) => recordKey(record) === selectedKey)) setSelectedKey('');
  }, [matches, selectedKey]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setSelectedKey('');
  };

  const updateCount = (setter: React.Dispatch<React.SetStateAction<number>>, value: string) => {
    const parsed = Number(value);
    setter(Number.isFinite(parsed) ? Math.min(100, Math.max(0, Math.floor(parsed))) : 0);
  };

  const contextPayload = context ? { exportedAt: new Date().toISOString(), query, precision, beforeCount, afterCount, selected: context.selected.record, context: context.items.map(({ record, position, intervalFromPreviousSeconds }) => ({ record, position, intervalFromPreviousSeconds })) } : null;

  const exportContext = () => {
    if (!contextPayload) return;
    const blob = new Blob([JSON.stringify(contextPayload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `contexte-${context?.selected.record.coefficient.toFixed(2).replace('.', '-')}-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setFeedback('Fenêtre de contexte exportée en JSON.');
  };

  const copyContext = async () => {
    if (!contextPayload) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(contextPayload, null, 2));
      setFeedback('Fenêtre de contexte copiée dans le presse-papiers.');
    } catch {
      setFeedback('La copie automatique n’est pas disponible dans ce navigateur. Utilise l’export JSON.');
    }
  };

  const renderContextRow = (item: ContextWindowItem, index: number) => {
    const badge = getCoefficientBadgeStyle(item.record.coefficient);
    const label = item.position === 'selected' ? 'Résultat choisi' : item.position === 'before' ? 'Avant' : 'Après';
    return <div key={`${recordKey(item.record)}-${index}`} className={`grid grid-cols-[minmax(0,1.5fr)_auto_minmax(0,1fr)] items-center gap-3 rounded-xl border p-3 ${contextRowClass(item.position)}`}><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${badge.bg} ${badge.text} ${badge.border}`}>{item.record.coefficient.toFixed(2)}x</span><span className={`text-[10px] font-bold uppercase tracking-wider ${item.position === 'selected' ? 'text-fuchsia-700 dark:text-fuchsia-300' : item.position === 'before' ? 'text-slate-500 dark:text-slate-400' : 'text-emerald-700 dark:text-emerald-300'}`}>{label}</span></div><p className="mt-1 truncate text-[11px] font-medium text-slate-700 dark:text-slate-200">{formatDateFrench(item.record.date_utc || item.record.date_brute)}</p><p className="mt-1 truncate font-mono text-[9px] text-slate-400 dark:text-slate-500">{item.record.hash}</p></div><div className="text-center"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Intervalle</p><p className="mt-1 font-mono text-[11px] font-bold text-slate-700 dark:text-slate-200">{item.position === 'before' && index === 0 ? '—' : formatDuration(item.intervalFromPreviousSeconds)}</p></div><div className="text-right text-[10px] text-slate-500 dark:text-slate-400">{item.position === 'selected' ? 'Point central' : item.position === 'before' ? 'Contexte précédent' : 'Contexte suivant'}</div></div>;
  };

  return <section className="rounded-2xl border border-fuchsia-200 bg-white p-5 shadow-xs dark:border-fuchsia-900/70 dark:bg-slate-900" aria-labelledby="context-search-title"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-start gap-3"><div className="rounded-xl bg-fuchsia-100 p-2 text-fuchsia-700 dark:bg-fuchsia-950/50 dark:text-fuchsia-300"><CalendarSearch className="h-5 w-5" /></div><div><p className="text-[10px] font-bold uppercase tracking-wider text-fuchsia-700 dark:text-fuchsia-300">Recherche de contexte</p><h3 id="context-search-title" className="mt-1 text-sm font-bold text-slate-900 dark:text-white">Rechercher un multiplicateur et voir son environnement</h3><p className="mt-1 max-w-3xl text-[11px] text-slate-500 dark:text-slate-400">Saisis un coefficient : les résultats sont proposés à chaque frappe. Clique ensuite sur la date et l’heure précises à analyser.</p></div></div><span className="rounded-full bg-fuchsia-50 px-2.5 py-1 text-[10px] font-semibold text-fuchsia-700 dark:bg-fuchsia-950/50 dark:text-fuchsia-300">{records.length} lignes disponibles</span></div><div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto_auto] md:items-end"><label className="space-y-1 md:min-w-0"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Multiplicateur recherché</span><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fuchsia-400" /><input value={query} onChange={(event) => handleQueryChange(event.target.value)} inputMode="decimal" placeholder="Ex. 4.20" className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-300 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></div></label><label className="space-y-1"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Décimales</span><select value={precision} onChange={(event) => { setPrecision(Number(event.target.value)); setSelectedKey(''); }} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-fuchsia-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"><option value={0}>0</option><option value={1}>1</option><option value={2}>2</option><option value={3}>3</option></select></label><label className="space-y-1"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Avant</span><input type="number" min={0} max={100} value={beforeCount} onChange={(event) => updateCount(setBeforeCount, event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-fuchsia-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label><label className="space-y-1"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Après</span><input type="number" min={0} max={100} value={afterCount} onChange={(event) => updateCount(setAfterCount, event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-fuchsia-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label></div>{query.trim() && <div className="mt-4 rounded-xl border border-fuchsia-100 bg-fuchsia-50/50 p-3 dark:border-fuchsia-900/50 dark:bg-fuchsia-950/20"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[10px] font-bold uppercase tracking-wider text-fuchsia-700 dark:text-fuchsia-300">Résultats trouvés : {matches.length}</p><p className="text-[10px] text-fuchsia-700 dark:text-fuchsia-300">Recherche arrondie à {precision} décimale{precision > 1 ? 's' : ''}</p></div>{matches.length > 0 ? <div className="mt-2 grid grid-cols-1 gap-2 lg:grid-cols-2">{matches.slice(0, 100).map(({ record }) => { const selected = recordKey(record) === selectedKey; return <button key={recordKey(record)} type="button" onClick={() => setSelectedKey(recordKey(record))} aria-pressed={selected} className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${selected ? 'border-fuchsia-500 bg-fuchsia-100 ring-2 ring-fuchsia-200 dark:border-fuchsia-500 dark:bg-fuchsia-950/60 dark:ring-fuchsia-900/60' : 'border-white bg-white hover:border-fuchsia-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-fuchsia-700'}`}><span className="min-w-0"><span className="block text-xs font-extrabold text-slate-900 dark:text-white">{record.coefficient.toFixed(2)}x</span><span className="mt-0.5 block truncate text-[10px] text-slate-500 dark:text-slate-400">{formatDateFrench(record.date_utc || record.date_brute)}</span></span><ChevronRight className={`h-4 w-4 shrink-0 ${selected ? 'text-fuchsia-600' : 'text-slate-300'}`} /></button>; })}</div> : <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Aucun résultat ne correspond à cette saisie. Essaie une autre valeur ou une autre précision.</p>}{matches.length > 100 && <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">Les 100 premières suggestions sont affichées. La recherche porte sur toutes les lignes.</p>}</div>}{feedback && <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-[10px] text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">{feedback}</p>}{context && <div className="mt-4 space-y-3"><div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-fuchsia-200 bg-gradient-to-r from-fuchsia-50 to-indigo-50 p-3 dark:border-fuchsia-900/60 dark:from-fuchsia-950/40 dark:to-indigo-950/30"><div><p className="text-[10px] font-bold uppercase tracking-wider text-fuchsia-700 dark:text-fuchsia-300">Date sélectionnée</p><p className="mt-1 text-sm font-extrabold text-slate-900 dark:text-white">{context.selected.record.coefficient.toFixed(2)}x — {formatDateFrench(context.selected.record.date_utc || context.selected.record.date_brute)}</p><p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">Le résultat choisi est identifié par sa date, son heure et son hash.</p></div><div className="flex flex-wrap items-center gap-2"><div className="flex items-center gap-2 rounded-lg bg-white/70 px-3 py-2 text-[11px] font-bold text-fuchsia-800 dark:bg-slate-900/70 dark:text-fuchsia-200"><Target className="h-4 w-4" />{context.beforeCount} avant · {context.afterCount} après</div><button type="button" onClick={() => void copyContext()} className="inline-flex items-center gap-1.5 rounded-lg border border-fuchsia-200 bg-white px-3 py-2 text-[10px] font-semibold text-fuchsia-700 hover:bg-fuchsia-50 dark:border-fuchsia-800 dark:bg-slate-900 dark:text-fuchsia-200"><Copy className="h-3.5 w-3.5" />Copier</button><button type="button" onClick={exportContext} className="inline-flex items-center gap-1.5 rounded-lg border border-fuchsia-200 bg-white px-3 py-2 text-[10px] font-semibold text-fuchsia-700 hover:bg-fuchsia-50 dark:border-fuchsia-800 dark:bg-slate-900 dark:text-fuchsia-200"><Download className="h-3.5 w-3.5" />Exporter JSON</button></div></div><div className="space-y-2">{context.items.map(renderContextRow)}</div></div>}</section>;
};
