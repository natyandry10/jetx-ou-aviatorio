import React, { useEffect, useState } from 'react';
import { AlertTriangle, CloudDownload, RefreshCw } from 'lucide-react';
import { JsonRecord } from '../types';
import { DriveFile, listDriveJsonFiles, loadDriveJsonFile } from '../utils/drive';

interface DriveImportPanelProps {
  onImport: (records: JsonRecord[], mode: 'replace' | 'append') => void;
}

type DriveMode = 'automatic' | 'manual';

type Status = {
  tone: 'success' | 'warning' | 'error';
  message: string;
};

function formatModifiedTime(value?: string): string {
  if (!value) return 'Date inconnue';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date inconnue';
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export const DriveImportPanel: React.FC<DriveImportPanelProps> = ({ onImport }) => {
  const [mode, setMode] = useState<DriveMode>('automatic');
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);

  const loadFile = async (fileId: string, availableFiles: DriveFile[]) => {
    const file = availableFiles.find((candidate) => candidate.id === fileId);
    const result = await loadDriveJsonFile(fileId);
    onImport(result.records, importMode);

    const warningText = result.warnings.length > 0 ? ` ${result.warnings.join(' ')}` : '';
    setStatus({
      tone: result.warnings.length > 0 ? 'warning' : 'success',
      message: `${result.records.length} enregistrements chargés depuis ${file?.name ?? result.fileName}.${warningText}`,
    });
  };

  const refreshFiles = async (automatic: boolean) => {
    setIsLoading(true);
    setStatus(null);

    try {
      const availableFiles = await listDriveJsonFiles();
      setFiles(availableFiles);

      if (availableFiles.length === 0) {
        setStatus({ tone: 'warning', message: 'Aucun fichier JSON disponible dans le dossier Drive.' });
        return;
      }

      const fileId = automatic ? availableFiles[0].id : selectedFileId || availableFiles[0].id;
      setSelectedFileId(fileId);

      if (automatic) {
        await loadFile(fileId, availableFiles);
      } else {
        setStatus({
          tone: 'success',
          message: `${availableFiles.length} fichier(s) JSON disponible(s). Sélectionne celui à afficher.`,
        });
      }
    } catch (error: unknown) {
      setStatus({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Impossible de lire le dossier Google Drive.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshFiles(mode === 'automatic');
    // Le changement de mode est le déclencheur volontaire de la synchronisation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const handleManualLoad = async () => {
    if (!selectedFileId) return;
    setIsLoading(true);
    setStatus(null);
    try {
      await loadFile(selectedFileId, files);
    } catch (error: unknown) {
      setStatus({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Impossible de charger le fichier Drive.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const statusClasses = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
    warning: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
    error: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300',
  } as const;

  return (
    <section className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs p-4 sm:p-5 space-y-4" aria-labelledby="drive-import-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
            <CloudDownload className="w-5 h-5" />
          </div>
          <div>
            <h3 id="drive-import-title" className="text-sm font-bold text-slate-900 dark:text-white">
              Lecture Google Drive
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Synchronise le dossier public ou choisis précisément le fichier JSON à afficher.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void refreshFiles(mode === 'automatic')}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className={`p-3 rounded-xl border cursor-pointer text-xs flex flex-col gap-1 transition-all ${mode === 'automatic' ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}>
          <span className="flex items-center gap-2 font-bold">
            <input type="radio" name="drive-mode" checked={mode === 'automatic'} onChange={() => setMode('automatic')} className="text-blue-600" />
            Automatique
          </span>
          <span className="text-[11px] opacity-80">Charge le fichier JSON le plus récemment modifié.</span>
        </label>
        <label className={`p-3 rounded-xl border cursor-pointer text-xs flex flex-col gap-1 transition-all ${mode === 'manual' ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}>
          <span className="flex items-center gap-2 font-bold">
            <input type="radio" name="drive-mode" checked={mode === 'manual'} onChange={() => setMode('manual')} className="text-blue-600" />
            Manuel
          </span>
          <span className="text-[11px] opacity-80">Liste les fichiers pour choisir lequel afficher.</span>
        </label>
      </div>

      {mode === 'manual' && (
        <div className="flex flex-wrap items-end gap-2">
          <label htmlFor="drive-file-select" className="flex-1 min-w-[220px] space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">Fichier JSON</span>
            <select
              id="drive-file-select"
              value={selectedFileId}
              onChange={(event) => setSelectedFileId(event.target.value)}
              disabled={isLoading || files.length === 0}
              className="w-full text-xs font-medium px-3 py-2 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {files.length === 0 ? <option value="">Aucun fichier JSON</option> : files.map((file) => <option key={file.id} value={file.id}>{file.name} — {formatModifiedTime(file.modifiedTime)}</option>)}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void handleManualLoad()}
            disabled={isLoading || !selectedFileId}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg cursor-pointer"
          >
            <CloudDownload className="w-3.5 h-3.5" />
            Charger ce fichier
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">Après lecture :</span>
        <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
          <input type="radio" name="drive-import-mode" checked={importMode === 'replace'} onChange={() => setImportMode('replace')} className="text-blue-600" />
          Remplacer les données
        </label>
        <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
          <input type="radio" name="drive-import-mode" checked={importMode === 'append'} onChange={() => setImportMode('append')} className="text-blue-600" />
          Ajouter les lignes
        </label>
      </div>

      {status && (
        <div className={`flex items-start gap-2 p-3 rounded-lg border text-xs ${statusClasses[status.tone]}`} role="status">
          {status.tone === 'error' || status.tone === 'warning' ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CloudDownload className="w-4 h-4 shrink-0" />}
          <span>{status.message}</span>
        </div>
      )}
    </section>
  );
};
