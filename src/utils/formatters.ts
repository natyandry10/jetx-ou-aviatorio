import { JsonRecord, FilterState, SortConfig } from '../types';

export function formatDateFrench(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(d);
  } catch {
    return dateStr;
  }
}

export function formatDateShort(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(d);
  } catch {
    return dateStr;
  }
}

export function formatTimeOnly(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(d);
  } catch {
    return '';
  }
}

export function getCoefficientBadgeStyle(val: number): { bg: string; text: string; border: string; label: string } {
  if (val >= 100) {
    return {
      bg: 'bg-rose-500/10 dark:bg-rose-500/20',
      text: 'text-rose-700 dark:text-rose-300 font-bold',
      border: 'border-rose-300 dark:border-rose-800',
      label: 'Ultra Haut (≥100x)'
    };
  }
  if (val >= 10) {
    return {
      bg: 'bg-purple-500/10 dark:bg-purple-500/20',
      text: 'text-purple-700 dark:text-purple-300 font-semibold',
      border: 'border-purple-300 dark:border-purple-800',
      label: 'Très Haut (≥10x)'
    };
  }
  if (val >= 3) {
    return {
      bg: 'bg-blue-500/10 dark:bg-blue-500/20',
      text: 'text-blue-700 dark:text-blue-300 font-medium',
      border: 'border-blue-300 dark:border-blue-800',
      label: 'Élevé (≥3x)'
    };
  }
  if (val >= 2) {
    return {
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-300 dark:border-emerald-800',
      label: 'Moyen (≥2x)'
    };
  }
  return {
    bg: 'bg-slate-500/10 dark:bg-slate-500/20',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700',
    label: 'Standard (<2x)'
  };
}

export function extractUniqueYears(records: JsonRecord[]): string[] {
  const years = new Set<string>();
  records.forEach((r) => {
    try {
      const d = new Date(r.date_brute);
      if (!isNaN(d.getFullYear())) {
        years.add(String(d.getFullYear()));
      }
    } catch {
      // ignore
    }
  });
  return Array.from(years).sort();
}

export function extractUniqueMonths(records: JsonRecord[]): { value: string; label: string }[] {
  const months = [
    { value: '0', label: 'Janvier' },
    { value: '1', label: 'Février' },
    { value: '2', label: 'Mars' },
    { value: '3', label: 'Avril' },
    { value: '4', label: 'Mai' },
    { value: '5', label: 'Juin' },
    { value: '6', label: 'Juillet' },
    { value: '7', label: 'Août' },
    { value: '8', label: 'Septembre' },
    { value: '9', label: 'Octobre' },
    { value: '10', label: 'Novembre' },
    { value: '11', label: 'Décembre' }
  ];

  const presentMonthIndices = new Set<number>();
  records.forEach((r) => {
    try {
      const d = new Date(r.date_brute);
      if (!isNaN(d.getMonth())) {
        presentMonthIndices.add(d.getMonth());
      }
    } catch {
      // ignore
    }
  });

  return months.filter((m) => presentMonthIndices.has(Number(m.value)));
}

export function extractUniqueHours(records: JsonRecord[]): string[] {
  const hours = new Set<number>();
  records.forEach((r) => {
    try {
      const d = new Date(r.date_brute);
      if (!isNaN(d.getHours())) {
        hours.add(d.getHours());
      }
    } catch {
      // ignore
    }
  });
  return Array.from(hours)
    .sort((a, b) => a - b)
    .map((h) => String(h).padStart(2, '0'));
}

