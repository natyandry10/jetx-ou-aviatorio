import React, { useEffect, useMemo, useState } from 'react';
import { Archive, Download, FileDown, Play, RotateCcw, Save, Trash2 } from 'lucide-react';
import { JsonRecord } from '../types';
import { analyzeLiveSimilarity, SimilarityResult } from '../utils/liveSimilarityAnalytics';
import { analyzePrecedingSequences, PrecedingSequenceResult } from '../utils/precedingAnalytics';
import { analyzeScrapTesting, ScrapAnalysisResult } from '../utils/scrapAnalytics';
import { AnalysisModel, createRecordId, deleteSavedAnalysisRun, loadAnalysisModels, loadSavedAnalysisRuns, persistAnalysisModels, persistSavedAnalysisRun, SavedAnalysisRun } from '../utils/storage';
import { DEFAULT_ANALYSIS_MODELS } from '../utils/analysisModels';

interface LiveRecord extends JsonRecord {
  timestamp: string;
}

interface LiveAnalysisWorkbenchProps {
  records: LiveRecord[];
  sourceName?: string;
}

type AnalysisPayload = SimilarityResult | PrecedingSequenceResult | ScrapAnalysisResult;

interface ActiveAnalysis {
  id?: string;
  createdAt: string;
  model: AnalysisModel;
  configuration: Record<string, unknown>;
  result: AnalysisPayload;
}

function formatPercent(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : '—';
}

