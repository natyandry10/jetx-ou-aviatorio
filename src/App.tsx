/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { JsonRecord, FilterState, SortConfig, SortField, ActiveTab } from './types';
import { getInitialRecords } from './data/initialData';
import {
  filterAndSortRecords,
  extractUniqueYears,
  extractUniqueMonths,
  extractUniqueHours,
} from './utils/formatters';
import { Navbar } from './components/Navbar';
import { HomeView } from './components/HomeView';
import { SaisieView } from './components/SaisieView';
import { StatsView } from './components/StatsView';
import { ImportModal } from './components/ImportModal';
import { ExportModal } from './components/ExportModal';
import { EditRecordModal } from './components/EditRecordModal';
import { loadPersistedRecords, persistRecords } from './utils/storage';

const INITIAL_FILTER_STATE: FilterState = {
  year: 'all',
  month: 'all',
  date: '',
  hour: 'all',
  duplicateFilter: 'all',
  minCoefficient: '',
  maxCoefficient: '',
  searchQuery: '',
};

export default function App() {
  const [records, setRecords] = useState<JsonRecord[]>(() => loadPersistedRecords(getInitialRecords));
  const [activeTab, setActiveTab] = useState<ActiveTab>('accueil');
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTER_STATE);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'date_brute',
    direction: 'desc',
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    persistRecords(records);
  }, [records]);

  // Modal states
  const [isImportOpen, setIsImportOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isAddEditOpen, setIsAddEditOpen] = useState<boolean>(false);
  const [recordToEdit, setRecordToEdit] = useState<JsonRecord | null>(null);

  // Filter and Sort memo
  const { filtered: filteredRecords, duplicateCoeffCount, duplicateHashCount } = useMemo(() => {
    return filterAndSortRecords(records, filters, sortConfig);
  }, [records, filters, sortConfig]);

  // Available filter options
  const availableYears = useMemo(() => extractUniqueYears(records), [records]);
  const availableMonths = useMemo(() => extractUniqueMonths(records), [records]);
  const availableHours = useMemo(() => extractUniqueHours(records), [records]);

  // Selected records objects
  const selectedRecords = useMemo(() => {
    return records.filter((r) => selectedIds.has(r.id));
  }, [records, selectedIds]);

  // Sorting handler
  const handleSort = (field: SortField) => {
    setSortConfig((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Reset filters
  const handleResetFilters = () => {
    setFilters(INITIAL_FILTER_STATE);
  };

  // Selection handlers
  const handleToggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allVisibleSelected =
        filteredRecords.length > 0 && filteredRecords.every((record) => next.has(record.id));

      filteredRecords.forEach((record) => {
        if (allVisibleSelected) {
          next.delete(record.id);
        } else {
          next.add(record.id);
        }
      });

      return next;
    });
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    if (window.confirm(`Confirmez-vous la suppression de ${selectedIds.size} enregistrement(s) ?`)) {
      setRecords((prev) => prev.filter((r) => !selectedIds.has(r.id)));
      setSelectedIds(new Set());
    }
  };

  // Record CRUD Handlers
  const handleOpenAddModal = () => {
    setRecordToEdit(null);
    setIsAddEditOpen(true);
  };

  const handleEditRecord = (record: JsonRecord) => {
    setRecordToEdit(record);
    setIsAddEditOpen(true);
  };

  const handleSaveRecord = (savedRecord: JsonRecord) => {
    setRecords((prev) => {
      const exists = prev.some((r) => r.id === savedRecord.id);
      if (exists) {
        return prev.map((r) => (r.id === savedRecord.id ? savedRecord : r));
      }
      return [savedRecord, ...prev];
    });
  };

  const handleDeleteRecord = (id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // Import handler
  const handleImportRecords = (newRecords: JsonRecord[], mode: 'replace' | 'append') => {
    if (mode === 'replace') {
      setRecords(newRecords);
      setSelectedIds(new Set());
    } else {
      setRecords((prev) => [...newRecords, ...prev]);
    }
    // Switch directly to Saisie tab to view results
    setActiveTab('saisie');
  };

  // Restore sample dataset
  const handleRestoreInitialData = () => {
    if (window.confirm(`Voulez-vous restaurer les ${getInitialRecords().length} enregistrements d'origine ?`)) {
      setRecords(getInitialRecords());
      setSelectedIds(new Set());
      setFilters(INITIAL_FILTER_STATE);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans antialiased selection:bg-blue-500 selection:text-white">
      {/* Top Navbar & Ribbon Navigation */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        totalCount={records.length}
        filteredCount={filteredRecords.length}
        onOpenImport={() => setIsImportOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenAddModal={handleOpenAddModal}
      />

      {/* Dynamic Tab Views */}
      <main className="flex-1 pb-16">
        {activeTab === 'accueil' && (
          <HomeView
            records={records}
            onNavigateToSaisie={() => setActiveTab('saisie')}
            onOpenImport={() => setIsImportOpen(true)}
            onOpenExport={() => setIsExportOpen(true)}
          />
        )}

        {activeTab === 'saisie' && (
          <SaisieView
            records={records}
            filteredRecords={filteredRecords}
            filters={filters}
            onFilterChange={setFilters}
            onResetFilters={handleResetFilters}
            sortConfig={sortConfig}
            onSort={handleSort}
            availableYears={availableYears}
            availableMonths={availableMonths}
            availableHours={availableHours}
            duplicateCoeffCount={duplicateCoeffCount}
            duplicateHashCount={duplicateHashCount}
            selectedIds={selectedIds}
            onToggleSelectAll={handleToggleSelectAll}
            onToggleSelectOne={handleToggleSelectOne}
            onDeleteSelected={handleDeleteSelected}
            onOpenAddModal={handleOpenAddModal}
            onEditRecord={handleEditRecord}
            onDeleteRecord={handleDeleteRecord}
            onOpenImport={() => setIsImportOpen(true)}
            onOpenExport={() => setIsExportOpen(true)}
            onImportRecords={handleImportRecords}
            onRestoreInitialData={handleRestoreInitialData}
          />
        )}

        {activeTab === 'statistiques' && (
          <StatsView
            records={records}
            onNavigateToSaisie={() => setActiveTab('saisie')}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800/80 py-4 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
            <span className="font-medium">JSON DataViewer — Filtrage temporel, détection en double et export</span>
          </div>
          <span className="text-[11px] font-mono font-medium text-slate-400">
            {records.length} enregistrements chargés
          </span>
        </div>
      </footer>

      {/* Modals */}
      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImport={handleImportRecords}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        allRecords={records}
        filteredRecords={filteredRecords}
        selectedRecords={selectedRecords}
      />

      <EditRecordModal
        isOpen={isAddEditOpen}
        onClose={() => {
          setIsAddEditOpen(false);
          setRecordToEdit(null);
        }}
        onSave={handleSaveRecord}
        recordToEdit={recordToEdit}
      />
    </div>
  );
}

