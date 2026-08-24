import React from 'react';
import { JsonRecord, FilterState, SortConfig, SortField } from '../types';
import { FilterBar } from './FilterBar';
import { DataTable } from './DataTable';
import { Plus, Upload, Download, RotateCcw } from 'lucide-react';

interface SaisieViewProps {
  records: JsonRecord[];
  filteredRecords: JsonRecord[];
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onResetFilters: () => void;
  sortConfig: SortConfig;
  onSort: (field: SortField) => void;
  availableYears: string[];
  availableMonths: { value: string; label: string }[];
  availableHours: string[];
  duplicateCoeffCount: number;
  duplicateHashCount: number;
  selectedIds: Set<string>;
  onToggleSelectAll: () => void;
  onToggleSelectOne: (id: string) => void;
  onDeleteSelected: () => void;
  onOpenAddModal: () => void;
  onEditRecord: (record: JsonRecord) => void;
  onDeleteRecord: (id: string) => void;
  onOpenImport: () => void;
  onOpenExport: () => void;
  onRestoreInitialData: () => void;
}

export const SaisieView: React.FC<SaisieViewProps> = ({
  records,
  filteredRecords,
  filters,
  onFilterChange,
  onResetFilters,
  sortConfig,
  onSort,
  availableYears,
  availableMonths,
  availableHours,
  duplicateCoeffCount,
  duplicateHashCount,
  selectedIds,
  onToggleSelectAll,
  onToggleSelectOne,
  onDeleteSelected,
  onOpenAddModal,
  onEditRecord,
  onDeleteRecord,
  onOpenImport,
  onOpenExport,
  onRestoreInitialData,
}) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-in fade-in duration-200">
      {/* Saisie Ribbon Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Ruban Saisie & Données</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Gestion du tableau, filtres temporels, détection de doublons et saisie interactive
          </p>
        </div>

        {/* Buttons: Importer, Exporter, Nouvelle saisie, Restaurer */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-saisie-import"
            onClick={onOpenImport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors border border-slate-200 dark:border-slate-700"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Importer JSON</span>
          </button>

          <button
            id="btn-saisie-export"
            onClick={onOpenExport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs shadow-indigo-600/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exporter JSON</span>
          </button>

          <button
            id="btn-saisie-add"
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-white bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/70 dark:hover:bg-indigo-900/80 rounded-xl transition-colors border border-indigo-200 dark:border-indigo-800"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Ajouter une ligne</span>
          </button>

          <button
            onClick={onRestoreInitialData}
            title="Restaurer les 60 données d'exemple"
            className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exemples</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onFilterChange={onFilterChange}
        onResetFilters={onResetFilters}
        availableYears={availableYears}
        availableMonths={availableMonths}
        availableHours={availableHours}
        totalRecordsCount={records.length}
        filteredRecordsCount={filteredRecords.length}
        duplicateCoeffCount={duplicateCoeffCount}
        duplicateHashCount={duplicateHashCount}
      />

      {/* Data Table */}
      <DataTable
        records={filteredRecords}
        sortConfig={sortConfig}
        onSort={onSort}
        onEditRecord={onEditRecord}
        onDeleteRecord={onDeleteRecord}
        selectedIds={selectedIds}
        onToggleSelectAll={onToggleSelectAll}
        onToggleSelectOne={onToggleSelectOne}
        onDeleteSelected={onDeleteSelected}
      />
    </div>
  );
};
