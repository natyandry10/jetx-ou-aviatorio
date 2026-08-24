import React, { useState, useEffect } from 'react';
import { JsonRecord } from '../types';
import { PlusCircle, Edit3, X, Sparkles, Clock, Hash, Calendar } from 'lucide-react';

interface EditRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: JsonRecord) => void;
  recordToEdit: JsonRecord | null;
}

function generateRandomHex(length = 64): string {
  const chars = '0123456789ABCDEF';
  let res = '';
  for (let i = 0; i < length; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

export const EditRecordModal: React.FC<EditRecordModalProps> = ({
  isOpen,
  onClose,
  onSave,
  recordToEdit,
}) => {
  const [dateBrute, setDateBrute] = useState<string>('');
  const [dateUtc, setDateUtc] = useState<string>('');
  const [coefficient, setCoefficient] = useState<string>('1.00');
  const [hash, setHash] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const generateRandomHash = () => {
    const newHash = generateRandomHex(64);
    setHash(newHash);
    return newHash;
  };

  useEffect(() => {
    if (!isOpen) return;

    if (recordToEdit) {
      setDateBrute(recordToEdit.date_brute);
      setDateUtc(recordToEdit.date_utc);
      setCoefficient(String(recordToEdit.coefficient));
      setHash(recordToEdit.hash);
    } else {
      // Default new record values with current time
      const now = new Date();
      const isoLocal = now.toISOString().replace('Z', '+02:00');
      const isoUtc = now.toISOString();
      setDateBrute(isoLocal);
      setDateUtc(isoUtc);
      setCoefficient('1.50');
      setHash(generateRandomHex(64));
    }
    setError(null);
  }, [recordToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSetCurrentDate = () => {
    const now = new Date();
    setDateBrute(now.toISOString().replace('Z', '+02:00'));
    setDateUtc(now.toISOString());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const coeffNum = parseFloat(coefficient);
    if (isNaN(coeffNum) || coeffNum <= 0) {
      setError('Le coefficient doit être un nombre positif supérieur à 0.');
      return;
    }

    if (!dateBrute.trim()) {
      setError('La date brute est obligatoire.');
      return;
    }

    const finalRecord: JsonRecord = {
      id: recordToEdit ? recordToEdit.id : `rec-user-${Date.now()}`,
      date_brute: dateBrute.trim(),
      date_utc: dateUtc.trim() || new Date().toISOString(),
      coefficient: coeffNum,
      hash: hash.trim() || 'N/A',
    };

    onSave(finalRecord);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-slate-800/80 max-w-lg w-full p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              {recordToEdit ? <Edit3 className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {recordToEdit ? "Modifier l'enregistrement" : 'Nouvelle saisie (Ajout)'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {recordToEdit ? 'Mettez à jour les valeurs du JSON' : 'Ajoutez une nouvelle ligne au jeu de données'}
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

        {/* Error notification */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-50/80 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Date Brute */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Date Brute (Locale ISO)</span>
              </label>
              <button
                type="button"
                onClick={handleSetCurrentDate}
                className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
              >
                <Clock className="w-3 h-3" />
                <span>Heure actuelle</span>
              </button>
            </div>
            <input
              type="text"
              value={dateBrute}
              onChange={(e) => setDateBrute(e.target.value)}
              placeholder="ex: 2026-08-24T19:43:20.7485239+02:00"
              className="w-full px-3 py-2 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          {/* Date UTC */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Date UTC</span>
            </label>
            <input
              type="text"
              value={dateUtc}
              onChange={(e) => setDateUtc(e.target.value)}
              placeholder="ex: 2026-08-24T17:43:20.748Z"
              className="w-full px-3 py-2 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          {/* Coefficient */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1">
              <Hash className="w-3.5 h-3.5 text-slate-400" />
              <span>Coefficient / Multiplicateur</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={coefficient}
              onChange={(e) => setCoefficient(e.target.value)}
              placeholder="ex: 2.22"
              className="w-full px-3 py-2 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Hash */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-slate-400" />
                <span>Hash SHA-256</span>
              </label>
              <button
                type="button"
                onClick={generateRandomHash}
                className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>Générer un hash</span>
              </button>
            </div>
            <textarea
              rows={2}
              value={hash}
              onChange={(e) => setHash(e.target.value)}
              placeholder="SHA-256 string (64 hex characters)"
              className="w-full px-3 py-2 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 font-mono text-[11px]"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-all shadow-sm shadow-blue-500/20 cursor-pointer"
            >
              {recordToEdit ? 'Enregistrer les modifications' : 'Ajouter au tableau'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
