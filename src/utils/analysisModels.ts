import { AnalysisModel } from './storage';

const now = '2026-01-01T00:00:00.000Z';

export const DEFAULT_ANALYSIS_MODELS: AnalysisModel[] = [
  {
    id: 'preceding-sequence',
    name: 'Chaînes avant gros multiplicateur',
    description: 'Analyse les multiplicateurs et intervalles précédant un résultat au-dessus d’un seuil.',
    kind: 'preceding-sequence',
    config: { threshold: 30, lookback: 5, mode: 'bands', exactPrecision: 2 },
    builtIn: true,
    updatedAt: now,
  },
  {
    id: 'live-similarity-5',
    name: 'Similarité LIVE — 5 tours',
    description: 'Compare les 5 derniers tours à des fenêtres historiques comparables.',
    kind: 'live-similarity',
    config: { lookback: 5, threshold: 30, horizonMinutes: 60, mode: 'bands', minimumMatches: 20 },
    builtIn: true,
    updatedAt: now,
  },
  {
    id: 'live-similarity-10',
    name: 'Similarité LIVE — 10 tours',
    description: 'Compare les 10 derniers tours avec une fenêtre historique plus longue.',
    kind: 'live-similarity',
    config: { lookback: 10, threshold: 30, horizonMinutes: 60, mode: 'bands', minimumMatches: 20 },
    builtIn: true,
    updatedAt: now,
  },
  {
    id: 'live-similarity-20',
    name: 'Similarité LIVE — 20 tours',
    description: 'Recherche des fenêtres historiques très proches sur les 20 derniers tours.',
    kind: 'live-similarity',
    config: { lookback: 20, threshold: 30, horizonMinutes: 60, mode: 'bands', minimumMatches: 20 },
    builtIn: true,
    updatedAt: now,
  },
  {
    id: 'top-period',
    name: 'Top >30x par période',
    description: 'Classe les gros multiplicateurs historiques par heure, jour, mois et année.',
    kind: 'top-period',
    config: { threshold: 30, granularity: 'month' },
    builtIn: true,
    updatedAt: now,
  },
];
