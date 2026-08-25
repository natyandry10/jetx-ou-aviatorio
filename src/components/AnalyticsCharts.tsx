import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, BarChart3, CalendarDays, Clock3, Info, Scale, TrendingUp } from 'lucide-react';
import { JsonRecord } from '../types';
import { AdvancedStatsPanel } from './AdvancedStatsPanel';
import { DriveComparisonPanel } from './DriveComparisonPanel';
import {
  AnalyticsPeriod,
  AnalyticsPeriodPreset,
  AnalyticsPreferences,
  buildHourlyStats,
  buildTimeSeries,
  filterRecordsByPeriod,
  formatHour,
  getTopHourlyStats,
} from '../utils/analytics';
import { loadAnalyticsPreferences, persistAnalyticsPreferences } from '../utils/storage';

interface AnalyticsChartsProps {
  records: JsonRecord[];
}

function formatDateLabel(timestamp: number): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

function formatValue(value: number): string {
  return `${value.toFixed(2)}x`;
}

const periodOptions: Array<{ value: AnalyticsPeriodPreset; label: string }> = [
  { value: 'all', label: 'Toutes les données' },
  { value: '24h', label: 'Dernières 24 heures' },
  { value: '7d', label: 'Derniers 7 jours' },
  { value: '30d', label: 'Derniers 30 jours' },
  { value: 'custom', label: 'Période personnalisée' },
];

