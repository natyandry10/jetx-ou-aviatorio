import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, BarChart4, FileDiff, Minus, RefreshCw } from 'lucide-react';
import { JsonRecord } from '../types';
import { calculateCoefficientStats } from '../utils/analytics';
import { DriveFile, listDriveJsonFiles, loadDriveJsonFile } from '../utils/drive';

interface DriveComparisonPanelProps {
  initialFileAId?: string;
  initialFileBId?: string;
  onSelectionChange: (fileAId: string, fileBId: string) => void;
}

interface LoadedDataset {
  file: DriveFile;
  records: JsonRecord[];
  warnings: string[];
  skippedCount: number;
}

function formatModifiedTime(value?: string): string {
  if (!value) return 'Date inconnue';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date inconnue';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function formatValue(value: number): string {
  return `${value.toFixed(2)}x`;
}

function formatPercentDelta(current: number, previous: number): string {
  if (previous === 0) return '—';
  const percentage = ((current - previous) / Math.abs(previous)) * 100;
  const sign = percentage > 0 ? '+' : '';
  return `${sign}${percentage.toFixed(1)}%`;
}

function DatasetCard({ dataset, accent }: { dataset: LoadedDataset; accent: 'indigo' | 'slate' }) {
  const stats = calculateCoefficientStats(dataset.records);
  const accentClasses = accent === 'indigo'
    ? 'border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/30'
    : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40';

  return (
    <div className={`rounded-xl border p-4 ${accentClasses}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-900 dark:text-white truncate" title={dataset.file.name}>{dataset.file.name}</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Modifié le {formatModifiedTime(dataset.file.modifiedTime)}</p>
        </div>
        <span className="shrink-0 text-[10px] font-bold text-slate-500 dark:text-slate-400">{stats.count} val.</span>
      </div>
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        <div><p className="text-[10px] text-slate-500 dark:text-slate-400">Moyenne</p><p className="text-sm font-bold text-slate-800 dark:text-slate-200">{stats.count ? formatValue(stats.mean) : '—'}</p></div>
        <div><p className="text-[10px] text-slate-500 dark:text-slate-400">Minimum</p><p className="text-sm font-bold text-slate-700 dark:text-slate-300">{stats.count ? formatValue(stats.minimum) : '—'}</p></div>
        <div><p className="text-[10px] text-slate-500 dark:text-slate-400">Médiane</p><p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{stats.count ? formatValue(stats.median) : '—'}</p></div>
        <div><p className="text-[10px] text-slate-500 dark:text-slate-400">Maximum</p><p className="text-sm font-bold text-rose-600 dark:text-rose-300">{stats.count ? formatValue(stats.maximum) : '—'}</p></div>
        <div><p className="text-[10px] text-slate-500 dark:text-slate-400">P25</p><p className="text-sm font-bold text-sky-700 dark:text-sky-300">{stats.count ? formatValue(stats.p25) : '—'}</p></div>
        <div><p className="text-[10px] text-slate-500 dark:text-slate-400">P75</p><p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{stats.count ? formatValue(stats.p75) : '—'}</p></div>
        <div><p className="text-[10px] text-slate-500 dark:text-slate-400">P90</p><p className="text-sm font-bold text-amber-600 dark:text-amber-300">{stats.count ? formatValue(stats.p90) : '—'}</p></div>
        <div><p className="text-[10px] text-slate-500 dark:text-slate-400">Valides</p><p className="text-sm font-bold text-slate-800 dark:text-slate-200">{stats.count}</p></div>
      </div>
      {(dataset.skippedCount > 0 || dataset.warnings.length > 0) && <p className="mt-3 text-[10px] text-amber-700 dark:text-amber-300">{dataset.skippedCount} ligne(s) invalide(s) ignorée(s) · {dataset.warnings.length} avertissement(s).</p>}
    </div>
  );
}

export const DriveComparisonPanel: React.FC<DriveComparisonPanelProps> = ({ initialFileAId, initialFileBId, onSelectionChange }) => {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [fileAId, setFileAId] = useState(initialFileAId ?? '');
  const [fileBId, setFileBId] = useState(initialFileBId ?? '');
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [datasets, setDatasets] = useState<[LoadedDataset, LoadedDataset] | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const sortedFiles = useMemo(() => [...files].sort((a, b) => (b.modifiedTime ?? '').localeCompare(a.modifiedTime ?? '')), [files]);

  const refreshFiles = async () => {
    setIsLoadingFiles(true);
    setStatus(null);
    try {
      const availableFiles = await listDriveJsonFiles();
      setFiles(availableFiles);
      const nextFileAId = availableFiles.some((file) => file.id === fileAId) ? fileAId : availableFiles[0]?.id ?? '';
      const nextFileBId = availableFiles.some((file) => file.id === fileBId && file.id !== nextFileAId)
        ? fileBId
        : availableFiles.find((file) => file.id !== nextFileAId)?.id ?? '';
      setFileAId(nextFileAId);
      setFileBId(nextFileBId);
      if (availableFiles.length < 2) setStatus('Il faut au moins deux fichiers JSON dans le dossier Drive pour les comparer.');
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : 'Impossible de lire les fichiers JSON du dossier Drive.');
    } finally {
      setIsLoadingFiles(false);
    }
  };

  useEffect(() => {
    void refreshFiles();
    // Le chargement initial est volontairement effectué une seule fois.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    onSelectionChange(fileAId, fileBId);
  }, [fileAId, fileBId, onSelectionChange]);

  const compareFiles = async () => {
    if (!fileAId || !fileBId) {
      setStatus('Sélectionne deux fichiers JSON avant de lancer la comparaison.');
      return;
    }
    if (fileAId === fileBId) {
      setStatus('Choisis deux fichiers différents pour effectuer une comparaison.');
      return;
    }

    const fileA = files.find((file) => file.id === fileAId);
    const fileB = files.find((file) => file.id === fileBId);
    if (!fileA || !fileB) {
      setStatus('Un des fichiers sélectionnés n’est plus disponible. Actualise la liste.');
      return;
    }

    setIsComparing(true);
    setStatus(null);
    try {
      const [resultA, resultB] = await Promise.all([loadDriveJsonFile(fileA.id), loadDriveJsonFile(fileB.id)]);
      setDatasets([
        { file: fileA, records: resultA.records, warnings: resultA.warnings, skippedCount: resultA.skippedCount },
        { file: fileB, records: resultB.records, warnings: resultB.warnings, skippedCount: resultB.skippedCount },
      ]);
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : 'Impossible de charger les deux fichiers Drive.');
    } finally {
      setIsComparing(false);
    }
  };

  const comparison = useMemo(() => {
    if (!datasets) return null;
    const current = calculateCoefficientStats(datasets[0].records);
    const previous = calculateCoefficientStats(datasets[1].records);
    return { current, previous };
  }, [datasets]);

  const renderDelta = (current: number, previous: number) => {
    const delta = current - previous;
    const Icon = delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : Minus;
    const tone = delta > 0 ? 'text-emerald-600 dark:text-emerald-400' : delta < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400';
    return <span className={`inline-flex items-center gap-1 font-semibold ${tone}`}><Icon className="w-3.5 h-3.5" />{formatPercentDelta(current, previous)}</span>;
  };

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 p-5 sm:p-6 shadow-xs space-y-5" aria-labelledby="drive-comparison-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400"><FileDiff className="w-5 h-5" /></div>
          <div>
            <h3 id="drive-comparison-title" className="text-sm font-bold text-slate-900 dark:text-white">Comparer deux fichiers Google Drive</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Compare les statistiques robustes de deux exports JSON indépendants.</p>
          </div>
        </div>
        <button type="button" onClick={() => void refreshFiles()} disabled={isLoadingFiles || isComparing} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFiles ? 'animate-spin' : ''}`} /> Actualiser
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="space-y-1.5">
          <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-700 dark:text-indigo-300">Fichier A</span>
          <select value={fileAId} onChange={(event) => { setFileAId(event.target.value); setDatasets(null); }} disabled={isLoadingFiles || isComparing || sortedFiles.length === 0} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-cyan-500">
            {sortedFiles.length === 0 ? <option value="">Aucun fichier JSON</option> : sortedFiles.map((file) => <option key={file.id} value={file.id}>{file.name} — {formatModifiedTime(file.modifiedTime)}</option>)}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">Fichier B</span>
          <select value={fileBId} onChange={(event) => { setFileBId(event.target.value); setDatasets(null); }} disabled={isLoadingFiles || isComparing || sortedFiles.length === 0} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-cyan-500">
            {sortedFiles.length === 0 ? <option value="">Aucun fichier JSON</option> : sortedFiles.map((file) => <option key={file.id} value={file.id}>{file.name} — {formatModifiedTime(file.modifiedTime)}</option>)}
          </select>
        </label>
      </div>

      <button type="button" onClick={() => void compareFiles()} disabled={isLoadingFiles || isComparing || !fileAId || !fileBId || fileAId === fileBId} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg disabled:opacity-50">
        <BarChart4 className="w-3.5 h-3.5" /> {isComparing ? 'Comparaison en cours…' : 'Comparer les fichiers'}
      </button>

      {status && <div className="flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-800 dark:text-amber-300" role="status"><AlertTriangle className="w-4 h-4 shrink-0" />{status}</div>}
      {fileAId && fileAId === fileBId && <div className="flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-800 dark:text-amber-300" role="status"><AlertTriangle className="w-4 h-4 shrink-0" />Choisis deux fichiers différents pour effectuer une comparaison.</div>}

      {datasets && comparison && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <DatasetCard dataset={datasets[0]} accent="indigo" />
            <DatasetCard dataset={datasets[1]} accent="slate" />
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full min-w-[760px] text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/50 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400"><tr><th className="px-3 py-2 text-left font-bold">Indicateur</th><th className="px-3 py-2 text-right font-bold">Fichier A</th><th className="px-3 py-2 text-right font-bold">Fichier B</th><th className="px-3 py-2 text-right font-bold">Écart absolu</th><th className="px-3 py-2 text-right font-bold">Variation</th></tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {[
                  { label: 'Moyenne', current: comparison.current.mean, previous: comparison.previous.mean },
                  { label: 'Minimum', current: comparison.current.minimum, previous: comparison.previous.minimum },
                  { label: 'P25', current: comparison.current.p25, previous: comparison.previous.p25 },
                  { label: 'Médiane', current: comparison.current.median, previous: comparison.previous.median },
                  { label: 'P75', current: comparison.current.p75, previous: comparison.previous.p75 },
                  { label: 'P90', current: comparison.current.p90, previous: comparison.previous.p90 },
                  { label: 'Maximum', current: comparison.current.maximum, previous: comparison.previous.maximum },
                ].map((row) => <tr key={row.label} className="text-slate-700 dark:text-slate-300"><td className="px-3 py-2.5 font-semibold">{row.label}</td><td className="px-3 py-2.5 text-right font-medium">{formatValue(row.current)}</td><td className="px-3 py-2.5 text-right font-medium">{formatValue(row.previous)}</td><td className="px-3 py-2.5 text-right font-medium">{formatValue(Math.abs(row.current - row.previous))}</td><td className="px-3 py-2.5 text-right">{renderDelta(row.current, row.previous)}</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
};