export function filterAndSortRecords(
  records: JsonRecord[],
  filter: FilterState,
  sort: SortConfig
): { filtered: JsonRecord[]; duplicateCoeffCount: number; duplicateHashCount: number } {
  // Pre-calculate frequency maps for duplicate detection
  const coeffCounts = new Map<number, number>();
  const hashCounts = new Map<string, number>();
  const dateCounts = new Map<string, number>();

  records.forEach((r) => {
    coeffCounts.set(r.coefficient, (coeffCounts.get(r.coefficient) || 0) + 1);
    hashCounts.set(r.hash, (hashCounts.get(r.hash) || 0) + 1);
    const dateKey = r.date_brute ? r.date_brute.substring(0, 19) : '';
    if (dateKey) {
      dateCounts.set(dateKey, (dateCounts.get(dateKey) || 0) + 1);
    }
  });

  let duplicateCoeffCount = 0;
  coeffCounts.forEach((count) => {
    if (count > 1) duplicateCoeffCount += count;
  });

  let duplicateHashCount = 0;
  hashCounts.forEach((count) => {
    if (count > 1) duplicateHashCount += count;
  });

  const filtered = records.filter((rec) => {
    const d = new Date(rec.date_brute);
    const isValidDate = !isNaN(d.getTime());

    // 1. Year filter
    if (filter.year !== 'all') {
      if (!isValidDate || String(d.getFullYear()) !== filter.year) {
        return false;
      }
    }

    // 2. Month filter
    if (filter.month !== 'all') {
      if (!isValidDate || String(d.getMonth()) !== filter.month) {
        return false;
      }
    }

    // 3. Date picker filter (YYYY-MM-DD)
    if (filter.date) {
      if (!isValidDate) return false;
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const formattedDate = `${y}-${m}-${day}`;
      if (formattedDate !== filter.date) {
        return false;
      }
    }

    // 4. Hour filter
    if (filter.hour !== 'all') {
      if (!isValidDate) return false;
      const h = String(d.getHours()).padStart(2, '0');
      if (h !== filter.hour) {
        return false;
      }
    }

    // 5. Coefficient Min/Max
    if (filter.minCoefficient !== '') {
      const min = parseFloat(filter.minCoefficient);
      if (!isNaN(min) && rec.coefficient < min) {
        return false;
      }
    }
    if (filter.maxCoefficient !== '') {
      const max = parseFloat(filter.maxCoefficient);
      if (!isNaN(max) && rec.coefficient > max) {
        return false;
      }
    }

    // 6. Free Search Query (Hash, dates, coefficient)
    if (filter.searchQuery.trim() !== '') {
      const query = filter.searchQuery.trim().toLowerCase();
      const matchHash = rec.hash.toLowerCase().includes(query);
      const matchCoeff = String(rec.coefficient).includes(query);
      const matchDateBrute = rec.date_brute.toLowerCase().includes(query);
      const matchDateUtc = rec.date_utc.toLowerCase().includes(query);
      if (!matchHash && !matchCoeff && !matchDateBrute && !matchDateUtc) {
        return false;
      }
    }

    // 7. Duplicate / Double filter
    const isCoeffDup = (coeffCounts.get(rec.coefficient) || 0) > 1;
    const isHashDup = (hashCounts.get(rec.hash) || 0) > 1;
    const dateKey = rec.date_brute ? rec.date_brute.substring(0, 19) : '';
    const isDateDup = (dateCounts.get(dateKey) || 0) > 1;
    const isAnyDup = isCoeffDup || isHashDup || isDateDup;

    if (filter.duplicateFilter === 'duplicates_only') {
      if (!isAnyDup) return false;
    } else if (filter.duplicateFilter === 'unique_only') {
      if (isAnyDup) return false;
    } else if (filter.duplicateFilter === 'duplicate_coeff') {
      if (!isCoeffDup) return false;
    } else if (filter.duplicateFilter === 'duplicate_date') {
      if (!isDateDup) return false;
    } else if (filter.duplicateFilter === 'duplicate_hash') {
      if (!isHashDup) return false;
    }

    return true;
  });

  // Sort filtered records
  filtered.sort((a, b) => {
    let comparison = 0;
    if (sort.field === 'coefficient') {
      comparison = a.coefficient - b.coefficient;
    } else if (sort.field === 'date_brute') {
      const timeA = new Date(a.date_brute).getTime() || 0;
      const timeB = new Date(b.date_brute).getTime() || 0;
      comparison = timeA - timeB;
    } else if (sort.field === 'date_utc') {
      const timeA = new Date(a.date_utc).getTime() || 0;
      const timeB = new Date(b.date_utc).getTime() || 0;
      comparison = timeA - timeB;
    } else if (sort.field === 'hash') {
      comparison = a.hash.localeCompare(b.hash);
    }
    return sort.direction === 'asc' ? comparison : -comparison;
  });

  return { filtered, duplicateCoeffCount, duplicateHashCount };
}

export function downloadJsonFile(records: JsonRecord[], fileName = 'donnees_export.json'): void {
  // Strip internal id if needed or preserve raw format
  const exportable = records.map(({ date_brute, date_utc, coefficient, hash }) => ({
    date_brute,
    date_utc,
    coefficient,
    hash
  }));
  const jsonStr = JSON.stringify(exportable, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadCsvFile(records: JsonRecord[], fileName = 'donnees_export.csv'): void {
  const headers = ['date_brute', 'date_utc', 'coefficient', 'hash'];
  const rows = records.map((r) => [
    `"${r.date_brute}"`,
    `"${r.date_utc}"`,
    r.coefficient,
    `"${r.hash}"`
  ]);
  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
