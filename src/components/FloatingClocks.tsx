import React, { useEffect, useState } from 'react';

const JETX_OFFSET_MS = 61_000;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function formatClock(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function ClockCard({ label, value, accent }: { label: string; value: string; accent: 'blue' | 'amber' }) {
  const accentClasses = accent === 'blue'
    ? 'border-blue-300/70 bg-slate-950/95 text-blue-100 shadow-blue-950/30'
    : 'border-amber-300/70 bg-slate-950/95 text-amber-100 shadow-amber-950/30';

  return <div className={`min-w-0 rounded-xl border px-3 py-2.5 shadow-lg backdrop-blur-xl transition-all duration-300 ${accentClasses}`}>
    <div className="flex items-center gap-1.5"><span className={`h-1.5 w-1.5 animate-pulse rounded-full ${accent === 'blue' ? 'bg-blue-300' : 'bg-amber-300'}`} /><span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/70">{label}</span></div>
    <p className="mt-1 whitespace-nowrap font-mono text-base font-black tracking-[0.08em] tabular-nums sm:text-lg" aria-label={`${label} ${value}`}>{value}</p>
  </div>;
}

export const FloatingClocks: React.FC = () => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 250);
    return () => window.clearInterval(timer);
  }, []);

  const localTime = formatClock(now);
  const jetxTime = formatClock(new Date(now.getTime() + JETX_OFFSET_MS));

  return <aside className="pointer-events-none fixed bottom-3 right-3 z-[60] w-[min(22rem,calc(100vw-1.5rem))] sm:bottom-5 sm:right-5" aria-label="Horloges flottantes">
    <div className="rounded-2xl border border-white/20 bg-slate-900/75 p-1.5 shadow-2xl backdrop-blur-md">
      <div className="mb-1 flex items-center justify-between px-1.5"><span className="text-[8px] font-bold uppercase tracking-[0.18em] text-white/60">Horloge de référence</span><span className="text-[8px] font-medium text-white/50">HH:MM:SS</span></div>
      <div className="grid grid-cols-2 gap-1.5"><ClockCard label="Locale" value={localTime} accent="blue" /><ClockCard label="JetX" value={jetxTime} accent="amber" /></div>
    </div>
  </aside>;
};
