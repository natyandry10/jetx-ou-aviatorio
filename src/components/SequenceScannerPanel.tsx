import React, { useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, ChevronRight, Filter, LayoutGrid, List, Search, Sparkles } from 'lucide-react';
import { JsonRecord } from '../types';
import {
  DEFAULT_SEQUENCE_SCANNER_CONFIG,
  SequenceAnalysisMode,
  SequenceDisplayExample,
  SequenceDisplayStep,
  SequencePatternResult,
  SequenceScannerConfig,
  SequenceTemporalGranularity,
  scanConditionalSequences,
} from '../utils/analytics';

interface SequenceScannerPanelProps {
  records: JsonRecord[];
}

const granularityOptions: Array<{ value: SequenceTemporalGranularity; label: string }> = [
  { value: 'hour', label: 'Heure' },
  { value: 'day', label: 'Jour' },
  { value: 'month', label: 'Mois' },
  { value: 'year', label: 'Année' },
];

function formatValue(value: number): string {
  return `${value.toFixed(2)}x`;
}

function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

function formatInterval(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return 'début';
  if (seconds < 60) return `${Math.round(seconds)} s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return remainingSeconds === 0 ? `${minutes} min` : `${minutes} min ${remainingSeconds} s`;
}

function coefficientStyle(coefficient: number): { className: string; label: string } {
  if (coefficient > 10) return { className: 'border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200', label: '>10x' };
  if (coefficient >= 4) return { className: 'border-violet-300 bg-violet-100 text-violet-800 dark:border-violet-800 dark:bg-violet-950/60 dark:text-violet-200', label: '4–10x' };
  if (coefficient > 1.45) return { className: 'border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200', label: '1,46–4x' };
  return { className: 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200', label: '≤1,45x' };
}

function SequenceRail({ example }: { example: SequenceDisplayExample }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label="Séquence chronologique colorée">
      {example.steps.map((step: SequenceDisplayStep, index) => {
        const style = coefficientStyle(step.coefficient);
        return (
          <React.Fragment key={`${step.timestamp}-${index}`}>
            {index > 0 && <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500" title="Intervalle entre les résultats">— {formatInterval(step.intervalSeconds)} →</span>}
            <span title={`${style.label} · ${formatDate(step.timestamp)}`} className={`inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-bold ${style.className}`}>
              {step.coefficient.toFixed(2)}x
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'date inconnue';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function PatternSummary({ pattern, selected, onSelect }: { pattern: SequencePatternResult; selected: boolean; onSelect: () => void }) {
  const firstPosition = pattern.nextByPosition[0];
  return (
    <button type="button" onClick={onSelect} className={`w-full text-left rounded-xl border p-3 transition-colors ${selected ? 'border-fuchsia-300 bg-fuchsia-50 dark:border-fuchsia-800 dark:bg-fuchsia-950/30' : 'border-slate-200 bg-slate-50/70 hover:border-fuchsia-200 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-fuchsia-900'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{pattern.label}</p>
          {pattern.triggerLabel && <p className="mt-1 text-[10px] text-fuchsia-700 dark:text-fuchsia-300">{pattern.triggerLabel}</p>}
        </div>
        <ChevronRight className={`w-4 h-4 shrink-0 ${selected ? 'text-fuchsia-600' : 'text-slate-400'}`} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div><p className="text-[10px] text-slate-500 dark:text-slate-400">Occurrences</p><p className="text-sm font-bold text-slate-900 dark:text-white">{pattern.occurrences}</p></div>
        <div><p className="text-[10px] text-slate-500 dark:text-slate-400">Après #1</p><p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{firstPosition?.sampleCount ?? 0}</p></div>
        <div><p className="text-[10px] text-slate-500 dark:text-slate-400">Au-dessus</p><p className="text-sm font-bold text-amber-600 dark:text-amber-300">{firstPosition ? formatRate(firstPosition.aboveTargetRate) : '—'}</p></div>
      </div>
    </button>
  );
}

