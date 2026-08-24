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
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span>Ruban Saisie & Données</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Gestion du tableau, filtres temporels, détection de doublons et saisie interactive
            </p>
          </div>
        </div>

        {/* Buttons: Importer, Exporter, Nouvelle saisie, Restaurer */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-saisie-import"
            onClick={onOpenImport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Importer JSON</span>
          </button>

          <button
            id="btn-saisie-export"
            onClick={onOpenExport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors shadow-sm shadow-blue-500/20 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exporter JSON</span>
          </button>

          <button
            id="btn-saisie-add"
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/70 hover:bg-blue-100 dark:hover:bg-blue-900/80 rounded-lg transition-colors border border-blue-200/80 dark:border-blue-800/80 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Ajouter une ligne</span>
          </button>

          <button
            onClick={onRestoreInitialData}
            title="Restaurer les 60 données d'exemple"
            className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 cursor-pointer"
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
