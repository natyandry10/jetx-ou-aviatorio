import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Eye, FileJson, Pause, Play, Radio, RefreshCw, Table2, Wrench } from 'lucide-react';
import { useGoogleDriveAuth } from '../auth/GoogleDriveAuthContext';
import { GoogleDriveLoginPanel } from './GoogleDriveLoginPanel';
import { LiveAnalysisWorkbench } from './LiveAnalysisWorkbench';
import { RecordedWindowPanel } from './RecordedWindowPanel';
import { DriveFile, listDriveJsonFiles, loadDriveJsonFile } from '../utils/drive';
import { JsonRecord } from '../types';

interface LiveRecord extends JsonRecord {
  timestamp: string;
}

interface LiveViewProps {
  onNavigateToSaisie: () => void;
  onNavigateToTools: () => void;
}

function toLiveRecord(record: JsonRecord): LiveRecord | null {
  const timestamp = new Date(record.date_utc || record.date_brute);
  if (Number.isNaN(timestamp.getTime()) || !Number.isFinite(record.coefficient)) return null;
  return { ...record, timestamp: timestamp.toISOString() };
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date inconnue';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'medium' }).format(date);
}

function formatClock(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(date);
}

function coefficientClass(value: number): string {
  if (value > 30) return 'border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200';
  if (value >= 10) return 'border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200';
  if (value > 4) return 'border-violet-300 bg-violet-100 text-violet-800 dark:border-violet-800 dark:bg-violet-950/60 dark:text-violet-200';
  return 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200';
}

