import React, { useMemo } from 'react';
import { ArrowDownRight, ArrowUpRight, BarChart4, Minus, Sigma } from 'lucide-react';
import { JsonRecord } from '../types';
import { AnalyticsPeriod, buildComparisonPeriods, calculateCoefficientStats } from '../utils/analytics';

interface AdvancedStatsPanelProps {
  records: JsonRecord[];
  period: AnalyticsPeriod;
}

function formatValue(value: number): string {
  return `${value.toFixed(2)}x`;
}

function formatDelta(current: number, previous: number): string {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return '—';
  const difference = current - previous;
  const sign = difference > 0 ? '+' : '';
  return `${sign}${difference.toFixed(2)}x`;
}

function formatPercentDelta(current: number, previous: number): string {
  if (previous === 0) return '—';
  const percentage = ((current - previous) / Math.abs(previous)) * 100;
  const sign = percentage > 0 ? '+' : '';
  return `${sign}${percentage.toFixed(1)}%`;
}

const comparisonRows: Array<{ label: string; key: 'mean' | 'median' | 'p90' | 'minimum' | 'maximum' }> = [
  { label: 'Moyenne', key: 'mean' },
  { label: 'Médiane', key: 'median' },
  { label: 'P90', key: 'p90' },
  { label: 'Minimum', key: 'minimum' },
  { label: 'Maximum', key: 'maximum' },
];

export const AdvancedStatsPanel: React.FC<AdvancedStatsPanelProps> = ({ records, period }) => {
  const comparison = useMemo(() => buildComparisonPeriods(records, period), [period, records]);
  const currentStats = useMemo(() => calculateCoefficientStats(comparison.current), [comparison.current]);
  const previousStats = useMemo(() => calculateCoefficientStats(comparison.previous), [comparison.previous]);
  const hasCurrent = currentStats.count > 0;
  const hasPrevious = previousStats.count > 0;

  const statCards = [
    { label: 'Médiane', value: currentStats.median, description: '50 % des valeurs sont inférieures ou égales', color: 'text-indigo-600 dark:text-indigo-400' },
    { label: 'P25', value: currentStats.p25, description: 'Premier quartile', color: 'text-sky-600 dark:text-sky-400' },
    { label: 'P75', value: currentStats.p75, description: 'Troisième quartile', color: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'P90', value: currentStats.p90, description: '90 % des valeurs sont inférieures ou égales', color: 'text-amber-600 dark:text-amber-400' },
  ];

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 p-5 sm:p-6 shadow-xs space-y-5" aria-labelledby="advanced-stats-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400">
            <Sigma className="w-5 h-5" />
          </div>
          <div>
            <h3 id="advanced-stats-title" className="text-sm font-bold text-slate-900 dark:text-white">Médiane, percentiles & comparaison</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Les indicateurs sont calculés sur la période sélectionnée et les valeurs numériques valides.</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400"><BarChart4 className="w-3.5 h-3.5" /> {currentStats.count} valeur(s) actuelle(s)</span>
      </div>

      {hasCurrent ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statCards.map((card) => (
            <div key={card.label} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-3.5">
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">{card.label}</p>
              <p className={`mt-1.5 text-xl font-bold ${card.color}`}>{formatValue(card.value)}</p>
              <p className="mt-1 text-[10px] leading-4 text-slate-500 dark:text-slate-400">{card.description}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-4 text-xs text-amber-800 dark:text-amber-300">
          Aucun coefficient valide ne correspond à la période actuelle.
        </div>
      )}

      <div className="border-t border-slate-100 dark:border-slate-800 pt-5">
        <div className="flex flex-wrap items-end justify-between gap-2 mb-3">
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Comparaison de périodes</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">La période précédente utilise une durée comparable lorsque cela est possible.</p>
          </div>
          {!hasPrevious && <span className="text-[10px] text-amber-700 dark:text-amber-300">Pas assez de données historiques</span>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/30 p-4">
            <p className="text-[10px] uppercase tracking-wider font-bold text-indigo-700 dark:text-indigo-300">Période actuelle</p>
            <p className="mt-1 text-xs font-semibold text-slate-800 dark:text-slate-200">{comparison.currentLabel}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div><p className="text-[10px] text-slate-500 dark:text-slate-400">Lignes</p><p className="text-sm font-bold text-slate-900 dark:text-white">{currentStats.count}</p></div>
              <div><p className="text-[10px] text-slate-500 dark:text-slate-400">Médiane</p><p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{hasCurrent ? formatValue(currentStats.median) : '—'}</p></div>
              <div><p className="text-[10px] text-slate-500 dark:text-slate-400">P90</p><p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{hasCurrent ? formatValue(currentStats.p90) : '—'}</p></div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-4">
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">Période précédente</p>
            <p className="mt-1 text-xs font-semibold text-slate-800 dark:text-slate-200">{comparison.previousLabel}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div><p className="text-[10px] text-slate-500 dark:text-slate-400">Lignes</p><p className="text-sm font-bold text-slate-900 dark:text-white">{previousStats.count || '—'}</p></div>
              <div><p className="text-[10px] text-slate-500 dark:text-slate-400">Médiane</p><p className="text-sm font-bold text-slate-700 dark:text-slate-300">{hasPrevious ? formatValue(previousStats.median) : '—'}</p></div>
              <div><p className="text-[10px] text-slate-500 dark:text-slate-400">P90</p><p className="text-sm font-bold text-slate-700 dark:text-slate-300">{hasPrevious ? formatValue(previousStats.p90) : '—'}</p></div>
            </div>
          </div>
        </div>

        {hasCurrent && hasPrevious && (
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full min-w-[620px] text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/50 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <tr><th className="px-3 py-2 text-left font-bold">Indicateur</th><th className="px-3 py-2 text-right font-bold">Actuelle</th><th className="px-3 py-2 text-right font-bold">Précédente</th><th className="px-3 py-2 text-right font-bold">Écart</th><th className="px-3 py-2 text-right font-bold">Variation</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {comparisonRows.map((row) => {
                  const current = currentStats[row.key];
                  const previous = previousStats[row.key];
                  const difference = current - previous;
                  const Icon = difference > 0 ? ArrowUpRight : difference < 0 ? ArrowDownRight : Minus;
                  const tone = difference > 0 ? 'text-emerald-600 dark:text-emerald-400' : difference < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400';
                  return (
                    <tr key={row.key} className="text-slate-700 dark:text-slate-300">
                      <td className="px-3 py-2.5 font-semibold">{row.label}</td>
                      <td className="px-3 py-2.5 text-right font-medium">{formatValue(current)}</td>
                      <td className="px-3 py-2.5 text-right font-medium">{formatValue(previous)}</td>
                      <td className={`px-3 py-2.5 text-right font-semibold ${tone}`}><span className="inline-flex items-center gap-1"><Icon className="w-3.5 h-3.5" />{formatDelta(current, previous)}</span></td>
                      <td className={`px-3 py-2.5 text-right font-semibold ${tone}`}>{formatPercentDelta(current, previous)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[10px] leading-4 text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
        Lecture descriptive uniquement : la médiane et les percentiles résument les valeurs observées et ne constituent pas une prédiction des prochains événements.
      </p>
    </section>
  );
};
