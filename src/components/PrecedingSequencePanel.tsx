import React, { useMemo, useState } from 'react';
import { AlertTriangle, Clock3, Filter, Search, Sparkles } from 'lucide-react';
import { JsonRecord } from '../types';
import { analyzePrecedingSequences, DEFAULT_PRECEDING_SEQUENCE_CONFIG, PrecedingSequenceConfig, PrecedingSequenceOccurrence, PrecedingSequencePattern } from '../utils/precedingAnalytics';

interface PrecedingSequencePanelProps {
  records: JsonRecord[];
}

function formatValue(value: number): string {
  return `${value.toFixed(2)}x`;
}

function formatRate(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatClock(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(date);
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date inconnue';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'medium' }).format(date);
}

function formatInterval(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return '—';
  const safeSeconds = Math.max(0, Math.round(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remaining = safeSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
}

function bandClass(value: number, target: boolean): string {
  if (target) return 'border-rose-400 bg-rose-100 text-rose-900 ring-2 ring-rose-200 dark:border-rose-600 dark:bg-rose-950/70 dark:text-rose-100 dark:ring-rose-900';
  if (value <= 1.45) return 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200';
  if (value <= 4) return 'border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200';
  if (value <= 10) return 'border-violet-300 bg-violet-100 text-violet-800 dark:border-violet-800 dark:bg-violet-950/60 dark:text-violet-200';
  return 'border-indigo-300 bg-indigo-100 text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-200';
}

function SequenceRail({ occurrence, threshold }: { occurrence: PrecedingSequenceOccurrence; threshold: number }) {
  return <div className="flex min-w-max flex-wrap items-center gap-1.5" aria-label="Chaîne précédant le gros multiplicateur">{occurrence.steps.map((step, index) => <React.Fragment key={`${step.timestamp}-${index}`}>
    {index > 0 && <span className="font-mono text-[10px] font-semibold text-slate-400 dark:text-slate-500" title="Intervalle depuis le résultat précédent">[{formatInterval(step.intervalSeconds)}] →</span>}
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-bold ${bandClass(step.coefficient, step.coefficient > threshold)}`} title={`${step.band} · ${formatDateTime(step.timestamp)}`}>{formatValue(step.coefficient)}{step.coefficient > threshold && <span className="text-[9px]">GROS</span>}</span>
  </React.Fragment>)}</div>;
}

function PatternCard({ pattern, selected, onSelect }: { pattern: PrecedingSequencePattern; selected: boolean; onSelect: () => void }) {
  return <button type="button" onClick={onSelect} className={`w-full rounded-xl border p-3 text-left transition-colors ${selected ? 'border-fuchsia-400 bg-fuchsia-50 dark:border-fuchsia-700 dark:bg-fuchsia-950/40' : 'border-slate-200 bg-slate-50/70 hover:border-fuchsia-300 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-fuchsia-900'}`}>
    <p className="truncate text-[11px] font-bold text-slate-900 dark:text-white" title={pattern.label}>{pattern.label}</p>
    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500 dark:text-slate-400"><span>{pattern.occurrences} occurrence(s)</span><span>{formatRate(pattern.rate)} des gros résultats</span><span>dernier {formatClock(pattern.lastOccurrenceAt)}</span></div>
  </button>;
}

export const PrecedingSequencePanel: React.FC<PrecedingSequencePanelProps> = ({ records }) => {
  const [config, setConfig] = useState<PrecedingSequenceConfig>(DEFAULT_PRECEDING_SEQUENCE_CONFIG);
  const result = useMemo(() => analyzePrecedingSequences(records, config), [records, config]);
  const visiblePatterns = result.patterns.slice(0, 30);
  const [selectedPatternId, setSelectedPatternId] = useState<string | null>(null);
  const selectedPattern = visiblePatterns.find((pattern) => pattern.id === selectedPatternId) ?? visiblePatterns[0] ?? null;

  const updateConfig = <K extends keyof PrecedingSequenceConfig>(field: K, value: PrecedingSequenceConfig[K]) => {
    setConfig((current) => ({ ...current, [field]: value }));
    setSelectedPatternId(null);
  };

  return <section className="rounded-2xl border border-fuchsia-200 dark:border-fuchsia-900/60 bg-white dark:bg-slate-850 p-5 sm:p-6 shadow-xs space-y-5" aria-labelledby="preceding-sequence-title">
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-start gap-3"><div className="rounded-xl bg-fuchsia-50 p-2 text-fuchsia-600 dark:bg-fuchsia-950/50 dark:text-fuchsia-400"><Sparkles className="h-5 w-5" /></div><div><h3 id="preceding-sequence-title" className="text-sm font-bold text-slate-900 dark:text-white">Chaînes avant gros multiplicateur</h3><p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Observe les résultats précédents, leurs intervalles et les chaînes qui reviennent avant un résultat au-dessus du seuil.</p></div></div><span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300"><Search className="h-3.5 w-3.5" />Analyse chronologique</span></div>

    <div className="rounded-xl border border-fuchsia-100 bg-fuchsia-50/60 p-3 text-[11px] text-fuchsia-950 dark:border-fuchsia-900/50 dark:bg-fuchsia-950/20 dark:text-fuchsia-200"><strong>Lecture :</strong> chaque fenêtre se termine par un résultat supérieur à {config.threshold.toFixed(2)}x. Les nombres entre crochets sont les intervalles exacts en HH:MM:SS entre deux résultats. Les pourcentages décrivent uniquement cet historique et ne prédisent pas le prochain résultat.</div>

    <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><label className="space-y-1"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Seuil gros résultat</span><div className="flex items-center gap-1"><input type="number" min="0" step="0.1" value={config.threshold} onChange={(event) => updateConfig('threshold', Math.max(0, Number(event.target.value) || 0))} className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-fuchsia-500 dark:border-slate-700 dark:bg-slate-900" /><span className="text-xs font-bold text-slate-500">x</span></div></label><label className="space-y-1"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Résultats avant</span><input type="number" min="2" max="20" step="1" value={config.lookback} onChange={(event) => updateConfig('lookback', Math.min(20, Math.max(2, Math.floor(Number(event.target.value) || 2))))} className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-fuchsia-500 dark:border-slate-700 dark:bg-slate-900" /></label><label className="space-y-1"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Type de chaîne</span><select value={config.mode} onChange={(event) => updateConfig('mode', event.target.value as PrecedingSequenceConfig['mode'])} className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-fuchsia-500 dark:border-slate-700 dark:bg-slate-900"><option value="bands">Tranches de multiplicateur</option><option value="exact">Valeurs exactes</option></select></label>{config.mode === 'exact' ? <label className="space-y-1"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Précision exacte</span><input type="number" min="0" max="4" step="1" value={config.exactPrecision} onChange={(event) => updateConfig('exactPrecision', Math.min(4, Math.max(0, Math.floor(Number(event.target.value) || 0))))} className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-fuchsia-500 dark:border-slate-700 dark:bg-slate-900" /></label> : <div className="flex items-end rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-[10px] text-slate-500 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-400">Tranches : ≤1,45x · 1,46–4x · 4,01–10x · 10,01–30x · &gt;30x</div>}</div>

    <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Données ordonnées</p><p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{result.orderedValidCount}</p><p className="text-[10px] text-slate-500 dark:text-slate-400">date + heure valides</p></div><div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3 dark:border-rose-900/60 dark:bg-rose-950/30"><p className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">Gros résultats</p><p className="mt-1 text-lg font-bold text-rose-900 dark:text-rose-100">{result.targetCount}</p><p className="text-[10px] text-rose-700 dark:text-rose-300">&gt; {config.threshold.toFixed(2)}x</p></div><div className="rounded-xl border border-fuchsia-200 bg-fuchsia-50/70 p-3 dark:border-fuchsia-900/60 dark:bg-fuchsia-950/30"><p className="text-[10px] font-bold uppercase tracking-wider text-fuchsia-700 dark:text-fuchsia-300">Fenêtres analysées</p><p className="mt-1 text-lg font-bold text-fuchsia-900 dark:text-fuchsia-100">{result.windowsCount}</p><p className="text-[10px] text-fuchsia-700 dark:text-fuchsia-300">{config.lookback} avant chaque cible</p></div><div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-3 dark:border-indigo-900/60 dark:bg-indigo-950/30"><p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">Chaînes distinctes</p><p className="mt-1 text-lg font-bold text-indigo-900 dark:text-indigo-100">{result.patterns.length}</p><p className="text-[10px] text-indigo-700 dark:text-indigo-300">Top 30 affiché</p></div></div>

    {result.targetCount === 0 ? <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"><AlertTriangle className="h-4 w-4 shrink-0" />Aucun résultat ne dépasse le seuil actuel, ou il n’y a pas assez de résultats précédents pour former une fenêtre complète.</div> : <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(260px,0.9fr)_minmax(0,1.6fr)]"><div className="space-y-2" aria-label="Chaînes récurrentes avant gros multiplicateur">{visiblePatterns.map((pattern) => <React.Fragment key={pattern.id}><PatternCard pattern={pattern} selected={selectedPattern?.id === pattern.id} onSelect={() => setSelectedPatternId(pattern.id)} /></React.Fragment>)}</div>{selectedPattern && <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-wider text-fuchsia-700 dark:text-fuchsia-300">Chaîne sélectionnée</p><h4 className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{selectedPattern.label}</h4><p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">{selectedPattern.occurrences} occurrence(s) · {formatRate(selectedPattern.rate)} de tous les gros résultats · dernier à {formatDateTime(selectedPattern.lastOccurrenceAt)}</p></div><Clock3 className="h-4 w-4 text-fuchsia-600" /></div><div className="mt-4 space-y-2"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Exemples chronologiques</p>{selectedPattern.examples.map((example, index) => <div key={`${example.targetTimestamp}-${index}`} className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"><SequenceRail occurrence={example} threshold={config.threshold} /><p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">Cible à {formatDateTime(example.targetTimestamp)} · délai total avant la cible : <span className="font-mono font-semibold">{formatInterval(example.totalLeadTimeSeconds)}</span></p></div>)}</div></div>}</div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800"><table className="w-full min-w-[760px] text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 dark:bg-slate-950/60 dark:text-slate-400"><tr><th className="px-3 py-2 text-left">Résultat gros</th><th className="px-3 py-2 text-right">Valeur</th><th className="px-3 py-2 text-left">Chaîne précédente</th><th className="px-3 py-2 text-right">Délai total</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{result.recentOccurrences.slice(0, 12).map((occurrence) => <tr key={occurrence.targetTimestamp} className="text-slate-700 dark:text-slate-300"><td className="px-3 py-2 font-medium">{formatDateTime(occurrence.targetTimestamp)}</td><td className="px-3 py-2 text-right"><span className="rounded-md border border-rose-300 bg-rose-100 px-2 py-1 font-bold text-rose-800 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200">{formatValue(occurrence.targetCoefficient)}</span></td><td className="max-w-[460px] overflow-hidden px-3 py-2"><div className="overflow-x-auto"><SequenceRail occurrence={occurrence} threshold={config.threshold} /></div></td><td className="px-3 py-2 text-right font-mono text-[10px]">{formatInterval(occurrence.totalLeadTimeSeconds)}</td></tr>)}</tbody></table></div>
    </>}
  </section>;
};