function formatDuration(seconds: unknown): string {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) return '—';
  const safe = Math.max(0, Math.round(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const remaining = safe % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date inconnue' : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'medium' }).format(date);
}

function formatClock(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(date);
}

function similarityConfidence(result: SimilarityResult): { label: string; className: string } {
  if (result.matchCount < 10) return { label: 'Faible — moins de 10 correspondances', className: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200' };
  if (result.matchCount < 20) return { label: 'Limitée — échantillon encore réduit', className: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200' };
  return { label: 'Documentée — au moins 20 correspondances', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200' };
}

function SimilarityProjectionCard({ result }: { result: SimilarityResult }) {
  const confidence = similarityConfidence(result);
  const anchor = result.currentWindow.at(-1)?.timestamp ?? null;
  const matchMode = result.matchMode === 'band-and-interval' ? 'tranches + intervalles proches' : result.matchMode === 'bands-only-fallback' ? 'tranches (fallback)' : 'aucune correspondance';
  return <div className="rounded-2xl border border-violet-300 bg-gradient-to-br from-violet-50 via-white to-indigo-50 p-4 dark:border-violet-800 dark:from-violet-950/50 dark:via-slate-900 dark:to-indigo-950/40"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-700 dark:text-violet-300">Estimation historique dynamique</p><h4 className="mt-1 text-base font-bold text-slate-900 dark:text-white">Résultat calculé depuis la fenêtre LIVE sélectionnée</h4><p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">Dernier tour de la fenêtre : {anchor ? formatDateTime(anchor) : '—'} · cible : &gt;{result.threshold}x · horizon : {result.horizonMinutes} min. · comparaison : {matchMode}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${confidence.className}`}>{confidence.label}</span></div>{result.estimatedNextTimestamp && result.medianTargetCoefficient !== null ? <><div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-xl border border-rose-200 bg-white/80 p-3 dark:border-rose-900/60 dark:bg-slate-900/70"><p className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">Multiplicateur cible estimé</p><p className="mt-1 text-2xl font-extrabold text-rose-800 dark:text-rose-200">{result.medianTargetCoefficient.toFixed(2)}x</p><p className="text-[10px] text-rose-700 dark:text-rose-300">médiane des cibles historiques</p></div><div className="rounded-xl border border-indigo-200 bg-white/80 p-3 dark:border-indigo-900/60 dark:bg-slate-900/70"><p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">Heure prochain tour estimée</p><p className="mt-1 text-2xl font-extrabold text-indigo-800 dark:text-indigo-200">{formatClock(result.estimatedNextTimestamp)}</p><p className="text-[10px] text-indigo-700 dark:text-indigo-300">heure locale calculée</p></div><div className="rounded-xl border border-cyan-200 bg-white/80 p-3 dark:border-cyan-900/60 dark:bg-slate-900/70"><p className="text-[10px] font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-300">Délai central</p><p className="mt-1 text-2xl font-extrabold text-cyan-800 dark:text-cyan-200">{formatDuration(result.medianDelaySeconds)}</p><p className="text-[10px] text-cyan-700 dark:text-cyan-300">depuis le dernier tour</p></div><div className="rounded-xl border border-amber-200 bg-white/80 p-3 dark:border-amber-900/60 dark:bg-slate-900/70"><p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">Cas avec cible</p><p className="mt-1 text-2xl font-extrabold text-amber-800 dark:text-amber-200">{result.targetCount}/{result.matchCount}</p><p className="text-[10px] text-amber-700 dark:text-amber-300">{formatPercent(result.targetRate)} dans l’horizon</p></div></div><div className="mt-3 rounded-xl border border-violet-200 bg-white/70 p-3 text-[11px] text-violet-950 dark:border-violet-900/60 dark:bg-slate-900/60 dark:text-violet-100"><strong>Lecture prudente :</strong> l’heure affichée est calculée en ajoutant le délai médian historique à la fin de la fenêtre sélectionnée. L’intervalle des délais observés est {formatDuration(result.minDelaySeconds)} → {formatDuration(result.maxDelaySeconds)} et le multiplicateur central est encadré par {result.p25TargetCoefficient?.toFixed(2) ?? '—'}x → {result.p75TargetCoefficient?.toFixed(2) ?? '—'}x. Ce n’est pas une garantie du prochain résultat.</div></> : <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100"><strong>Aucune estimation disponible.</strong> La sélection ne possède pas encore assez de fenêtres historiques comparables avec une cible observée dans l’horizon choisi. Les nouvelles données LIVE ne recalculeront pas ce résultat automatiquement.</div>}</div>;
}

function downloadText(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function runToActive(run: SavedAnalysisRun, model: AnalysisModel): ActiveAnalysis {
  return { id: run.id, createdAt: run.createdAt, model, configuration: run.configuration, result: run.result as unknown as AnalysisPayload };
}

export const LiveAnalysisWorkbench: React.FC<LiveAnalysisWorkbenchProps> = ({ records, sourceName }) => {
  const [models, setModels] = useState<AnalysisModel[]>(DEFAULT_ANALYSIS_MODELS);
  const [selectedModelId, setSelectedModelId] = useState('live-similarity-5');
  const [savedRuns, setSavedRuns] = useState<SavedAnalysisRun[]>([]);
  const [activeAnalysis, setActiveAnalysis] = useState<ActiveAnalysis | null>(null);
  const [status, setStatus] = useState<'idle' | 'running' | 'completed'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([loadAnalysisModels(DEFAULT_ANALYSIS_MODELS), loadSavedAnalysisRuns()]).then(([loadedModels, loadedRuns]) => {
      if (cancelled) return;
      setModels(loadedModels);
      setSavedRuns(loadedRuns);
      void persistAnalysisModels(loadedModels);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedModel = useMemo(() => models.find((model) => model.id === selectedModelId) ?? models[0] ?? DEFAULT_ANALYSIS_MODELS[0], [models, selectedModelId]);

  const launchAnalysis = () => {
    if (records.length === 0) {
      setMessage('Aucun résultat LIVE disponible. Démarre LIVE et attends au moins une lecture du fichier.');
      return;
    }
    setStatus('running');
    setMessage(null);
    window.setTimeout(() => {
      const configuration = { ...selectedModel.config, sourceName: sourceName ?? 'Source LIVE', dataCount: records.length };
      let result: AnalysisPayload;
      if (selectedModel.kind === 'live-similarity') {
        result = analyzeLiveSimilarity(records, selectedModel.config as Partial<Parameters<typeof analyzeLiveSimilarity>[1]>);
      } else if (selectedModel.kind === 'preceding-sequence') {
        result = analyzePrecedingSequences(records, selectedModel.config as Partial<Parameters<typeof analyzePrecedingSequences>[1]>);
      } else {
        result = analyzeScrapTesting(records, selectedModel.config as Parameters<typeof analyzeScrapTesting>[1]);
      }
      setActiveAnalysis({ createdAt: new Date().toISOString(), model: selectedModel, configuration, result });
      setStatus('completed');
    }, 0);
  };

  const saveAnalysis = async () => {
    if (!activeAnalysis) return;
    const run: SavedAnalysisRun = {
      id: activeAnalysis.id ?? createRecordId('analysis'),
      createdAt: activeAnalysis.createdAt,
      modelId: activeAnalysis.model.id,
      modelName: activeAnalysis.model.name,
      sourceName,
      configuration: activeAnalysis.configuration,
      result: activeAnalysis.result as unknown as Record<string, unknown>,
    };
    await persistSavedAnalysisRun(run);
    setActiveAnalysis({ ...activeAnalysis, id: run.id });
    setSavedRuns((current) => [run, ...current.filter((item) => item.id !== run.id)]);
    setMessage('Analyse enregistrée dans IndexedDB.');
  };

  const exportJson = () => {
    if (!activeAnalysis) return;
    const payload = { ...activeAnalysis, exportedAt: new Date().toISOString() };
    downloadText(`analyse-${activeAnalysis.model.id}-${Date.now()}.json`, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
    setMessage('Configuration et résultat exportés en JSON.');
  };

  const exportPdf = () => {
    if (!activeAnalysis) return;
    const popup = window.open('', '_blank', 'noopener,noreferrer');
    if (!popup) {
      setMessage('Le navigateur a bloqué la fenêtre PDF. Autorise les fenêtres popup puis réessaie.');
      return;
    }
    const printable = JSON.stringify({ configuration: activeAnalysis.configuration, result: activeAnalysis.result }, null, 2);
    popup.document.write(`<html><head><title>Analyse ${escapeHtml(activeAnalysis.model.name)}</title><style>body{font-family:Arial,sans-serif;color:#172033;padding:32px;line-height:1.5}h1{color:#7c3aed}h2{margin-top:24px;border-bottom:1px solid #ddd;padding-bottom:6px}pre{white-space:pre-wrap;background:#f5f7fb;border:1px solid #dce2ec;border-radius:8px;padding:16px;font-size:11px}p{color:#536174}</style></head><body><h1>Rapport d’analyse LIVE</h1><h2>${escapeHtml(activeAnalysis.model.name)}</h2><p>Date de calcul : ${escapeHtml(formatDateTime(activeAnalysis.createdAt))}</p><p>Source : ${escapeHtml(sourceName ?? 'Source LIVE')}</p><h2>Configuration et résultat</h2><pre>${escapeHtml(printable)}</pre><p>Rapport descriptif historique — aucune garantie sur les résultats futurs.</p></body></html>`);
    popup.document.close();
    popup.focus();
    window.setTimeout(() => popup.print(), 300);
    setMessage('Le rapport est prêt dans la fenêtre d’impression. Choisis « Enregistrer au format PDF ».');
  };

  const clearAnalysis = () => {
    setActiveAnalysis(null);
    setStatus('idle');
    setMessage(null);
  };

  const loadRun = (run: SavedAnalysisRun) => {
    const model = models.find((item) => item.id === run.modelId) ?? DEFAULT_ANALYSIS_MODELS.find((item) => item.id === run.modelId) ?? models[0];
    if (!model) return;
    setActiveAnalysis(runToActive(run, model));
    setStatus('completed');
    setMessage('Analyse enregistrée chargée depuis IndexedDB.');
  };

  const removeRun = async (id: string) => {
    await deleteSavedAnalysisRun(id);
    setSavedRuns((current) => current.filter((run) => run.id !== id));
    if (activeAnalysis?.id === id) clearAnalysis();
  };

  const result = activeAnalysis?.result;
  const similarityResult = activeAnalysis?.model.kind === 'live-similarity' ? result as SimilarityResult : null;
  const precedingResult = activeAnalysis?.model.kind === 'preceding-sequence' ? result as PrecedingSequenceResult : null;
  const scrapResult = activeAnalysis?.model.kind === 'top-period' ? result as ScrapAnalysisResult : null;

  return <section className="rounded-2xl border border-violet-200 bg-white p-5 shadow-xs dark:border-violet-900/70 dark:bg-slate-900" aria-labelledby="live-analysis-title"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300">Analyse manuelle des données LIVE</p><h3 id="live-analysis-title" className="mt-1 text-sm font-bold text-slate-900 dark:text-white">Choisir un modèle puis lancer l’analyse</h3><p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Aucun calcul ne démarre à l’ouverture et les nouvelles lignes LIVE ne recalculent pas automatiquement le résultat affiché.</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${status === 'completed' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{status === 'completed' ? 'Résultat disponible' : status === 'running' ? 'Calcul en cours…' : 'Analyse non lancée'}</span></div>
    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto]"><label className="space-y-1"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Modèle d’analyse</span><select value={selectedModelId} onChange={(event) => { setSelectedModelId(event.target.value); clearAnalysis(); }} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-violet-500 dark:border-slate-700 dark:bg-slate-950">{models.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}</select><span className="block text-[10px] text-slate-500 dark:text-slate-400">{selectedModel.description}</span></label><div className="flex items-end"><button type="button" onClick={launchAnalysis} disabled={status === 'running' || records.length === 0} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"><Play className="h-4 w-4" />{status === 'completed' ? 'Relancer avec la sélection actuelle' : 'Lancer l’analyse'}</button></div></div>
    {message && <p className="mt-3 rounded-lg border border-violet-100 bg-violet-50/70 p-3 text-[11px] text-violet-900 dark:border-violet-900/50 dark:bg-violet-950/30 dark:text-violet-200">{message}</p>}

    {activeAnalysis && <div className="mt-4 space-y-3">{similarityResult && <SimilarityProjectionCard result={similarityResult} />}<div className="grid grid-cols-2 gap-2 md:grid-cols-4">{similarityResult && <><div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950/50"><p className="text-[10px] uppercase text-slate-500">Correspondances</p><p className="mt-1 text-lg font-bold">{similarityResult.matches.length}</p></div><div className="rounded-lg bg-rose-50 p-3 dark:bg-rose-950/30"><p className="text-[10px] uppercase text-rose-700 dark:text-rose-300">Cible historique</p><p className="mt-1 text-lg font-bold text-rose-800 dark:text-rose-200">{formatPercent(similarityResult.targetRate)}</p></div><div className="rounded-lg bg-indigo-50 p-3 dark:bg-indigo-950/30"><p className="text-[10px] uppercase text-indigo-700 dark:text-indigo-300">Délai médian</p><p className="mt-1 text-lg font-bold text-indigo-800 dark:text-indigo-200">{formatDuration(similarityResult.medianDelaySeconds)}</p></div><div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-950/30"><p className="text-[10px] uppercase text-amber-700 dark:text-amber-300">Sans cible</p><p className="mt-1 text-lg font-bold text-amber-800 dark:text-amber-200">{similarityResult.noTargetCount}</p></div></>}{precedingResult && <><div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950/50"><p className="text-[10px] uppercase text-slate-500">Gros résultats</p><p className="mt-1 text-lg font-bold">{precedingResult.targetCount}</p></div><div className="rounded-lg bg-fuchsia-50 p-3 dark:bg-fuchsia-950/30"><p className="text-[10px] uppercase text-fuchsia-700 dark:text-fuchsia-300">Fenêtres</p><p className="mt-1 text-lg font-bold text-fuchsia-800 dark:text-fuchsia-200">{precedingResult.windowsCount}</p></div><div className="rounded-lg bg-indigo-50 p-3 dark:bg-indigo-950/30"><p className="text-[10px] uppercase text-indigo-700 dark:text-indigo-300">Chaînes</p><p className="mt-1 text-lg font-bold text-indigo-800 dark:text-indigo-200">{precedingResult.patterns.length}</p></div><div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-950/30"><p className="text-[10px] uppercase text-amber-700 dark:text-amber-300">Fenêtre</p><p className="mt-1 text-lg font-bold text-amber-800 dark:text-amber-200">{precedingResult.config.lookback} tours</p></div></>}{scrapResult && <><div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950/50"><p className="text-[10px] uppercase text-slate-500">Lignes valides</p><p className="mt-1 text-lg font-bold">{scrapResult.validRecords.length}</p></div><div className="rounded-lg bg-rose-50 p-3 dark:bg-rose-950/30"><p className="text-[10px] uppercase text-rose-700 dark:text-rose-300">Au-dessus du seuil</p><p className="mt-1 text-lg font-bold text-rose-800 dark:text-rose-200">{scrapResult.above30Count}</p></div><div className="rounded-lg bg-indigo-50 p-3 dark:bg-indigo-950/30"><p className="text-[10px] uppercase text-indigo-700 dark:text-indigo-300">Taux</p><p className="mt-1 text-lg font-bold text-indigo-800 dark:text-indigo-200">{formatPercent(scrapResult.above30Rate)}</p></div><div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-950/30"><p className="text-[10px] uppercase text-amber-700 dark:text-amber-300">Top 30</p><p className="mt-1 text-lg font-bold text-amber-800 dark:text-amber-200">{scrapResult.top30.length}</p></div></>}</div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => void saveAnalysis()} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-emerald-500"><Save className="h-3.5 w-3.5" />Enregistrer</button><button type="button" onClick={exportJson} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"><Download className="h-3.5 w-3.5" />Exporter JSON</button><button type="button" onClick={exportPdf} className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 px-3 py-2 text-[11px] font-semibold text-violet-700 hover:bg-violet-50 dark:border-violet-900/70 dark:text-violet-300 dark:hover:bg-violet-950/40"><FileDown className="h-3.5 w-3.5" />Exporter PDF</button><button type="button" onClick={clearAnalysis} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"><RotateCcw className="h-3.5 w-3.5" />Effacer</button></div><details className="rounded-lg border border-slate-200 dark:border-slate-800"><summary className="cursor-pointer px-3 py-2 text-[11px] font-semibold text-slate-700 dark:text-slate-200">Voir la configuration et le résultat JSON</summary><pre className="max-h-96 overflow-auto border-t border-slate-200 bg-slate-950 p-3 text-[10px] text-emerald-200 dark:border-slate-800">{JSON.stringify({ configuration: activeAnalysis.configuration, result: activeAnalysis.result }, null, 2)}</pre></details></div>}

    <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800"><button type="button" onClick={() => setIsHistoryOpen((current) => !current)} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200"><Archive className="h-3.5 w-3.5" />{isHistoryOpen ? 'Masquer' : 'Afficher'} les analyses enregistrées ({savedRuns.length})</button>{isHistoryOpen && <div className="mt-3 space-y-2">{savedRuns.length === 0 ? <p className="rounded-lg bg-slate-50 p-3 text-[11px] text-slate-500 dark:bg-slate-950/50 dark:text-slate-400">Aucune analyse enregistrée.</p> : savedRuns.map((run) => <div key={run.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800"><div><p className="text-[11px] font-bold text-slate-900 dark:text-white">{run.modelName}</p><p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">{formatDateTime(run.createdAt)} · {run.sourceName ?? 'Source LIVE'}</p></div><div className="flex gap-1.5"><button type="button" onClick={() => loadRun(run)} className="rounded-md bg-indigo-600 px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-indigo-500">Charger</button><button type="button" onClick={() => void removeRun(run.id)} className="inline-flex items-center gap-1 rounded-md border border-rose-200 px-2.5 py-1.5 text-[10px] font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-900/70 dark:text-rose-300 dark:hover:bg-rose-950/30"><Trash2 className="h-3 w-3" />Supprimer</button></div></div>)}</div>}</div>
  </section>;
};
