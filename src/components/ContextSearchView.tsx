import React from 'react';
import { CalendarSearch } from 'lucide-react';
import { JsonRecord } from '../types';
import { ContextSearchPanel } from './ContextSearchPanel';

interface ContextSearchViewProps {
  records: JsonRecord[];
  initialQuery?: string;
}

export const ContextSearchView: React.FC<ContextSearchViewProps> = ({ records, initialQuery }) => {
  return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in duration-300"><header className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-start gap-3"><div className="rounded-xl bg-fuchsia-100 p-2 text-fuchsia-700 dark:bg-fuchsia-950/50 dark:text-fuchsia-300"><CalendarSearch className="h-5 w-5" /></div><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-fuchsia-700 dark:text-fuchsia-300">Rubrique Recherche</p><h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">Recherche de contexte</h2><p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">Trouve un multiplicateur précis, choisis sa date et son heure, puis observe les résultats qui l’entourent.</p></div></div><span className="rounded-full bg-fuchsia-50 px-3 py-1.5 text-[10px] font-semibold text-fuchsia-700 dark:bg-fuchsia-950/50 dark:text-fuchsia-300">Recherche locale · {records.length} lignes</span></header><ContextSearchPanel records={records} initialQuery={initialQuery} /></div>;
};