export const LiveView: React.FC<LiveViewProps> = ({ onNavigateToSaisie, onNavigateToTools }) => {
  const { accessToken, isSignedIn } = useGoogleDriveAuth();
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState('');
  const [liveRecords, setLiveRecords] = useState<LiveRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<LiveRecord | null>(null);
  const [isSelectingAnalysis, setIsSelectingAnalysis] = useState(false);
  const [analysisSelectionKeys, setAnalysisSelectionKeys] = useState<string[]>([]);
  const [isRefreshingFiles, setIsRefreshingFiles] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [lastLoadedCount, setLastLoadedCount] = useState(0);
  const [newRecordsCount, setNewRecordsCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef(false);

  const selectedFile = useMemo(() => files.find((file) => file.id === selectedFileId) ?? null, [files, selectedFileId]);
  const recordKey = (record: LiveRecord) => record.hash || record.id;
  const selectedAnalysisRecords = useMemo(() => liveRecords.filter((record) => analysisSelectionKeys.includes(recordKey(record))).sort((left, right) => left.timestamp.localeCompare(right.timestamp)), [analysisSelectionKeys, liveRecords]);
  const selectedRecordIndex = selectedRecord ? liveRecords.findIndex((record) => record.hash === selectedRecord.hash) : -1;
  const olderRecord = selectedRecordIndex >= 0 ? liveRecords[selectedRecordIndex + 1] : undefined;
  const newerRecord = selectedRecordIndex > 0 ? liveRecords[selectedRecordIndex - 1] : undefined;
  const intervalFromOlder = selectedRecord && olderRecord ? Math.max(0, (new Date(selectedRecord.timestamp).getTime() - new Date(olderRecord.timestamp).getTime()) / 1000) : null;

  const refreshFiles = async () => {
    if (!accessToken) {
      setError('Connecte-toi à Google Drive avant de rechercher les fichiers.');
      return;
    }
    setIsRefreshingFiles(true);
    setError(null);
    try {
      const nextFiles = await listDriveJsonFiles(accessToken);
      setFiles(nextFiles);
      setSelectedFileId((current) => nextFiles.some((file) => file.id === current) ? current : nextFiles[0]?.id ?? '');
    } catch (refreshError: unknown) {
      setError(refreshError instanceof Error ? refreshError.message : 'Impossible de lire la liste Drive.');
    } finally {
      setIsRefreshingFiles(false);
    }
  };

  const pollSelectedFile = async () => {
    if (!accessToken || !selectedFileId || pollingRef.current) return;
    pollingRef.current = true;
    try {
      const loaded = await loadDriveJsonFile(selectedFileId, undefined, accessToken, selectedFile?.name);
      const nextRecords = loaded.records.map(toLiveRecord).filter((record): record is LiveRecord => record !== null);
      setLiveRecords((current) => {
        const byHash = new Map<string, LiveRecord>(current.map((record) => [record.hash, record]));
        let added = 0;
        nextRecords.forEach((record) => {
          if (!byHash.has(record.hash)) added += 1;
          byHash.set(record.hash, record);
        });
        setNewRecordsCount(added);
        return [...byHash.values()].sort((left, right) => right.timestamp.localeCompare(left.timestamp));
      });
      setLastLoadedCount(nextRecords.length);
      setLastUpdatedAt(new Date().toISOString());
      setError(loaded.warnings.length > 0 ? loaded.warnings.join(' ') : null);
    } catch (pollError: unknown) {
      setError(pollError instanceof Error ? pollError.message : 'La lecture LIVE du fichier a échoué.');
    } finally {
      pollingRef.current = false;
    }
  };

  useEffect(() => {
    setIsLive(false);
    setLiveRecords([]);
    setSelectedRecord(null);
    setIsSelectingAnalysis(false);
    setAnalysisSelectionKeys([]);
    setLastUpdatedAt(null);
    setLastLoadedCount(0);
    setNewRecordsCount(0);
  }, [selectedFileId]);

  useEffect(() => {
    if (!isLive || !accessToken || !selectedFileId) return undefined;
    void pollSelectedFile();
    const intervalId = window.setInterval(() => void pollSelectedFile(), 1000);
    return () => window.clearInterval(intervalId);
  }, [accessToken, isLive, selectedFileId, selectedFile?.name]);

  useEffect(() => {
    if (!isSignedIn) {
      setIsLive(false);
      setFiles([]);
      setSelectedFileId('');
      setIsSelectingAnalysis(false);
      setAnalysisSelectionKeys([]);
      return;
    }
    if (accessToken) void refreshFiles();
  }, [accessToken, isSignedIn]);

  const beginAnalysisSelection = () => {
    if (liveRecords.length === 0) {
      setError('Aucun résultat LIVE à sélectionner. Démarre LIVE et attends une lecture du fichier.');
      return;
    }
    setSelectedRecord(null);
    setAnalysisSelectionKeys([]);
    setIsSelectingAnalysis(true);
    setError(null);
  };

  const toggleAnalysisSelection = (record: LiveRecord) => {
    const key = recordKey(record);
    setAnalysisSelectionKeys((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  };

  const cancelAnalysisSelection = () => {
    setIsSelectingAnalysis(false);
    setAnalysisSelectionKeys([]);
  };

  const finishAnalysisSelection = () => {
    if (selectedAnalysisRecords.length < 2) {
      setError('Sélectionne au moins 2 résultats avant de finaliser l’analyse.');
      return;
    }
    setIsSelectingAnalysis(false);
    setAnalysisSelectionKeys([]);
    setError(null);
  };

  const toggleLive = () => {
    if (!selectedFileId) {
      setError('Choisis un fichier JSON Drive avant de démarrer LIVE.');
      return;
    }
    setError(null);
    setIsLive((current) => !current);
  };

  return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in duration-300">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300"><Radio className="h-4 w-4" />Rubrique LIVE</p><h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">Flux JSON Drive en temps réel</h2><p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">Surveille un fichier JSON Drive ouvert, détecte les nouvelles lignes par hash et affiche les résultats les plus récents en premier, cinq par ligne.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={onNavigateToTools} className="inline-flex items-center gap-2 rounded-xl border border-cyan-200 bg-white px-3 py-2 text-xs font-semibold text-cyan-700 hover:bg-cyan-50 dark:border-cyan-900/70 dark:bg-slate-900 dark:text-cyan-300 dark:hover:bg-cyan-950/40"><Wrench className="h-4 w-4" />Tools</button><button type="button" onClick={onNavigateToSaisie} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500"><Table2 className="h-4 w-4" />Saisie</button></div></header>

    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-950 dark:border-emerald-900/70 dark:bg-emerald-950/20 dark:text-emerald-100"><strong>Fonctionnement :</strong> LIVE fonctionne lorsque cette page reste ouverte et que Google Drive est connecté. Il interroge le fichier sélectionné au maximum une fois par seconde, ne modifie pas IndexedDB et n’ajoute jamais automatiquement les lignes au tableau principal.</div>

    <GoogleDriveLoginPanel onSignedIn={() => undefined} />

    {isSignedIn && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4" aria-labelledby="live-source-title"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 id="live-source-title" className="text-sm font-bold text-slate-900 dark:text-white">Source LIVE</h3><p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Actualise la liste, sélectionne un fichier, puis démarre l’écoute explicite.</p></div><button type="button" onClick={() => void refreshFiles()} disabled={isRefreshingFiles} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"><RefreshCw className={`h-3.5 w-3.5 ${isRefreshingFiles ? 'animate-spin' : ''}`} />Actualiser la liste</button></div><div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto]"><label className="space-y-1"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Fichier JSON surveillé</span><select value={selectedFileId} onChange={(event) => setSelectedFileId(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950"><option value="">Choisir un fichier…</option>{files.map((file) => <option key={file.id} value={file.id}>{file.name}{file.modifiedTime ? ` — ${formatDateTime(file.modifiedTime)}` : ''}</option>)}</select></label><div className="flex items-end"><button type="button" onClick={toggleLive} disabled={!selectedFileId} className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 ${isLive ? 'bg-slate-700 hover:bg-slate-600' : 'bg-emerald-600 hover:bg-emerald-500'}`}>{isLive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{isLive ? 'Arrêter LIVE' : 'Démarrer LIVE'}</button></div></div>{files.length === 0 && <p className="text-[11px] text-slate-500 dark:text-slate-400">Aucun fichier JSON listé. Clique sur « Actualiser la liste » pour rechercher les fichiers du dossier Drive.</p>}</section>}

    {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-200">{error}</p>}

    <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">État</p><p className={`mt-1 text-lg font-bold ${isLive ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-800 dark:text-slate-100'}`}>{isLive ? 'ACTIF' : 'EN PAUSE'}</p><p className="text-[10px] text-slate-500 dark:text-slate-400">mise à jour : 1 s</p></div><div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 dark:border-indigo-900/70 dark:bg-indigo-950/20"><p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">Résultats visibles</p><p className="mt-1 text-lg font-bold text-indigo-900 dark:text-indigo-100">{liveRecords.length}</p><p className="text-[10px] text-indigo-700 dark:text-indigo-300">dédupliqués par hash</p></div><div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4 dark:border-rose-900/70 dark:bg-rose-950/20"><p className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">Dernière lecture</p><p className="mt-1 text-lg font-bold text-rose-900 dark:text-rose-100">{lastUpdatedAt ? formatClock(lastUpdatedAt) : '—'}</p><p className="text-[10px] text-rose-700 dark:text-rose-300">{lastLoadedCount} ligne(s) dans le fichier</p></div><div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/70 dark:bg-amber-950/20"><p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">Nouvelles lignes</p><p className="mt-1 text-lg font-bold text-amber-900 dark:text-amber-100">{newRecordsCount}</p><p className="text-[10px] text-amber-700 dark:text-amber-300">à la dernière lecture</p></div></div>

    <RecordedWindowPanel records={liveRecords} sourceName={selectedFile?.name} />

    <LiveAnalysisWorkbench records={liveRecords} selectedRecords={selectedAnalysisRecords} onBeginSelection={beginAnalysisSelection} onAnalysisFinished={finishAnalysisSelection} sourceName={selectedFile?.name} />

    <section className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-xs dark:border-emerald-900/70 dark:bg-slate-900" aria-labelledby="live-stream-title"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 id="live-stream-title" className="text-sm font-bold text-slate-900 dark:text-white">Résultats récents — 5 par ligne</h3><p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{isSelectingAnalysis ? 'Clique sur les résultats à analyser, puis finalise la sélection.' : 'Le premier résultat est le plus récent. Clique sur une pastille pour ouvrir son détail ou lance une analyse pour sélectionner plusieurs résultats.'}</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">{selectedFile?.name ?? 'Aucun fichier sélectionné'}</span></div>{liveRecords.length > 0 ? <div className="mt-4 overflow-x-auto"><div className="grid min-w-[720px] grid-cols-5 gap-2">{liveRecords.map((record, index) => <button type="button" key={record.hash || record.id} onClick={() => isSelectingAnalysis ? toggleAnalysisSelection(record) : setSelectedRecord(record)} aria-pressed={isSelectingAnalysis && analysisSelectionKeys.includes(recordKey(record))} className={`group rounded-xl border p-3 text-left transition-colors hover:border-emerald-400 dark:hover:border-emerald-600 ${coefficientClass(record.coefficient)} ${isSelectingAnalysis && analysisSelectionKeys.includes(recordKey(record)) ? 'ring-4 ring-violet-400 ring-offset-2 dark:ring-violet-500 dark:ring-offset-slate-900' : ''}`} title={`${formatDateTime(record.timestamp)} · position ${index + 1}`}><div className="flex items-center justify-between gap-2"><span className="text-[9px] font-bold opacity-60">#{index + 1}</span><span className="text-[9px] font-mono opacity-70">{formatClock(record.timestamp)}</span></div><p className="mt-2 text-base font-extrabold">{record.coefficient.toFixed(2)}x</p><p className="mt-1 truncate text-[9px] opacity-70">{record.hash}</p></button>)}</div></div> : <div className="mt-4 flex min-h-36 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-400"><FileJson className="mr-2 h-4 w-4" />Démarre LIVE après avoir choisi un fichier JSON pour afficher les résultats.</div>}</section>

    {isSelectingAnalysis && <div className="rounded-xl border border-violet-200 bg-violet-50/80 p-4 dark:border-violet-900/70 dark:bg-violet-950/30"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300">Étape 1 — Sélection manuelle</p><p className="mt-1 text-xs font-semibold text-violet-950 dark:text-violet-100">{selectedAnalysisRecords.length} résultat(s) sélectionné(s)</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setAnalysisSelectionKeys(liveRecords.slice(0, 5).map(recordKey))} className="rounded-lg border border-violet-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-violet-700 dark:border-violet-800 dark:bg-slate-900 dark:text-violet-200">5 derniers</button><button type="button" onClick={() => setAnalysisSelectionKeys(liveRecords.slice(0, 10).map(recordKey))} className="rounded-lg border border-violet-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-violet-700 dark:border-violet-800 dark:bg-slate-900 dark:text-violet-200">10 derniers</button><button type="button" onClick={() => setAnalysisSelectionKeys(liveRecords.slice(0, 20).map(recordKey))} className="rounded-lg border border-violet-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-violet-700 dark:border-violet-800 dark:bg-slate-900 dark:text-violet-200">20 derniers</button><button type="button" onClick={() => setAnalysisSelectionKeys([])} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">Tout effacer</button><button type="button" onClick={cancelAnalysisSelection} className="rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-rose-700 dark:border-rose-900/70 dark:bg-slate-900 dark:text-rose-300">Annuler</button></div></div>{selectedAnalysisRecords.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{selectedAnalysisRecords.map((record) => <span key={recordKey(record)} className="rounded-lg border border-violet-200 bg-white px-2.5 py-1.5 text-[10px] font-mono font-bold text-violet-800 dark:border-violet-800 dark:bg-slate-900 dark:text-violet-200">{record.coefficient.toFixed(2)}x · {formatClock(record.timestamp)}</span>)}</div>}<p className="mt-3 text-[10px] text-violet-800 dark:text-violet-200">Les résultats seront triés par date et heure avant l’analyse. Minimum recommandé : 2 résultats.</p></div>}

    {selectedRecord && <section className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5 shadow-xs dark:border-indigo-900/70 dark:bg-indigo-950/20" aria-labelledby="live-detail-title"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">Détail du résultat sélectionné</p><h3 id="live-detail-title" className="mt-1 text-xl font-bold text-indigo-950 dark:text-indigo-100">{selectedRecord.coefficient.toFixed(2)}x</h3><p className="mt-1 text-xs text-indigo-800 dark:text-indigo-200">Date et heure : {formatDateTime(selectedRecord.timestamp)} · position LIVE #{selectedRecordIndex + 1}</p></div><button type="button" onClick={() => setSelectedRecord(null)} className="rounded-lg p-1 text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-900/50" aria-label="Fermer le détail"><Eye className="h-4 w-4" /></button></div>      <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-lg bg-white/70 p-3 dark:bg-slate-900/50"><p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Hash</p><p className="mt-1 break-all font-mono text-[10px] text-slate-700 dark:text-slate-300">{selectedRecord.hash}</p></div><div className="rounded-lg bg-white/70 p-3 dark:bg-slate-900/50"><p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Intervalle précédent</p><p className="mt-1 font-mono font-bold text-slate-700 dark:text-slate-300">{intervalFromOlder === null ? '—' : `${Math.floor(intervalFromOlder / 60).toString().padStart(2, '0')}:${Math.floor(intervalFromOlder % 60).toString().padStart(2, '0')}`}</p></div><div className="rounded-lg bg-white/70 p-3 dark:bg-slate-900/50"><p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Résultat plus récent</p><p className="mt-1 text-slate-700 dark:text-slate-300">{newerRecord ? `${newerRecord.coefficient.toFixed(2)}x · ${formatClock(newerRecord.timestamp)}` : 'Aucun'}</p></div><div className="rounded-lg bg-white/70 p-3 dark:bg-slate-900/50"><p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Source</p><p className="mt-1 text-slate-700 dark:text-slate-300">{selectedFile?.name ?? 'Fichier Drive'}</p></div></div></section>}
  </div>;
};
