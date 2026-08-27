import React, { useEffect, useMemo, useState } from 'react';
import { CalendarRange, Info, RefreshCw } from 'lucide-react';
import { JsonRecord } from '../types';
import {
  calculateTodayCorrelation,
  formatCorrelationClock,
  formatCorrelationDate,
  formatCorrelationHour,
  formatCorrelationInterval,
  formatCorrelationNumber,
  formatCorrelationPercent,
  formatCorrelationToday,
} from '../utils/todayCorrelation';

interface TodayCorrelationPanelProps {
  records: JsonRecord[];
  sourceName?: string;
}

export const TodayCorrelationPanel: React.FC<TodayCorrelationPanelProps> = ({ records, sourceName }) => {
  const [now, setNow] = useState(() => new Date());
  const [threshold, setThreshold] = useState(15);

  useEffect(() => {
    const delay = Math.max(250, 60000 - now.getSeconds() * 1000 - now.getMilliseconds());
    const timeoutId = window.setTimeout(() => {
      setNow(new Date());
    }, delay);
    return () => window.clearTimeout(timeoutId);
  }, [now]);

  const result = useMemo(() => calculateTodayCorrelation(records, now, threshold), [now, records, threshold]);
  const periodStart = formatCorrelationClock(result.referenceStartSeconds);
  const periodEnd = formatCorrelationClock(result.referenceEndSeconds);
  const topMatch = result.rows.find((row) => row.comparable);

  return <section className="rounded-2xl border border-fuchsia-200 bg-white p-5 shadow-xs dark:border-fuchsia-900/70 dark:bg-slate-900" aria-labelledby="today-correlation-title">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-fuchsia-100 p-2 text-fuchsia-700 dark:bg-fuchsia-950/50 dark:text-fuchsia-300"><CalendarRange className="h-5 w-5" /></div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-fuchsia-700 dark:text-fuchsia-300">CORRELATION</p>
          <h3 id="today-correlation-title" className="mt-1 text-base font-bold text-slate-900 dark:text-white">Aujourd’hui comme base de comparaison</h3>
          <p className="mt-1 max-w-3xl text-[11px] text-slate-500 dark:text-slate-400">Compare la portion déjà écoulée d’aujourd’hui avec le même créneau des jours précédents présents dans le fichier JSON.</p>
        </div>
      </div>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-fuchsia-50 px-3 py-1.5 text-[10px] font-semibold text-fuchsia-800 dark:bg-fuchsia-950/50 dark:text-fuchsia-200"><Info className="h-3.5 w-3.5" />Score descriptif, pas une garantie</span>
    </div>

    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
      <div className="rounded-xl border border-fuchsia-100 bg-fuchsia-50/60 p-3 dark:border-fuchsia-900/50 dark:bg-fuchsia-950/20">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-fuchsia-950 dark:text-fuchsia-100">
          <span><strong>Base :</strong> aujourd’hui, {formatCorrelationToday(now)}</span>
          <span><strong>Heure actuelle :</strong> {formatCorrelationHour(now)}</span>
          <span><strong>Période :</strong> {periodStart} → {periodEnd}</span>
          <span><strong>Fichier :</strong> {sourceName ?? 'Données non chargées'}</span>
        </div>
        <p className="mt-2 text-[10px] text-fuchsia-800 dark:text-fuchsia-200">La période est limitée aux minutes déjà écoulées aujourd’hui ; aucune donnée future de la journée n’est utilisée.</p>
      </div>
      <label className="space-y-1"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Seuil &gt;</span><input type="number" min={0} max={100000} step="0.01" value={threshold} onChange={(event) => { const value = Number(event.target.value); setThreshold(Number.isFinite(value) ? Math.max(0, Math.min(100000, value)) : 15); }} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-fuchsia-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label>
    </div>

    {records.length === 0 ? <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-400">Aucune donnée JSON disponible pour établir la base d’aujourd’hui.</div> : result.baseProfile === null ? <div className="mt-4 rounded-xl border border-dashed border-fuchsia-200 bg-fuchsia-50/60 p-5 text-center text-xs text-fuchsia-800 dark:border-fuchsia-900/60 dark:bg-fuchsia-950/20 dark:text-fuchsia-200">Aucun résultat enregistré aujourd’hui entre {periodStart} et {periodEnd}. Les jours historiques ne peuvent pas être classés sans base actuelle.</div> : <>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-fuchsia-200 bg-fuchsia-50 p-3 dark:border-fuchsia-900/60 dark:bg-fuchsia-950/30"><p className="text-[10px] font-bold uppercase tracking-wider text-fuchsia-700 dark:text-fuchsia-300">Base aujourd’hui</p><p className="mt-1 text-xl font-bold text-fuchsia-950 dark:text-fuchsia-100">{result.baseProfile.validCount}</p><p className="text-[10px] text-fuchsia-700 dark:text-fuchsia-300">tours valides · {result.baseProfile.aboveThresholdCount} &gt;{threshold}x</p></div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Jours historiques</p><p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{result.historicalDatesWithData}</p><p className="text-[10px] text-slate-500 dark:text-slate-400">avec des données comparables</p></div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/30"><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Jour le plus proche</p><p className="mt-1 text-base font-bold text-emerald-950 dark:text-emerald-100">{topMatch ? formatCorrelationDate(topMatch.profile.dateKey) : '—'}</p><p className="text-[10px] text-emerald-700 dark:text-emerald-300">{topMatch?.similarityScore === null || topMatch === undefined ? 'Échantillon insuffisant' : `${topMatch.similarityScore.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} % de proximité`}</p></div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800"><table className="min-w-[900px] w-full text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 dark:bg-slate-950/70 dark:text-slate-400"><tr><th className="px-3 py-3 font-bold">Rang</th><th className="px-3 py-3 font-bold">Date comparée</th><th className="px-3 py-3 font-bold">Tours valides</th><th className="px-3 py-3 font-bold">Résultats &gt;{threshold}x</th><th className="px-3 py-3 font-bold">Taux &gt;{threshold}x</th><th className="px-3 py-3 font-bold">Moyenne géométrique</th><th className="px-3 py-3 font-bold">Intervalle moyen</th><th className="px-3 py-3 font-bold">Score</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{result.rows.length > 0 ? result.rows.map((row, index) => <tr key={row.profile.dateKey} className={row.comparable ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/60 dark:bg-slate-950/30'}><td className="px-3 py-3 font-bold text-slate-500 dark:text-slate-400">{row.comparable ? `#${index + 1}` : '—'}</td><td className="px-3 py-3 font-semibold text-slate-800 dark:text-slate-100">{formatCorrelationDate(row.profile.dateKey)}</td><td className="px-3 py-3">{row.profile.validCount}</td><td className="px-3 py-3">{row.profile.aboveThresholdCount}</td><td className="px-3 py-3 font-semibold text-fuchsia-700 dark:text-fuchsia-300">{formatCorrelationPercent(row.profile.aboveThresholdRate)}</td><td className="px-3 py-3">{formatCorrelationNumber(row.profile.geometricMean)}</td><td className="px-3 py-3 font-mono">{formatCorrelationInterval(row.profile.averageIntervalSeconds)}</td><td className="px-3 py-3">{row.similarityScore === null ? <span className="text-slate-500 dark:text-slate-400">Échantillon insuffisant</span> : <span className="inline-flex rounded-full bg-emerald-100 px-2 py-1 font-bold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">{row.similarityScore.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %</span>}</td></tr>) : <tr><td colSpan={8} className="px-4 py-8 text-center text-xs text-slate-500 dark:text-slate-400">Aucun jour historique ne contient cette portion horaire.</td></tr>}</tbody></table></div>
      <div className="mt-3 flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-[10px] text-slate-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300"><RefreshCw className="mt-0.5 h-3.5 w-3.5 shrink-0" /><p>La base d’aujourd’hui est recalculée à la prochaine minute. Un score n’est affiché que si aujourd’hui et le jour comparé possèdent au moins {result.minimumRecords} tours valides dans la même portion horaire.</p></div>
    </>}
  </section>;
};
