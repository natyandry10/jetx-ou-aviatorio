import React from 'react';
import { JsonRecord } from '../types';
import { formatDateFrench, getCoefficientBadgeStyle } from '../utils/formatters';
import { BarChart3, TrendingUp, Clock, Award, Layers, Hash } from 'lucide-react';

interface StatsViewProps {
  records: JsonRecord[];
  onNavigateToSaisie: () => void;
}

export const StatsView: React.FC<StatsViewProps> = ({ records, onNavigateToSaisie }) => {
  const total = records.length;
  if (total === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center text-slate-500">
        Aucune donnée à analyser.
      </div>
    );
  }

  const coefficients = records.map((r) => r.coefficient);
  const sum = coefficients.reduce((a, b) => a + b, 0);
  const avg = (sum / total).toFixed(2);
  const max = Math.max(...coefficients).toFixed(2);
  const min = Math.min(...coefficients).toFixed(2);

  // Sorted top 10 highest multipliers
  const top10 = [...records].sort((a, b) => b.coefficient - a.coefficient).slice(0, 8);

  // Hourly counts
  const hourCounts = new Map<number, number>();
  records.forEach((r) => {
    try {
      const d = new Date(r.date_brute);
      if (!isNaN(d.getHours())) {
        hourCounts.set(d.getHours(), (hourCounts.get(d.getHours()) || 0) + 1);
      }
    } catch {
      // ignore
    }
  });

  const sortedHours = Array.from(hourCounts.entries()).sort((a, b) => a[0] - b[0]);
  const maxHourCount = Math.max(...Array.from(hourCounts.values()), 1);

  // Bracket ranges
  const brackets = [
    { label: '1.00x - 1.99x', count: records.filter((r) => r.coefficient >= 1 && r.coefficient < 2).length, color: 'bg-slate-500' },
    { label: '2.00x - 2.99x', count: records.filter((r) => r.coefficient >= 2 && r.coefficient < 3).length, color: 'bg-emerald-500' },
    { label: '3.00x - 4.99x', count: records.filter((r) => r.coefficient >= 3 && r.coefficient < 5).length, color: 'bg-blue-500' },
    { label: '5.00x - 9.99x', count: records.filter((r) => r.coefficient >= 5 && r.coefficient < 10).length, color: 'bg-indigo-500' },
    { label: '10.00x - 49.99x', count: records.filter((r) => r.coefficient >= 10 && r.coefficient < 50).length, color: 'bg-purple-600' },
    { label: '≥ 50.00x (Ultra)', count: records.filter((r) => r.coefficient >= 50).length, color: 'bg-rose-500' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Top metrics header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Analyses & Statistiques des Données JSON</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Synthèse globale des coefficients et de la distribution temporelle
          </p>
        </div>

        <button
          onClick={onNavigateToSaisie}
          className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-xs transition-colors"
        >
          Ouvrir la Saisie détaillée
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Nombre Total</span>
            <Layers className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{total}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Lignes analysées</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Coefficient Moyen</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{avg}x</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Moyenne arithmétique</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Valeur Maximale</span>
            <Award className="w-4 h-4 text-purple-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{max}x</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Multiplicateur record</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Valeur Minimale</span>
            <Hash className="w-4 h-4 text-blue-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{min}x</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Multiplicateur plancher</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribution Ranges */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Distribution des Tranches de Coefficients</span>
          </h3>

          <div className="space-y-3.5 pt-2">
            {brackets.map((b, idx) => {
              const pct = total > 0 ? Math.round((b.count / total) * 100) : 0;
              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{b.label}</span>
                    <span className="text-slate-900 dark:text-white font-semibold">
                      {b.count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`${b.color} h-2.5 rounded-full transition-all duration-500`}
                      style={{ width: `${Math.max(pct, b.count > 0 ? 3 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hourly distribution */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Activité Temporelle par Heure</span>
          </h3>

          <div className="space-y-3 pt-2">
            {sortedHours.map(([hour, count]) => {
              const pct = Math.round((count / maxHourCount) * 100);
              return (
                <div key={hour} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {String(hour).padStart(2, '0')}:00 - {String(hour).padStart(2, '0')}:59
                    </span>
                    <span className="text-slate-900 dark:text-white font-semibold">
                      {count} enregistrements
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-indigo-600 dark:bg-indigo-500 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top 8 Highest records */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-500" />
          <span>Top des Plus Grands Multiplicateurs</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {top10.map((r, i) => {
            const badge = getCoefficientBadgeStyle(r.coefficient);
            return (
              <div
                key={r.id}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">#{i + 1}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs border ${badge.bg} ${badge.text} ${badge.border}`}>
                    {r.coefficient.toFixed(2)}x
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300 font-sans">
                  {formatDateFrench(r.date_brute)}
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate">
                  {r.hash}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
