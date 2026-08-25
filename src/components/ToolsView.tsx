import React from 'react';
import { ArrowLeft, BarChart3, Table2, Wrench } from 'lucide-react';
import { JsonRecord } from '../types';
import { ToolsAnalysisPanel } from './ToolsAnalysisPanel';

interface ToolsViewProps {
  records: JsonRecord[];
  filteredRecords: JsonRecord[];
  onNavigateToSaisie: () => void;
  onNavigateToAnalyse: () => void;
}

export const ToolsView: React.FC<ToolsViewProps> = ({ records, filteredRecords, onNavigateToSaisie, onNavigateToAnalyse }) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in duration-300">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300"><Wrench className="h-4 w-4" />Rubrique Tools</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">Analyse des chaînes et des intervalles</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">Sélectionne une période, regroupe les résultats par intervalle de multiplicateur et consulte les fréquences historiques des chaînes répétées.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onNavigateToAnalyse} className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 dark:border-indigo-900/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"><BarChart3 className="h-4 w-4" />Ouvrir Analyse</button>
          <button type="button" onClick={onNavigateToSaisie} className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-3 py-2 text-xs font-semibold text-white hover:bg-cyan-500"><Table2 className="h-4 w-4" />Ouvrir Saisie</button>
        </div>
      </header>

      <div className="flex items-start gap-2 rounded-xl border border-cyan-200 dark:border-cyan-900/70 bg-cyan-50/70 dark:bg-cyan-950/20 p-4 text-xs text-cyan-950 dark:text-cyan-100">
        <ArrowLeft className="mt-0.5 h-4 w-4 shrink-0 rotate-180 text-cyan-600 dark:text-cyan-400" />
        <p><strong>Lecture :</strong> Tools travaille sur les lignes visibles après les filtres de Saisie, puis applique ses propres filtres temporels. Les pourcentages indiquent uniquement la fréquence observée dans l’échantillon historique sélectionné.</p>
      </div>

      <ToolsAnalysisPanel records={filteredRecords} totalRecords={records.length} />
    </div>
  );
};