const DEFAULT_ANALYTICS_PREFERENCES: AnalyticsPreferences = {
  period: { preset: 'all' },
  scale: 'linear',
};

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ records }) => {
  const [preferences, setPreferences] = useState<AnalyticsPreferences>(() => loadAnalyticsPreferences(DEFAULT_ANALYTICS_PREFERENCES));
  const period = preferences.period;
  const scale = preferences.scale;

  useEffect(() => {
    persistAnalyticsPreferences(preferences);
  }, [preferences]);

  const handlePeriodChange = (preset: AnalyticsPeriodPreset) => {
    setPreferences((current) => ({
      ...current,
      period: preset === 'custom'
        ? { preset, startDate: current.period.startDate, endDate: current.period.endDate }
        : { preset },
    }));
  };

  const handleCustomDateChange = (field: 'startDate' | 'endDate', value: string) => {
    setPreferences((current) => ({ ...current, period: { ...current.period, [field]: value || undefined } }));
  };

  const handleComparisonSelectionChange = useCallback((fileAId: string, fileBId: string) => {
    setPreferences((current) => {
      if (current.comparisonFileAId === fileAId && current.comparisonFileBId === fileBId) return current;
      return { ...current, comparisonFileAId: fileAId || undefined, comparisonFileBId: fileBId || undefined };
    });
  }, []);

  const periodRecords = useMemo(() => filterRecordsByPeriod(records, period), [records, period]);
  const timeSeries = useMemo(() => buildTimeSeries(periodRecords), [periodRecords]);
  const hourlyStats = useMemo(() => buildHourlyStats(periodRecords), [periodRecords]);
  const topHours = useMemo(() => getTopHourlyStats(hourlyStats), [hourlyStats]);

  const chart = useMemo(() => {
    if (timeSeries.length === 0) return null;

    const values = timeSeries.map((point) => point.coefficient);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const transform = scale === 'logarithmic' ? (value: number) => Math.log10(Math.max(value, 0.000001)) : (value: number) => value;
    const inverseTransform = scale === 'logarithmic' ? (value: number) => 10 ** value : (value: number) => value;
    const plotMin = transform(min);
    const plotMax = transform(max);
    const plotRange = plotMax - plotMin || 1;
    const width = 720;
    const height = 260;
    const padding = { top: 22, right: 18, bottom: 36, left: 58 };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;
    const projectY = (value: number) => padding.top + (1 - (transform(value) - plotMin) / plotRange) * innerHeight;
    const points = timeSeries
      .map((point, index) => {
        const x = padding.left + (index / Math.max(timeSeries.length - 1, 1)) * innerWidth;
        return `${x.toFixed(2)},${projectY(point.coefficient).toFixed(2)}`;
      })
      .join(' ');

    return { min, max, width, height, padding, innerHeight, points, projectY, inverseTransform, plotMin, plotMax, plotRange };
  }, [scale, timeSeries]);

  const maxHourlyCount = Math.max(...hourlyStats.map((stat) => stat.count), 1);
  const maxHourlyAverage = Math.max(...hourlyStats.map((stat) => stat.average), 1);

  if (records.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 p-8 text-center text-sm text-slate-500 dark:text-slate-400">
        Aucune donnée disponible pour construire les graphiques.
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Graphiques temporels</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Analyse descriptive des coefficients et du volume d’enregistrements sur une période choisie.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="analytics-period" className="sr-only">Période d’analyse</label>
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 px-2.5 py-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-indigo-500" />
            <select
              id="analytics-period"
              value={period.preset}
              onChange={(event) => handlePeriodChange(event.target.value as AnalyticsPeriodPreset)}
              className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none"
            >
              {periodOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <button
            type="button"
            onClick={() => setPreferences((current) => ({ ...current, scale: current.scale === 'linear' ? 'logarithmic' : 'linear' }))}
            aria-pressed={scale === 'logarithmic'}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${scale === 'logarithmic' ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300' : 'border-slate-200 bg-white/80 text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200'}`}
          >
            <Scale className="w-3.5 h-3.5" />
            Échelle {scale === 'logarithmic' ? 'logarithmique' : 'linéaire'}
          </button>
        </div>
      </div>

      {period.preset === 'custom' && (
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/60 dark:bg-indigo-950/30 p-3">
          <label className="space-y-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span className="block text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Du</span>
            <input type="date" value={period.startDate ?? ''} onChange={(event) => handleCustomDateChange('startDate', event.target.value)} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500" />
          </label>
          <label className="space-y-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span className="block text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Au</span>
            <input type="date" value={period.endDate ?? ''} onChange={(event) => handleCustomDateChange('endDate', event.target.value)} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500" />
          </label>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Laissez une borne vide pour utiliser une seule limite.</span>
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 p-5 sm:p-6 shadow-xs" aria-labelledby="time-series-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h4 id="time-series-title" className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Coefficients dans le temps
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {timeSeries.length} point(s) affiché(s) sur {periodRecords.length} enregistrement(s), triés chronologiquement. Les données invalides sont exclues.
            </p>
          </div>
          {chart && (
            <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
              <span>Min <strong className="text-slate-800 dark:text-slate-200">{formatValue(chart.min)}</strong></span>
              <span>Max <strong className="text-slate-800 dark:text-slate-200">{formatValue(chart.max)}</strong></span>
            </div>
          )}
        </div>

        {chart ? (
          <div className="mt-4 overflow-x-auto rounded-xl bg-slate-50/80 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 p-2" role="img" aria-label={`Courbe des coefficients dans le temps en échelle ${scale === 'logarithmic' ? 'logarithmique' : 'linéaire'}`}>
            <svg viewBox={`0 0 ${chart.width} ${chart.height}`} className="w-full min-w-[620px] h-64" aria-hidden="true">
              {[0, 0.5, 1].map((ratio) => {
                const y = chart.padding.top + ratio * chart.innerHeight;
                const plotValue = chart.plotMax - ratio * chart.plotRange;
                const value = chart.inverseTransform(plotValue);
                return (
                  <g key={ratio}>
                    <line x1={chart.padding.left} x2={chart.width - chart.padding.right} y1={y} y2={y} stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeDasharray="4 5" />
                    <text x={chart.padding.left - 8} y={y + 4} textAnchor="end" className="fill-slate-400 dark:fill-slate-500" fontSize="10">{formatValue(value)}</text>
                  </g>
                );
              })}
              <polyline points={chart.points} fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              {timeSeries.filter((_, index) => index === 0 || index === timeSeries.length - 1 || index % Math.max(Math.floor(timeSeries.length / 8), 1) === 0).map((point) => {
                const index = timeSeries.indexOf(point);
                const x = chart.padding.left + (index / Math.max(timeSeries.length - 1, 1)) * (chart.width - chart.padding.left - chart.padding.right);
                const y = chart.projectY(point.coefficient);
                return (
                  <circle key={`${point.recordId}-${index}`} cx={x} cy={y} r="4" fill="#4f46e5" stroke="white" strokeWidth="2">
                    <title>{`${formatDateLabel(point.time)} — ${formatValue(point.coefficient)}`}</title>
                  </circle>
                );
              })}
              <text x={chart.padding.left} y={chart.height - 10} className="fill-slate-400 dark:fill-slate-500" fontSize="10">{formatDateLabel(timeSeries[0].time)}</text>
              <text x={chart.width - chart.padding.right} y={chart.height - 10} textAnchor="end" className="fill-slate-400 dark:fill-slate-500" fontSize="10">{formatDateLabel(timeSeries[timeSeries.length - 1].time)}</text>
            </svg>
          </div>
        ) : (
          <div className="mt-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-4 text-xs text-amber-800 dark:text-amber-300">
            Aucun horodatage valide n’est disponible sur cette période.
          </div>
        )}
      </section>

      <AdvancedStatsPanel records={records} period={period} />

      <DriveComparisonPanel
        initialFileAId={preferences.comparisonFileAId}
        initialFileBId={preferences.comparisonFileBId}
        onSelectionChange={handleComparisonSelectionChange}
      />

      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 p-5 sm:p-6 shadow-xs" aria-labelledby="hourly-analysis-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h4 id="hourly-analysis-title" className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Analyse par heure
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Barres = nombre d’enregistrements ; repère ambre = moyenne relative sur la période choisie.</p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400"><Info className="w-3.5 h-3.5" /> Heure locale</span>
        </div>

        {periodRecords.length > 0 ? (
          <>
            <div className="mt-5 overflow-x-auto rounded-xl bg-slate-50/80 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 p-3">
              <div className="min-w-[650px] h-56 flex items-end gap-1.5 px-2">
                {hourlyStats.map((stat) => {
                  const height = stat.count > 0 ? Math.max((stat.count / maxHourlyCount) * 100, 4) : 0;
                  const averageHeight = stat.average > 0 ? Math.max((stat.average / maxHourlyAverage) * 100, 3) : 0;
                  return (
                    <div key={stat.hour} className="flex-1 h-full min-w-[20px] flex flex-col items-center justify-end gap-1 group">
                      <div className="relative w-full h-full flex items-end justify-center">
                        <div className="absolute bottom-0 w-full max-w-[22px] rounded-t-md bg-indigo-500/80 dark:bg-indigo-400/70 transition-all group-hover:bg-indigo-600" style={{ height: `${height}%` }} title={`${formatHour(stat.hour)} : ${stat.count} enregistrements`} />
                        <div className="absolute bottom-0 w-1.5 rounded-full bg-amber-400 dark:bg-amber-300 transition-all" style={{ height: `${averageHeight}%` }} title={`${formatHour(stat.hour)} : moyenne ${formatValue(stat.average)}`} />
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">{String(stat.hour).padStart(2, '0')}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex items-center justify-center gap-4 text-[10px] text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-indigo-500/80" /> Volume</span>
                <span className="inline-flex items-center gap-1.5"><span className="w-1.5 h-2.5 rounded-full bg-amber-400" /> Moyenne relative</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              {topHours.map((stat, index) => (
                <div key={stat.hour} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">#{index + 1} — {formatHour(stat.hour)}</span>
                    <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
                  </div>
                  <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white">{stat.count} enregistrement(s)</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Moyenne {formatValue(stat.average)} · Max {formatValue(stat.maximum)}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="mt-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-4 text-xs text-amber-800 dark:text-amber-300">
            Aucun enregistrement valide ne correspond à cette période.
          </div>
        )}
      </section>
    </div>
  );
};
