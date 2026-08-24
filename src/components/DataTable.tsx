import React, { useState } from 'react';
import { JsonRecord, SortConfig, SortField } from '../types';
import { formatDateFrench, getCoefficientBadgeStyle } from '../utils/formatters';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Copy,
  Check,
  Edit3,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  FileCode,
} from 'lucide-react';

interface DataTableProps {
  records: JsonRecord[];
  sortConfig: SortConfig;
  onSort: (field: SortField) => void;
  onEditRecord: (record: JsonRecord) => void;
  onDeleteRecord: (id: string) => void;
  selectedIds: Set<string>;
  onToggleSelectAll: () => void;
  onToggleSelectOne: (id: string) => void;
  onDeleteSelected: () => void;
}

export const DataTable: React.FC<DataTableProps> = ({
  records,
  sortConfig,
  onSort,
  onEditRecord,
  onDeleteRecord,
  selectedIds,
  onToggleSelectAll,
  onToggleSelectOne,
  onDeleteSelected,
}) => {
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [previewRecord, setPreviewRecord] = useState<JsonRecord | null>(null);

  // Pagination calculation
  const totalItems = records.length;
  const totalPages = pageSize === -1 ? 1 : Math.max(1, Math.ceil(totalItems / pageSize));
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = pageSize === -1 ? 0 : (validPage - 1) * pageSize;
  const paginatedRecords = pageSize === -1 ? records : records.slice(startIndex, startIndex + pageSize);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(id);
    setTimeout(() => {
      setCopiedHash(null);
    }, 2000);
  };

  const renderSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) {
      return <ArrowUpDown className="w-3 h-3 opacity-40 group-hover:opacity-100 transition-opacity" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 font-bold" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 font-bold" />
    );
  };

  const isAllSelected = totalItems > 0 && selectedIds.size === totalItems;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < totalItems;

  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden flex flex-col" id="section-tableau">
      {/* Table Toolbar */}
      <div className="p-4 sm:px-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
            Tableau des Données ({totalItems} ligne{totalItems > 1 ? 's' : ''})
          </h3>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 pl-2">
              <span className="text-[11px] bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-semibold px-2 py-0.5 rounded-md border border-blue-200/60 dark:border-blue-800/60">
                {selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}
              </span>
              <button
                id="btn-delete-selected"
                onClick={onDeleteSelected}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-md border border-rose-200 dark:border-rose-800/60 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Supprimer la sélection</span>
              </button>
            </div>
          )}
        </div>

        {/* Page size selector */}
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="text-[11px] uppercase font-bold text-slate-400">Afficher :</span>
          <select
            id="select-page-size"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="text-xs font-medium px-2 py-1 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
          >
            <option value={10}>10 par page</option>
            <option value={25}>25 par page</option>
            <option value={50}>50 par page</option>
            <option value={100}>100 par page</option>
            <option value={-1}>Tout afficher ({totalItems})</option>
          </select>
        </div>
      </div>

      {/* Main Table Structure */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse" id="table-json-data">
          <thead>
            <tr className="bg-slate-50/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 select-none">
              <th className="px-4 py-3.5 w-10 text-center">
                <input
                  id="checkbox-select-all"
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = isSomeSelected;
                  }}
                  onChange={onToggleSelectAll}
                  className="rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-600 cursor-pointer"
                />
              </th>

              {/* Header 1: Date Brute */}
              <th
                id="th-date-brute"
                onClick={() => onSort('date_brute')}
                className="px-4 py-3.5 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-700/80 transition-colors group text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
              >
                <div className="flex items-center gap-1.5">
                  <span>Date d'entrée (Brute)</span>
                  {renderSortIcon('date_brute')}
                </div>
              </th>

              {/* Header 2: Date UTC */}
              <th
                id="th-date-utc"
                onClick={() => onSort('date_utc')}
                className="px-4 py-3.5 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-700/80 transition-colors group text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
              >
                <div className="flex items-center gap-1.5">
                  <span>Date UTC</span>
                  {renderSortIcon('date_utc')}
                </div>
              </th>

              {/* Header 3: Coefficient */}
              <th
                id="th-coefficient"
                onClick={() => onSort('coefficient')}
                className="px-4 py-3.5 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-700/80 transition-colors group text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
              >
                <div className="flex items-center gap-1.5">
                  <span>Coefficient</span>
                  {renderSortIcon('coefficient')}
                </div>
              </th>

              {/* Header 4: Hash */}
              <th
                id="th-hash"
                onClick={() => onSort('hash')}
                className="px-4 py-3.5 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-700/80 transition-colors group text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
              >
                <div className="flex items-center gap-1.5">
                  <span>Hash SHA-256</span>
                  {renderSortIcon('hash')}
                </div>
              </th>

              {/* Actions */}
              <th className="px-4 py-3.5 text-right text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="text-sm divide-y divide-slate-100 dark:divide-slate-800">
            {paginatedRecords.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400 font-sans">
                  <p className="text-sm font-semibold">Aucun enregistrement ne correspond aux critères de filtre.</p>
                  <p className="text-xs text-slate-400 mt-1">Essayez de réinitialiser ou d'ajuster les filtres temporels.</p>
                </td>
              </tr>
            ) : (
              paginatedRecords.map((r, index) => {
                const isSelected = selectedIds.has(r.id);
                const badge = getCoefficientBadgeStyle(r.coefficient);
                const isCopied = copiedHash === r.id;

                return (
                  <tr
                    key={r.id}
                    className={`transition-colors ${
                      isSelected
                        ? 'bg-blue-50/70 dark:bg-blue-950/40'
                        : index % 2 === 0
                        ? 'bg-white/40 dark:bg-slate-900/40'
                        : 'bg-slate-50/30 dark:bg-slate-800/20'
                    } hover:bg-blue-50/50 dark:hover:bg-slate-800/60`}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelectOne(r.id)}
                        className="rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-600 cursor-pointer"
                      />
                    </td>

                    {/* Date Brute */}
                    <td className="px-4 py-3 text-slate-800 dark:text-slate-200">
                      <div className="font-medium text-xs text-slate-800 dark:text-slate-200">{formatDateFrench(r.date_brute)}</div>
                      <div className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]">
                        {r.date_brute}
                      </div>
                    </td>

                    {/* Date UTC */}
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs font-mono">
                      {r.date_utc}
                    </td>

                    {/* Coefficient */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}
                      >
                        {r.coefficient.toFixed(2)}x
                      </span>
                    </td>

                    {/* Hash SHA-256 with copy button */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 group/hash">
                        <span
                          title={r.hash}
                          className="font-mono text-xs text-blue-600 dark:text-blue-400 font-medium truncate max-w-[220px] sm:max-w-[300px]"
                        >
                          {r.hash}
                        </span>
                        <button
                          onClick={() => handleCopy(r.hash, r.id)}
                          title="Copier le hash SHA-256"
                          className="p-1 rounded-md text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors opacity-80 group-hover/hash:opacity-100 cursor-pointer"
                        >
                          {isCopied ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setPreviewRecord(r)}
                          title="Aperçu JSON"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onEditRecord(r)}
                          title="Modifier"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onDeleteRecord(r.id)}
                          title="Supprimer"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {pageSize !== -1 && totalPages > 1 && (
        <div className="p-4 sm:px-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-850/80">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Affichage de <strong className="text-slate-800 dark:text-slate-200 font-bold">{startIndex + 1}</strong> à{' '}
            <strong className="text-slate-800 dark:text-slate-200 font-bold">
              {Math.min(startIndex + pageSize, totalItems)}
            </strong>{' '}
            sur <strong className="text-blue-600 dark:text-blue-400 font-bold">{totalItems}</strong> résultats
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={validPage === 1}
              className="p-1.5 rounded-md text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={validPage === 1}
              className="p-1.5 rounded-md text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1 text-xs font-bold text-slate-800 dark:text-slate-200 bg-white/90 dark:bg-slate-700 rounded-md border border-slate-200 dark:border-slate-600 shadow-xs">
              Page {validPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={validPage === totalPages}
              className="p-1.5 rounded-md text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={validPage === totalPages}
              className="p-1.5 rounded-md text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* JSON Record Preview Modal */}
      {previewRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-blue-600" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Objet JSON de l'enregistrement
                </h4>
              </div>
              <button
                onClick={() => setPreviewRecord(null)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md cursor-pointer"
              >
                Fermer ✕
              </button>
            </div>

            <pre className="p-4 bg-slate-950 text-blue-300 rounded-xl text-xs overflow-x-auto font-mono max-h-72 border border-slate-800">
              {JSON.stringify(
                {
                  date_brute: previewRecord.date_brute,
                  date_utc: previewRecord.date_utc,
                  coefficient: previewRecord.coefficient,
                  hash: previewRecord.hash,
                },
                null,
                2
              )}
            </pre>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    JSON.stringify(
                      {
                        date_brute: previewRecord.date_brute,
                        date_utc: previewRecord.date_utc,
                        coefficient: previewRecord.coefficient,
                        hash: previewRecord.hash,
                      },
                      null,
                      2
                    )
                  );
                  setPreviewRecord(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm shadow-blue-500/20 cursor-pointer"
              >
                Copier le JSON & Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

