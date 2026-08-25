import React, { useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, ChevronRight, Filter, Search, Sparkles } from 'lucide-react';
import { JsonRecord } from '../types';
import {
  DEFAULT_SEQUENCE_SCANNER_CONFIG,
  SequenceAnalysisMode,
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
  const [granularity, setGranularity] = useState<SequenceTemporalGranularity>('hour');
  const [selectedPatternId, setSelectedPatternId] = useState<string | null>(null);

  const result = useMemo(() => scanConditionalSequences(records, config), [records, config]);
  const visiblePatterns = useMemo(() => result.patterns.filter((pattern) => mode === 'all' || pattern.mode === mode).slice(0, 60), [mode, result.patterns]);
  const selectedPattern = visiblePatterns.find((pattern) => pattern.id === selectedPatternId) ?? visiblePatterns[0] ?? null;
  const temporalRows = selectedPattern?.temporal[granularity] ?? [];

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
        <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 px-2.5 py-1.5"><CalendarClock className="w-3.5 h-3.5 text-fuchsia-500" /><select value={granularity} onChange={(event) => setGranularity(event.target.value as SequenceTemporalGranularity)} className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none">{granularityOptions.map((option) => <option key={option.value} value={option.value}>Regrouper par {option.label.toLowerCase()}</option>)}</select></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-3"><p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">Ordonnés</p><p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{result.orderedValidCount}</p><p className="text-[10px] text-slate-500 dark:text-slate-400">date + heure valides</p></div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-3"><p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">Motifs trouvés</p><p className="mt-1 text-lg font-bold text-fuchsia-700 dark:text-fuchsia-300">{visiblePatterns.length}</p><p className="text-[10px] text-slate-500 dark:text-slate-400">jusqu’à 60 affichés</p></div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-3"><p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">Ignorés</p><p className="mt-1 text-lg font-bold text-amber-600 dark:text-amber-300">{result.ignoredCount}</p><p className="text-[10px] text-slate-500 dark:text-slate-400">date/coefficient invalide</p></div>
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
                  {selectedPattern.nextByPosition.map((position) => <div key={position.position} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5"><p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Position +{position.position}</p><p className="mt-1 text-xs font-bold text-indigo-700 dark:text-indigo-300">{formatRate(position.aboveTargetRate)} &gt; {formatValue(config.targetThreshold)}</p><p className="text-[10px] text-slate-500 dark:text-slate-400">n={position.sampleCount} · méd. {formatValue(position.median)}</p><p className="text-[10px] text-slate-500 dark:text-slate-400">P90 {formatValue(position.p90)} · max {formatValue(position.maximum)}</p></div>)}
                </div>
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2"><p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">Répartition temporelle — {granularityOptions.find((option) => option.value === granularity)?.label}</p><span className="text-[10px] text-slate-500 dark:text-slate-400">Résultat suivant uniquement</span></div>
                {temporalRows.length > 0 ? <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800"><table className="w-full min-w-[540px] text-xs"><thead className="bg-white dark:bg-slate-900 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400"><tr><th className="px-3 py-2 text-left">Période</th><th className="px-3 py-2 text-right">Motifs</th><th className="px-3 py-2 text-right">Échantillon</th><th className="px-3 py-2 text-right">&gt; cible</th><th className="px-3 py-2 text-right">Taux observé</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{temporalRows.map((row) => <tr key={row.key} className="text-slate-700 dark:text-slate-300"><td className="px-3 py-2 font-semibold">{row.label}</td><td className="px-3 py-2 text-right">{row.occurrences}</td><td className="px-3 py-2 text-right">{row.nextEvaluatedCount}</td><td className="px-3 py-2 text-right">{row.aboveTargetCount}</td><td className="px-3 py-2 text-right font-bold text-fuchsia-700 dark:text-fuchsia-300">{formatRate(row.aboveTargetRate)}</td></tr>)}</tbody></table></div> : <p className="text-xs text-slate-500 dark:text-slate-400">Pas assez de données pour ce regroupement.</p>}
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
