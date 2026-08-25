import React, { useState } from 'react';
import { AlertTriangle, CloudDownload, RefreshCw } from 'lucide-react';
import { ImportMetadata, JsonRecord } from '../types';
import { DriveFile, listDriveJsonFiles, loadDriveJsonFile } from '../utils/drive';
import { useGoogleDriveAuth } from '../auth/GoogleDriveAuthContext';
import { GoogleDriveLoginPanel } from './GoogleDriveLoginPanel';

interface DriveImportPanelProps {
  onImport: (records: JsonRecord[], mode: 'replace' | 'append', metadata?: ImportMetadata) => void;
}

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
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const { accessToken } = useGoogleDriveAuth();

  const loadFile = async (fileId: string, availableFiles: DriveFile[]) => {
    const file = availableFiles.find((candidate) => candidate.id === fileId);
    const result = await loadDriveJsonFile(fileId, undefined, accessToken, file?.name);
    onImport(result.records, importMode, {
      source: 'drive',
      fileName: file?.name ?? result.fileName,
      modifiedTime: file?.modifiedTime,
      warnings: result.warnings,
      skippedCount: result.skippedCount,
      nonDataCount: result.nonDataCount,
    });

    const warningText = result.skippedCount > 0
      ? ` ${result.skippedCount} ligne(s) ignorée(s) pour cause de données invalides.`
      : '';
    const statusText = result.nonDataCount > 0
      ? ` ${result.nonDataCount} ligne(s) de statut non analytique ignorée(s).`
      : '';
    setStatus({
      tone: result.skippedCount > 0 ? 'warning' : 'success',
      message: `${result.records.length} enregistrements chargés depuis ${file?.name ?? result.fileName} (${formatModifiedTime(file?.modifiedTime)}).${warningText}${statusText}`,
    });
  };

  const refreshFiles = async () => {
    setIsLoading(true);
    setStatus(null);

    try {
      const availableFiles = await listDriveJsonFiles(accessToken);
      setFiles(availableFiles);
      setSelectedFileId((currentId) =>
        availableFiles.some((file) => file.id === currentId) ? currentId : availableFiles[0]?.id ?? ''
      );

      if (availableFiles.length === 0) {
        setStatus({ tone: 'warning', message: 'Aucun fichier JSON disponible dans le dossier Drive.' });
      } else {
        setStatus({
          tone: 'success',
          message: `${availableFiles.length} fichier(s) JSON disponible(s). Sélectionne un fichier puis choisis l’action à effectuer.`,
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

  const handleManualLoad = async () => {
    if (!selectedFileId) return;
    if (importMode === 'replace' && !window.confirm('Remplacer les données actuelles par le contenu de ce fichier Drive ? Les données présentes dans IndexedDB seront remplacées.')) {
      return;
    }
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
      <GoogleDriveLoginPanel onSignedIn={() => void refreshFiles()} />

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
              Actualise la liste des fichiers, puis choisis précisément le JSON à importer.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void refreshFiles()}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Actualiser la liste
        </button>
      </div>

      <div className="rounded-lg border border-blue-100 bg-blue-50/60 dark:border-blue-900 dark:bg-blue-950/30 p-3 text-xs text-blue-900 dark:text-blue-200">
        La liste Drive est chargée uniquement après une action volontaire. Tes données IndexedDB ne sont jamais remplacées au démarrage.
      </div>

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
            {files.length === 0 ? <option value="">Clique sur « Actualiser la liste »</option> : files.map((file) => <option key={file.id} value={file.id}>{file.name} — {formatModifiedTime(file.modifiedTime)}</option>)}
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
