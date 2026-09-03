import React from 'react';
import { GitBranch, Radio } from 'lucide-react';
import { JsonRecord } from '../types';
import { SequenceScannerPanel } from './SequenceScannerPanel';
import { PrecedingSequencePanel } from './PrecedingSequencePanel';
import { ConditionalTransitionPanel } from './ConditionalTransitionPanel';

interface SequencesViewProps {
  records: JsonRecord[];
}

export const SequencesView: React.FC<SequencesViewProps> = ({ records }) => {
  return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in duration-300"><header className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-start gap-3"><div className="rounded-xl bg-fuchsia-100 p-2 text-fuchsia-700 dark:bg-fuchsia-950/50 dark:text-fuchsia-300"><GitBranch className="h-5 w-5" /></div><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-fuchsia-700 dark:text-fuchsia-300">Rubrique Séquences</p><h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">Séquences observées</h2><p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">Explore les motifs répétés, les intervalles et les résultats observés après ou avant une séquence, sans les mélanger aux statistiques générales.</p></div></div><span className="inline-flex items-center gap-1.5 rounded-full bg-fuchsia-50 px-3 py-1.5 text-[10px] font-semibold text-fuchsia-700 dark:bg-fuchsia-950/50 dark:text-fuchsia-300"><Radio className="h-3.5 w-3.5" />Analyse historique</span></header>{records.length === 0 ? <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100">Aucune donnée valide à analyser. Importe ou ajoute d’abord des résultats dans <strong>Saisie &amp; Données</strong>.</section> : <><SequenceScannerPanel records={records} /><PrecedingSequencePanel records={records} /><ConditionalTransitionPanel records={records} /></>}</div>;
};
