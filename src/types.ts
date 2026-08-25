export interface JsonRecord {
  id: string;
  date_brute: string;
  date_utc: string;
  coefficient: number;
  hash: string;
}

export type DuplicateFilterType = 'all' | 'duplicates_only' | 'unique_only' | 'duplicate_coeff' | 'duplicate_date' | 'duplicate_hash';

export interface FilterState {
  year: string; // 'all' or '2026', etc.
  month: string; // 'all' or '0'..'11'
  date: string; // 'YYYY-MM-DD' or ''
  hour: string; // 'all' or '0'..'23'
  duplicateFilter: DuplicateFilterType;
  minCoefficient: string;
  maxCoefficient: string;
  searchQuery: string;
}

export type SortField = 'date_brute' | 'date_utc' | 'coefficient' | 'hash';
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export type ActiveTab = 'accueil' | 'saisie' | 'analyse' | 'tools';

export interface ImportMetadata {
  source: 'local' | 'drive';
  fileName: string;
  modifiedTime?: string;
  warnings?: string[];
  skippedCount?: number;
  nonDataCount?: number;
}

export interface ImportSummary extends ImportMetadata {
  mode: 'replace' | 'append';
  receivedCount: number;
  importedCount: number;
  duplicateCount: number;
  importedAt: string;
}

export type DriveSyncState = 'idle' | 'loading' | 'success' | 'error';

export interface DriveSyncStatus {
  state: DriveSyncState;
  message?: string;
  fileName?: string;
  modifiedTime?: string;
  syncedAt?: string;
  availableFiles?: number;
}
