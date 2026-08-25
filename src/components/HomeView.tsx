import React from 'react';
import { JsonRecord } from '../types';
import { formatDateFrench, getCoefficientBadgeStyle } from '../utils/formatters';
import { Table2, Upload, Download, ArrowRight, Sparkles, Filter, Copy, Hash, Layers, CheckCircle2, TrendingUp, Award, ShieldCheck, BarChart3, Wrench } from 'lucide-react';

interface HomeViewProps {
  records: JsonRecord[];
  onNavigateToSaisie: () => void;
  onNavigateToAnalyse: () => void;
  onNavigateToTools: () => void;
  onOpenImport: () => void;
  onOpenExport: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  records,
  onNavigateToSaisie,
  onNavigateToAnalyse,
  onNavigateToTools,
  onOpenImport,
  onOpenExport,
}) => {
  // Compute analytics
  const total = records.length;
  const coefficients = records.map((r) => r.coefficient);
  const avgCoeff = total > 0 ? (coefficients.reduce((a, b) => a + b, 0) / total).toFixed(2) : '0';
  const maxCoeff = total > 0 ? Math.max(...coefficients).toFixed(2) : '0';
  const minCoeff = total > 0 ? Math.min(...coefficients).toFixed(2) : '0';

  // Count duplicates
  const coeffMap = new Map<number, number>();
  records.forEach((r) => coeffMap.set(r.coefficient, (coeffMap.get(r.coefficient) || 0) + 1));
  let duplicatesCount = 0;
  coeffMap.forEach((cnt) => {
    if (cnt > 1) duplicatesCount += cnt;
  });

  // Calculate bracket distribution
  const brackets = [
    { label: '< 2.00x (Standard)', count: records.filter((r) => r.coefficient < 2).length, color: 'bg-slate-400' },
    { label: '2.00x - 2.99x (Moyen)', count: records.filter((r) => r.coefficient >= 2 && r.coefficient < 3).length, color: 'bg-blue-500' },
    { label: '3.00x - 9.99x (Élevé)', count: records.filter((r) => r.coefficient >= 3 && r.coefficient < 10).length, color: 'bg-indigo-600' },
    { label: '≥ 10.00x (Ultra Multiplicateur)', count: records.filter((r) => r.coefficient >= 10).length, color: 'bg-emerald-500' },
  ];

  const recentRecords = records.slice(0, 6);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-in fade-in duration-300">
      {/* Frosted Glass Hero Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white p-6 sm:p-8 shadow-lg shadow-blue-900/20 border border-blue-400/20">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-indigo-400/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest bg-white/15 text-blue-100 border border-white/20 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-blue-200" />
            <span>Système de gestion et d'analyse de données JSON</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
            Tableau de Bord & Données JSON
          </h2>

          <p className="text-blue-100/90 text-sm sm:text-base leading-relaxed max-w-2xl">
            Consultez, analysez et structurez vos données temporelles en temps réel.
            Profitez du filtrage par <span className="text-white font-semibold underline decoration-white/40">date</span>, <span className="text-white font-semibold underline decoration-white/40">heure</span>, <span className="text-white font-semibold underline decoration-white/40">mois</span>, <span className="text-white font-semibold underline decoration-white/40">année</span> et détection des <span className="text-white font-semibold underline decoration-white/40">doublons</span>.
          </p>

          {/* Frosted Glass Call to actions */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              id="home-btn-goto-saisie"
              onClick={onNavigateToSaisie}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-blue-700 bg-white hover:bg-blue-50 transition-all shadow-md shadow-black/10 cursor-pointer"
            >
              <Table2 className="w-4 h-4" />
              <span>Ouvrir la Saisie & Filtres</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>

            <button
              id="home-btn-analyse"
              onClick={onNavigateToAnalyse}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md transition-all cursor-pointer"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Analyse</span>
            </button>

            <button
              id="home-btn-tools"
              onClick={onNavigateToTools}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md transition-all cursor-pointer"
            >
              <Wrench className="w-4 h-4" />
              <span>Tools</span>
            </button>

            <button
              id="home-btn-import"
              onClick={onOpenImport}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Importer JSON</span>
            </button>

            <button
              id="home-btn-export"
              onClick={onOpenExport}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Exporter ({total})</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metrics Cards with Frosted Glass Appearance */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 sm:p-5 rounded-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Total Entrées</span>
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{total}</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Lignes actives en mémoire</p>
        </div>

        <div className="p-4 sm:p-5 rounded-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Moyenne Coeff</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{avgCoeff}x</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Multiplicateur moyen</p>
        </div>

        <div className="p-4 sm:p-5 rounded-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Multiplicateur Max</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{maxCoeff}x</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Plancher min: {minCoeff}x</p>
        </div>

        <div className="p-4 sm:p-5 rounded-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Doublons Détectés</span>
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
              <Copy className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{duplicatesCount}</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Lignes avec coeff récurrent</p>
        </div>
      </div>

      {/* Distribution & Features */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribution Card */}
        <div className="lg:col-span-1 p-5 rounded-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Répartition des Tranches
            </h3>
          </div>

          <div className="space-y-3 pt-1">
            {brackets.map((b, idx) => {
              const pct = total > 0 ? Math.round((b.count / total) * 100) : 0;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                    <span className="font-medium">{b.label}</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {b.count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div className={`${b.color} h-2 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Feature Grid */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Fonctionnalités du Système
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-start space-x-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 shrink-0">
                <Filter className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Filtres Temporels</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  Filtrez instantanément par Année, Mois, Date précise (calendrier) et Heure (00h-23h).
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-start space-x-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 shrink-0">
                <Copy className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Filtre "En Double"</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  Isolez les doublons de coefficient, d'horodatage ou de Hash SHA-256 en un clic.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-start space-x-3">
              <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 shrink-0">
                <Hash className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Inspection SHA-256</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  Affichage des empreintes cryptographiques avec copie en un clic dans le presse-papier.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-start space-x-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 shrink-0">
                <Upload className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Import & Export JSON</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  Glisser-déposer de fichiers JSON, validation automatique et export JSON / CSV.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Records Preview Table */}
      <div className="p-5 rounded-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Aperçu des Données Récentes (6 sur {total})
            </h3>
          </div>
          <button
            onClick={onNavigateToSaisie}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 cursor-pointer"
          >
            <span>Voir tout dans la Saisie</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200/80 dark:border-slate-800">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700">
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date d'entrée (Brute)</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date UTC</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Coefficient</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Hash SHA-256</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100 dark:divide-slate-800">
              {recentRecords.map((r) => {
                const badge = getCoefficientBadgeStyle(r.coefficient);
                return (
                  <tr key={r.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200 text-xs font-medium">
                      {formatDateFrench(r.date_brute)}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs font-mono">
                      {r.date_utc}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}>
                        {r.coefficient.toFixed(2)}x
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-blue-600 dark:text-blue-400 max-w-[240px] truncate">
                      {r.hash}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

