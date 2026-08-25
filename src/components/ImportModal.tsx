import React, { useState, useRef } from 'react';
import { JsonRecord } from '../types';
import { createRecordId } from '../utils/storage';
import { Upload, FileCode, CheckCircle2, AlertTriangle, X, FileText } from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (newRecords: JsonRecord[], mode: 'replace' | 'append') => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [rawText, setRawText] = useState<string>('');
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [parsedPreview, setParsedPreview] = useState<JsonRecord[] | null>(null);
  const [activeTab, setActiveTab] = useState<'file' | 'text'>('file');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const processJsonString = (content: string) => {
    setErrorMsg(null);
    try {
      const parsed = JSON.parse(content);
      if (!Array.isArray(parsed)) {
        throw new Error("Le fichier JSON doit contenir une liste (tableau `[...]`) d'objets.");
      }

      if (parsed.length === 0) {
        throw new Error('Le fichier JSON est vide (0 élément).');
      }

      // Validate & map items
      const validRecords: JsonRecord[] = parsed.map((item, idx) => {
        if (typeof item !== 'object' || item === null || Array.isArray(item)) {
          throw new Error(`L'élément à l'index ${idx} n'est pas un objet valide.`);
        }

        const source = item as Record<string, unknown>;
        const dateBrute = source.date_brute ?? source.date ?? source.timestamp;
        const dateUtc = source.date_utc ?? source.utc ?? dateBrute;
        const coefficientValue = source.coefficient ?? source.multiplier ?? source.coeff;
        const hash = source.hash ?? source.sha256;
        const coefficient = Number(coefficientValue);

        if (typeof dateBrute !== 'string' || dateBrute.trim() === '') {
          throw new Error(`L'élément à l'index ${idx} doit contenir une date_brute valide.`);
        }
        if (!Number.isFinite(coefficient)) {
          throw new Error(`L'élément à l'index ${idx} doit contenir un coefficient numérique valide.`);
        }
        if (typeof hash !== 'string' || hash.trim() === '') {
          throw new Error(`L'élément à l'index ${idx} doit contenir un hash SHA-256 valide.`);
        }

        return {
          id: createRecordId('imported'),
          date_brute: dateBrute,
          date_utc: typeof dateUtc === 'string' && dateUtc.trim() !== '' ? dateUtc : dateBrute,
          coefficient,
          hash,
        };
      });

      setParsedPreview(validRecords);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur lors de la lecture du JSON.');
      setParsedPreview(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      processJsonString(content);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      processJsonString(content);
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    if (!parsedPreview || parsedPreview.length === 0) return;
    onImport(parsedPreview, importMode);
    onClose();
    // reset
    setParsedPreview(null);
    setRawText('');
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-slate-800/80 max-w-xl w-full p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Importer un fichier JSON
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Chargez ou collez un jeu de données au format JSON
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

        {/* Tab switch File vs Text */}
        <div className="flex bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl text-xs font-medium border border-slate-200/50 dark:border-slate-700/50">
          <button
            onClick={() => setActiveTab('file')}
            className={`flex-1 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'file'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Fichier .json (Glisser-déposer)
          </button>
          <button
            onClick={() => setActiveTab('text')}
            className={`flex-1 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'text'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Coller le texte JSON
          </button>
        </div>

        {/* File Drag Drop Zone */}
        {activeTab === 'file' ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              dragActive
                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40'
                : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 bg-slate-50/50 dark:bg-slate-850/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400">
                <FileCode className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Glissez votre fichier JSON ici ou cliquez pour parcourir
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Supporte les tableaux d'objets avec date_brute, date_utc, coefficient, hash
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              placeholder="Collez ici le JSON complet (ex: [{ &quot;date_brute&quot;: &quot;...&quot;, &quot;coefficient&quot;: 1.5, ... }])"
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                processJsonString(e.target.value);
              }}
              rows={6}
              className="w-full text-xs font-mono p-3 bg-white/80 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Error Feedback */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50/80 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Preview Confirmation */}
        {parsedPreview && (
          <div className="p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>{parsedPreview.length} enregistrements</strong> valides détectés et prêts à être importés !
              </span>
            </div>
          </div>
        )}

        {/* Import Mode Selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Mode d'importation :
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label
              className={`p-3 rounded-xl border cursor-pointer text-xs flex flex-col gap-1 transition-all ${
                importMode === 'replace'
                  ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                  className="text-blue-600"
                />
                <span className="font-bold">Remplacer tout</span>
              </div>
              <span className="text-[11px] opacity-80">
                Remplace les données actuelles par le nouveau fichier
              </span>
            </label>

            <label
              className={`p-3 rounded-xl border cursor-pointer text-xs flex flex-col gap-1 transition-all ${
                importMode === 'append'
                  ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === 'append'}
                  onChange={() => setImportMode('append')}
                  className="text-blue-600"
                />
                <span className="font-bold">Fusionner / Ajouter</span>
              </div>
              <span className="text-[11px] opacity-80">
                Ajoute les nouvelles lignes à la suite des existantes
              </span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            Annuler
          </button>
          <button
            disabled={!parsedPreview || parsedPreview.length === 0}
            onClick={handleConfirmImport}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:pointer-events-none rounded-lg transition-all shadow-sm shadow-blue-500/20 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Confirmer l'importation ({parsedPreview?.length || 0})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
