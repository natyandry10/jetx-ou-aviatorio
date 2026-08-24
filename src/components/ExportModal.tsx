import React, { useState } from 'react';
import { JsonRecord } from '../types';
import { downloadJsonFile, downloadCsvFile } from '../utils/formatters';
import { Download, FileJson, FileSpreadsheet, Copy, Check, X, Layers } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  allRecords: JsonRecord[];
  filteredRecords: JsonRecord[];
  selectedRecords: JsonRecord[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  allRecords,
  filteredRecords,
  selectedRecords,
}) => {
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [exportScope, setExportScope] = useState<'all' | 'filtered' | 'selected'>('filtered');
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const getTargetRecords = (): JsonRecord[] => {
    if (exportScope === 'selected' && selectedRecords.length > 0) return selectedRecords;
    if (exportScope === 'filtered') return filteredRecords;
    return allRecords;
  };

  const targetRecords = getTargetRecords();

  const handleDownload = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    if (exportFormat === 'json') {
      downloadJsonFile(targetRecords, `donnees_export_${timestamp}.json`);
    } else {
      downloadCsvFile(targetRecords, `donnees_export_${timestamp}.csv`);
    }
    onClose();
  };

  const handleCopyJson = () => {
    const clean = targetRecords.map(({ date_brute, date_utc, coefficient, hash }) => ({
      date_brute,
      date_utc,
      coefficient,
      hash
    }));
    navigator.clipboard.writeText(JSON.stringify(clean, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-slate-800/80 max-w-lg w-full p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Exporter les Données
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Téléchargez ou copiez vos enregistrements
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Scope selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Périmètre d'exportation :
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setExportScope('filtered')}
              className={`p-3 rounded-xl border text-left transition-all text-xs flex flex-col gap-0.5 cursor-pointer ${
                exportScope === 'filtered'
                  ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-bold'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              <span>Filtres actuels</span>
              <span className="text-[11px] opacity-75">{filteredRecords.length} lignes</span>
            </button>

            <button
              type="button"
              onClick={() => setExportScope('all')}
              className={`p-3 rounded-xl border text-left transition-all text-xs flex flex-col gap-0.5 cursor-pointer ${
                exportScope === 'all'
                  ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-bold'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              <span>Tous</span>
              <span className="text-[11px] opacity-75">{allRecords.length} lignes</span>
            </button>

            <button
              type="button"
              disabled={selectedRecords.length === 0}
              onClick={() => setExportScope('selected')}
              className={`p-3 rounded-xl border text-left transition-all text-xs flex flex-col gap-0.5 cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${
                exportScope === 'selected'
                  ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-bold'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              <span>Sélectionnés</span>
              <span className="text-[11px] opacity-75">{selectedRecords.length} lignes</span>
            </button>
          </div>
        </div>

        {/* 2. Format Selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Format de fichier :
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setExportFormat('json')}
              className={`p-3.5 rounded-xl border text-left transition-all text-xs flex items-center gap-3 cursor-pointer ${
                exportFormat === 'json'
                  ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-bold'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400">
                <FileJson className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Format JSON (.json)</p>
                <p className="text-[11px] text-slate-500">Structure objet standard</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setExportFormat('csv')}
              className={`p-3.5 rounded-xl border text-left transition-all text-xs flex items-center gap-3 cursor-pointer ${
                exportFormat === 'csv'
                  ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Format CSV (.csv)</p>
                <p className="text-[11px] text-slate-500">Pour Excel / Tableurs</p>
              </div>
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleCopyJson}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copié dans le presse-papier !' : 'Copier en JSON'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="button"
              id="btn-confirm-download"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-all shadow-sm shadow-blue-500/20 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Télécharger ({targetRecords.length})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
