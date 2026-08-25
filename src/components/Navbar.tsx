import React from 'react';
import { Home, Table2, BarChart3, Wrench, Upload, Download, Plus } from 'lucide-react';
import { ActiveTab } from '../types';

interface NavbarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  totalCount: number;
  filteredCount: number;
  onOpenImport: () => void;
  onOpenExport: () => void;
  onOpenAddModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  totalCount,
  filteredCount,
  onOpenImport,
  onOpenExport,
  onOpenAddModal,
}) => {
  return (
    <nav className="sticky top-0 z-30 h-14 bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 flex items-center px-4 sm:px-8 shadow-xs">
      <div className="w-full max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand and Active Section Indicator */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 bg-blue-500 rounded-full shadow-sm shadow-blue-500/50 animate-pulse"></div>
            <span className="text-xs sm:text-sm font-bold uppercase text-slate-700 dark:text-slate-200 tracking-wider">
              {activeTab === 'accueil' && 'Rubrique : Accueil'}
              {activeTab === 'saisie' && 'Rubrique : Saisie & Données'}
              {activeTab === 'analyse' && 'Rubrique : Analyse'}
              {activeTab === 'tools' && 'Rubrique : Tools'}
            </span>
          </div>

          <span className="hidden md:inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 backdrop-blur-xs">
            {filteredCount === totalCount ? `${totalCount} entrées` : `${filteredCount}/${totalCount} filtrées`}
          </span>
        </div>

        {/* Frosted Navigation Links */}
        <div className="flex items-center space-x-1 sm:space-x-6 text-xs font-semibold text-slate-600 dark:text-slate-400">
          <button
            id="tab-accueil"
            onClick={() => onSelectTab('accueil')}
            className={`cursor-pointer px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'accueil'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-950/40 pb-1 font-bold'
                : 'hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Tableau de bord</span>
          </button>

          <button
            id="tab-saisie"
            onClick={() => onSelectTab('saisie')}
            className={`cursor-pointer px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'saisie'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-950/40 pb-1 font-bold'
                : 'hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <Table2 className="w-3.5 h-3.5" />
            <span>Saisie & Données</span>
          </button>

          <button
            id="tab-analyse"
            onClick={() => onSelectTab('analyse')}
            className={`cursor-pointer px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'analyse'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-950/40 pb-1 font-bold'
                : 'hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Analyse</span>
          </button>

          <button
            id="tab-tools"
            onClick={() => onSelectTab('tools')}
            className={`cursor-pointer px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'tools'
                ? 'text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-600 dark:border-cyan-400 bg-cyan-50/50 dark:bg-cyan-950/40 pb-1 font-bold'
                : 'hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tools</span>
          </button>
        </div>

        {/* Quick Actions Buttons */}
        <div className="flex items-center space-x-2">
          <button
            id="btn-nav-add"
            onClick={onOpenAddModal}
            title="Ajouter une nouvelle saisie"
            className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Ajouter</span>
          </button>

          <button
            id="btn-nav-import"
            onClick={onOpenImport}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-xs"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Importer</span>
          </button>

          <button
            id="btn-nav-export"
            onClick={onOpenExport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm shadow-blue-500/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exporter</span>
          </button>
        </div>
      </div>
    </nav>
  );
};