export const SequenceScannerPanel: React.FC<SequenceScannerPanelProps> = ({ records }) => {
  const [config, setConfig] = useState<SequenceScannerConfig>(DEFAULT_SEQUENCE_SCANNER_CONFIG);
  const [mode, setMode] = useState<'all' | SequenceAnalysisMode>('all');
  const [resultFilter, setResultFilter] = useState<'all' | 'above-ten'>('all');
  const [granularity, setGranularity] = useState<SequenceTemporalGranularity>('hour');
  const [selectedPatternId, setSelectedPatternId] = useState<string | null>(null);
  const [observedView, setObservedView] = useState<'cards' | 'table'>('cards');

  const result = useMemo(() => scanConditionalSequences(records, config), [records, config]);
  const visiblePatterns = useMemo(() => result.patterns
    .filter((pattern) => mode === 'all' || pattern.mode === mode)
    .filter((pattern) => resultFilter === 'all' || pattern.nextByPosition.some((position) => position.aboveTenCount > 0))
    .slice(0, 150), [mode, result.patterns, resultFilter]);
  const selectedPattern = visiblePatterns.find((pattern) => pattern.id === selectedPatternId) ?? visiblePatterns[0] ?? null;
  const trackedPatterns = useMemo(() => [...visiblePatterns]
    .sort((left, right) => right.occurrences - left.occurrences || right.lastOccurrenceAt.localeCompare(left.lastOccurrenceAt))
    .slice(0, 8), [visiblePatterns]);
  const temporalRows = selectedPattern?.temporal[granularity] ?? [];
  const threeSmallSummary = result.threeSmallToAboveTen;
  const threeSmallFirstPosition = threeSmallSummary.nextByPosition[0];

  const updateNumber = (field: keyof SequenceScannerConfig, rawValue: string) => {
    const value = Number(rawValue);
    if (!Number.isFinite(value)) return;
    setConfig((current) => ({ ...current, [field]: value }));
    setSelectedPatternId(null);
  };

  return (
    <section className="rounded-2xl border border-fuchsia-200 dark:border-fuchsia-900/60 bg-white dark:bg-slate-850 p-5 sm:p-6 shadow-xs space-y-5" aria-labelledby="sequence-analysis-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-fuchsia-50 dark:bg-fuchsia-950/50 text-fuchsia-600 dark:text-fuchsia-400"><Sparkles className="w-5 h-5" /></div>
          <div>
            <h3 id="sequence-analysis-title" className="text-sm font-bold text-slate-900 dark:text-white">Ruban Analyse approfondie</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Scanner historique des séquences, des tranches et des résultats observés après chaque motif.</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[10px] font-semibold text-slate-600 dark:text-slate-300"><Search className="w-3.5 h-3.5" /> Recherche par fenêtres</span>
      </div>

      <div className="rounded-xl border border-fuchsia-100 dark:border-fuchsia-900/50 bg-fuchsia-50/60 dark:bg-fuchsia-950/20 p-3 text-[11px] text-fuchsia-900 dark:text-fuchsia-200">
        <strong>Lecture :</strong> les pourcentages ci-dessous décrivent uniquement ce qui a été observé dans les données triées par date et heure. Ils ne prédisent pas le prochain résultat et ne constituent pas une consigne de mise.
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        <label className="space-y-1"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Longueur min.</span><input type="number" min="2" max="20" step="1" value={config.minLength} onChange={(event) => updateNumber('minLength', event.target.value)} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-fuchsia-500" /></label>
        <label className="space-y-1"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Longueur max.</span><input type="number" min="2" max="20" step="1" value={config.maxLength} onChange={(event) => updateNumber('maxLength', event.target.value)} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-fuchsia-500" /></label>
        <label className="space-y-1"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Résultats suivants</span><input type="number" min="1" max="10" step="1" value={config.lookahead} onChange={(event) => updateNumber('lookahead', event.target.value)} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-fuchsia-500" /></label>
        <label className="space-y-1"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Seuil bas</span><input type="number" min="1" max="20" step="0.05" value={config.lowThreshold} onChange={(event) => updateNumber('lowThreshold', event.target.value)} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-fuchsia-500" /></label>
        <label className="space-y-1"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Déclencheur haut</span><input type="number" min="1" max="1000" step="0.1" value={config.triggerThreshold} onChange={(event) => updateNumber('triggerThreshold', event.target.value)} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-fuchsia-500" /></label>
        <label className="space-y-1"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Cible observée</span><input type="number" min="1" max="1000" step="0.1" value={config.targetThreshold} onChange={(event) => updateNumber('targetThreshold', event.target.value)} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-fuchsia-500" /></label>
        <label className="space-y-1"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Précision exacte</span><input type="number" min="0" max="4" step="1" value={config.exactPrecision} onChange={(event) => updateNumber('exactPrecision', event.target.value)} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-fuchsia-500" /></label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 px-2.5 py-1.5"><Filter className="w-3.5 h-3.5 text-fuchsia-500" /><select value={mode} onChange={(event) => { setMode(event.target.value as 'all' | SequenceAnalysisMode); setSelectedPatternId(null); }} className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none"><option value="all">Tous les motifs</option><option value="exact">Valeurs exactes répétées</option><option value="low-high">Tranches basses puis seuil haut</option></select></div>
        <label className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/30 px-2.5 py-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300"><input type="checkbox" checked={resultFilter === 'above-ten'} onChange={(event) => { setResultFilter(event.target.checked ? 'above-ten' : 'all'); setSelectedPatternId(null); }} className="accent-amber-600" />Résultats suivants &gt; 10x uniquement</label>
        <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 px-2.5 py-1.5"><CalendarClock className="w-3.5 h-3.5 text-fuchsia-500" /><select value={granularity} onChange={(event) => setGranularity(event.target.value as SequenceTemporalGranularity)} className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none">{granularityOptions.map((option) => <option key={option.value} value={option.value}>Regrouper par {option.label.toLowerCase()}</option>)}</select></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-3"><p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">Ordonnés</p><p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{result.orderedValidCount}</p><p className="text-[10px] text-slate-500 dark:text-slate-400">date + heure valides</p></div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-3"><p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">Motifs trouvés</p><p className="mt-1 text-lg font-bold text-fuchsia-700 dark:text-fuchsia-300">{visiblePatterns.length}</p><p className="text-[10px] text-slate-500 dark:text-slate-400">après filtres, jusqu’à 150</p></div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-3"><p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">Ignorés</p><p className="mt-1 text-lg font-bold text-amber-600 dark:text-amber-300">{result.ignoredCount}</p><p className="text-[10px] text-slate-500 dark:text-slate-400">date/coefficient invalide</p></div>
      </div>

      {trackedPatterns.length > 0 && <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/60 dark:bg-indigo-950/20 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] uppercase tracking-wider font-bold text-indigo-700 dark:text-indigo-300">Séquences observées — suivi rapide</p><p className="mt-1 text-[11px] text-indigo-900/80 dark:text-indigo-200/80">Les chaînes sont classées par occurrences, puis par récence. Sélectionne une ligne pour ouvrir ses détails et ses exemples.</p></div><div className="flex items-center gap-2"><span className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-300">Top {trackedPatterns.length}</span><div className="inline-flex rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white/70 dark:bg-slate-900/50 p-0.5"><button type="button" onClick={() => setObservedView('cards')} aria-label="Afficher les séquences en cartes" className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold ${observedView === 'cards' ? 'bg-indigo-600 text-white' : 'text-indigo-700 dark:text-indigo-300'}`}><LayoutGrid className="h-3 w-3" />Cartes</button><button type="button" onClick={() => setObservedView('table')} aria-label="Afficher les séquences en tableau" className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold ${observedView === 'table' ? 'bg-indigo-600 text-white' : 'text-indigo-700 dark:text-indigo-300'}`}><List className="h-3 w-3" />Tableau</button></div></div></div>
        {observedView === 'cards' ? <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">{trackedPatterns.map((pattern, index) => { const firstPosition = pattern.nextByPosition[0]; return <button key={pattern.id} type="button" onClick={() => setSelectedPatternId(pattern.id)} className={`rounded-lg border p-2.5 text-left transition-colors ${selectedPattern?.id === pattern.id ? 'border-indigo-500 bg-white dark:border-indigo-500 dark:bg-slate-900' : 'border-indigo-200/80 dark:border-indigo-800/70 bg-white/70 dark:bg-slate-900/50 hover:border-indigo-400 dark:hover:border-indigo-600'}`}><div className="flex items-start gap-2"><span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/70 px-1 text-[9px] font-bold text-indigo-700 dark:text-indigo-200">{index + 1}</span><p className="min-w-0 truncate text-[10px] font-bold text-slate-800 dark:text-slate-100" title={pattern.label}>{pattern.label}</p></div><p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">{pattern.occurrences} occurrence(s) · dernière {formatDate(pattern.lastOccurrenceAt)}</p><p className="mt-1 text-[10px] font-semibold text-amber-700 dark:text-amber-300">+1 &gt;10x : {firstPosition ? formatRate(firstPosition.aboveTenRate) : '—'}</p></button>; })}</div> : <div className="overflow-x-auto rounded-lg border border-indigo-200/80 dark:border-indigo-800/70 bg-white/60 dark:bg-slate-900/40"><table className="w-full min-w-[760px] text-xs"><thead className="bg-white/80 dark:bg-slate-900/70 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400"><tr><th className="px-3 py-2 text-left">#</th><th className="px-3 py-2 text-left">Chaîne</th><th className="px-3 py-2 text-right">Occurrences</th><th className="px-3 py-2 text-left">Première</th><th className="px-3 py-2 text-left">Dernière</th><th className="px-3 py-2 text-right">+1 &gt;10x</th></tr></thead><tbody className="divide-y divide-indigo-100 dark:divide-indigo-900/50">{trackedPatterns.map((pattern, index) => { const firstPosition = pattern.nextByPosition[0]; return <tr key={pattern.id} className={`cursor-pointer text-slate-700 dark:text-slate-300 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/30 ${selectedPattern?.id === pattern.id ? 'bg-indigo-50 dark:bg-indigo-950/40' : ''}`} onClick={() => setSelectedPatternId(pattern.id)}><td className="px-3 py-2 font-bold text-indigo-700 dark:text-indigo-300">{index + 1}</td><td className="max-w-[270px] truncate px-3 py-2 font-semibold text-slate-900 dark:text-white" title={pattern.label}>{pattern.label}</td><td className="px-3 py-2 text-right font-bold">{pattern.occurrences}</td><td className="px-3 py-2 text-[10px]">{formatDate(pattern.firstOccurrenceAt)}</td><td className="px-3 py-2 text-[10px]">{formatDate(pattern.lastOccurrenceAt)}</td><td className="px-3 py-2 text-right font-bold text-amber-700 dark:text-amber-300">{firstPosition ? formatRate(firstPosition.aboveTenRate) : '—'}</td></tr>; })}</tbody></table></div>}
      </div>}

      <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/30 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-[10px] uppercase tracking-wider font-bold text-amber-700 dark:text-amber-300">Taux historique — 3 petits puis &gt;10x</p><p className="mt-1 text-xs text-amber-900 dark:text-amber-100">Après trois résultats consécutifs ≤ {config.lowThreshold.toFixed(2)}x, mesure des résultats suivants qui dépassent 10x.</p></div>
          <span className="text-[10px] text-amber-700 dark:text-amber-300">{threeSmallSummary.occurrences} séquence(s)</span>
        </div>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2">
          {threeSmallSummary.nextByPosition.map((position) => <div key={position.position} className="rounded-lg border border-amber-200/80 dark:border-amber-800/70 bg-white/70 dark:bg-slate-900/50 p-2.5"><p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Position +{position.position}</p><p className="mt-1 text-sm font-bold text-amber-700 dark:text-amber-300">{formatRate(position.aboveTenRate)} &gt; 10x</p><p className="text-[10px] text-slate-500 dark:text-slate-400">{position.aboveTenCount}/{position.sampleCount} observé(s) · méd. {formatValue(position.median)}</p><p className="text-[10px] text-slate-500 dark:text-slate-400">Écart moy. {formatInterval(position.intervalMeanSeconds)}</p></div>)}
        </div>
        {threeSmallSummary.examples.length > 0 && <div className="mt-4 rounded-lg border border-amber-200/80 dark:border-amber-800/70 bg-white/60 dark:bg-slate-900/40 p-3 space-y-2"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[10px] uppercase tracking-wider font-bold text-amber-800 dark:text-amber-300">Exemples de séquences observées</p><p className="text-[10px] text-slate-500 dark:text-slate-400">couleur = tranche · flèche = intervalle</p></div>{threeSmallSummary.examples.slice(0, 3).map((example, index) => <div key={index} className="overflow-x-auto"><SequenceRail example={example} /></div>)}</div>}
        {threeSmallFirstPosition?.sampleCount === 0 && <p className="mt-3 text-[11px] text-amber-800 dark:text-amber-300">Aucune séquence complète de trois petits multiplicateurs ne permet de calculer ce taux sur la période actuelle.</p>}
      </div>

      {visiblePatterns.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(260px,0.9fr)_minmax(0,1.6fr)] gap-4">
          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1" aria-label="Motifs détectés">
            {visiblePatterns.map((pattern) => <React.Fragment key={pattern.id}><PatternSummary pattern={pattern} selected={selectedPattern?.id === pattern.id} onSelect={() => setSelectedPatternId(pattern.id)} /></React.Fragment>)}
          </div>
          {selectedPattern && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 p-4 space-y-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-fuchsia-700 dark:text-fuchsia-300">Motif sélectionné</p>
                <h4 className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{selectedPattern.label}</h4>
                {selectedPattern.triggerLabel && <p className="text-[11px] text-fuchsia-700 dark:text-fuchsia-300 mt-1">{selectedPattern.triggerLabel}</p>}
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2">Première occurrence : {formatDate(selectedPattern.firstOccurrenceAt)} · dernière : {formatDate(selectedPattern.lastOccurrenceAt)}</p>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mb-2">Résultats observés après le motif</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2">
                  {selectedPattern.nextByPosition.map((position) => <div key={position.position} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5"><p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Position +{position.position}</p><p className="mt-1 text-xs font-bold text-indigo-700 dark:text-indigo-300">{formatRate(position.aboveTargetRate)} &gt; {formatValue(config.targetThreshold)}</p><p className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">{formatRate(position.aboveTenRate)} &gt; 10x</p><p className="text-[10px] text-slate-500 dark:text-slate-400">n={position.sampleCount} · méd. {formatValue(position.median)}</p><p className="text-[10px] text-slate-500 dark:text-slate-400">P90 {formatValue(position.p90)} · max {formatValue(position.maximum)}</p></div>)}
                </div>
              </div>

              {selectedPattern.examples.length > 0 && <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 p-3 space-y-2"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[10px] uppercase tracking-wider font-bold text-slate-600 dark:text-slate-300">Séquences observées</p><p className="text-[10px] text-slate-500 dark:text-slate-400">pastilles colorées · intervalles entre résultats</p></div>{selectedPattern.examples.slice(0, 4).map((example, index) => <div key={index} className="overflow-x-auto"><SequenceRail example={example} /></div>)}</div>}

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2"><p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">Répartition temporelle — {granularityOptions.find((option) => option.value === granularity)?.label}</p><span className="text-[10px] text-slate-500 dark:text-slate-400">Résultat suivant uniquement</span></div>
                {temporalRows.length > 0 ? <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800"><table className="w-full min-w-[540px] text-xs"><thead className="bg-white dark:bg-slate-900 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400"><tr><th className="px-3 py-2 text-left">Période</th><th className="px-3 py-2 text-right">Motifs</th><th className="px-3 py-2 text-right">Échantillon</th><th className="px-3 py-2 text-right">&gt; cible</th><th className="px-3 py-2 text-right">&gt;10x</th><th className="px-3 py-2 text-right">Taux observé</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{temporalRows.map((row) => <tr key={row.key} className="text-slate-700 dark:text-slate-300"><td className="px-3 py-2 font-semibold">{row.label}</td><td className="px-3 py-2 text-right">{row.occurrences}</td><td className="px-3 py-2 text-right">{row.nextEvaluatedCount}</td><td className="px-3 py-2 text-right">{row.aboveTargetCount}</td><td className="px-3 py-2 text-right">{row.aboveTenCount}</td><td className="px-3 py-2 text-right font-bold text-fuchsia-700 dark:text-fuchsia-300">{formatRate(row.aboveTenRate)}</td></tr>)}</tbody></table></div> : <p className="text-xs text-slate-500 dark:text-slate-400">Pas assez de données pour ce regroupement.</p>}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-4 text-xs text-amber-800 dark:text-amber-300"><AlertTriangle className="w-4 h-4 shrink-0" />Aucun motif ne correspond aux paramètres actuels. Essaie une longueur plus courte ou des seuils moins stricts.</div>
      )}
    </section>
  );
};
