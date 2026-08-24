import React from 'react';
import { FilterState, DuplicateFilterType } from '../types';
import { Filter, Search, Calendar, Clock, RotateCcw, Copy, Hash, X } from 'lucide-react';

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  onResetFilters: () => void;
  availableYears: string[];
  availableMonths: { value: string; label: string }[];
  availableHours: string[];
  totalRecordsCount: number;
  filteredRecordsCount: number;
  duplicateCoeffCount: number;
  duplicateHashCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  availableYears,
  availableMonths,
  availableHours,
  totalRecordsCount,
  filteredRecordsCount,
  duplicateCoeffCount,
}) => {
  // Count how many filters are actively applied
  let activeFilterCount = 0;
  if (filters.year !== 'all') activeFilterCount++;
  if (filters.month !== 'all') activeFilterCount++;
  if (filters.date !== '') activeFilterCount++;
  if (filters.hour !== 'all') activeFilterCount++;
  if (filters.duplicateFilter !== 'all') activeFilterCount++;
  if (filters.minCoefficient !== '') activeFilterCount++;
  if (filters.maxCoefficient !== '') activeFilterCount++;
  if (filters.searchQuery.trim() !== '') activeFilterCount++;

  const update = (partial: Partial<FilterState>) => {
    onFilterChange({ ...filters, ...partial });
  };

  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-4 sm:p-5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-4" id="section-filtres">
      {/* Header of Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <span>Filtres de Données & Temporaux</span>
          </h3>
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 border border-blue-200/50">
              {activeFilterCount} actif{activeFilterCount > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Résultats : <strong className="text-blue-600 dark:text-blue-400 font-bold">{filteredRecordsCount}</strong> / {totalRecordsCount}
          </span>
          {activeFilterCount > 0 && (
            <button
              id="btn-reset-filters"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Réinitialiser</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid of Filter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Filtre par Année */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span>Année</span>
          </label>
          <select
            id="filter-year"
            value={filters.year}
            onChange={(e) => update({ year: e.target.value })}
            className="w-full text-xs font-medium px-3 py-2 bg-white/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all cursor-pointer"
          >
            <option value="all">Toutes les années</option>
            {availableYears.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Filtre par Mois */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span>Mois</span>
          </label>
          <select
            id="filter-month"
            value={filters.month}
            onChange={(e) => update({ month: e.target.value })}
            className="w-full text-xs font-medium px-3 py-2 bg-white/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all cursor-pointer"
          >
            <option value="all">Tous les mois</option>
            {availableMonths.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Filtre par Date précise */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>Date précise</span>
            </label>
            {filters.date && (
              <button
                onClick={() => update({ date: '' })}
                className="text-[10px] text-blue-500 hover:text-blue-700 font-semibold cursor-pointer"
              >
                Effacer
              </button>
            )}
          </div>
          <input
            id="filter-date-picker"
            type="date"
            value={filters.date}
            onChange={(e) => update({ date: e.target.value })}
            className="w-full text-xs px-3 py-1.5 bg-white/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all"
          />
        </div>

        {/* 4. Filtre par Heure */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>Heure (00h - 23h)</span>
          </label>
          <select
            id="filter-hour"
            value={filters.hour}
            onChange={(e) => update({ hour: e.target.value })}
            className="w-full text-xs font-medium px-3 py-2 bg-white/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all cursor-pointer"
          >
            <option value="all">Toutes les heures</option>
            {availableHours.map((hr) => (
              <option key={hr} value={hr}>
                {hr}:00 - {hr}:59
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Second Row: Filter en double, Plage Coefficient, Free Search */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
        {/* 5. Filtre en Double (Doublons) */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 tracking-wider flex items-center gap-1">
            <Copy className="w-3 h-3" />
            <span>Filtrer en Double (Doublons)</span>
          </label>
          <select
            id="filter-duplicates"
            value={filters.duplicateFilter}
            onChange={(e) => update({ duplicateFilter: e.target.value as DuplicateFilterType })}
            className="w-full text-xs font-semibold px-3 py-2 bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none transition-all cursor-pointer"
          >
            <option value="all">Tous (Avec et sans doublon)</option>
            <option value="duplicates_only">⚠️ Tous les doublons ({duplicateCoeffCount})</option>
            <option value="duplicate_coeff">📊 Doublons de Coefficient ({duplicateCoeffCount})</option>
            <option value="duplicate_date">⏰ Doublons de Date / Heure</option>
            <option value="duplicate_hash">🔑 Doublons de Hash SHA-256</option>
            <option value="unique_only">✨ Valeurs Uniques uniquement</option>
          </select>
        </div>

        {/* 6. Plage de Coefficient (Min / Max) */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1">
            <Hash className="w-3 h-3 text-slate-400" />
            <span>Coefficient (Min / Max)</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              id="filter-min-coeff"
              type="number"
              step="0.1"
              placeholder="Min (ex: 1.5)"
              value={filters.minCoefficient}
              onChange={(e) => update({ minCoefficient: e.target.value })}
              className="w-1/2 text-xs px-3 py-2 bg-white/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none"
            />
            <span className="text-slate-400 text-xs font-medium">à</span>
            <input
              id="filter-max-coeff"
              type="number"
              step="0.1"
              placeholder="Max (ex: 10)"
              value={filters.maxCoefficient}
              onChange={(e) => update({ maxCoefficient: e.target.value })}
              className="w-1/2 text-xs px-3 py-2 bg-white/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        {/* 7. Recherche libre dans Hash ou Dates */}
        <div className="space-y-1 sm:col-span-2 lg:col-span-1">
          <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1">
            <Search className="w-3 h-3 text-slate-400" />
            <span>Recherche Hash / Date</span>
          </label>
          <div className="relative">
            <input
              id="filter-search-query"
              type="text"
              placeholder="Rechercher par hash, date..."
              value={filters.searchQuery}
              onChange={(e) => update({ searchQuery: e.target.value })}
              className="w-full text-xs pl-8 pr-7 py-2 bg-white/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            {filters.searchQuery && (
              <button
                onClick={() => update({ searchQuery: '' })}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

