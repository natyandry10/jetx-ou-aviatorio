import { JsonRecord } from '../types';
import { parseJsonRecords } from './recordParser';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
}

interface DriveFilesResponse {
  files?: DriveFile[];
  error?: string;
}

interface DriveFileContentResponse {
  name?: string;
  content?: unknown;
  error?: string;
}

const DIRECT_DRIVE_FOLDER_ID = import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID?.trim() || '124twvdWV2AEkMk3_92v99RV_cDcEle8R';
const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';

function isJsonFile(file: DriveFile): boolean {
  return file.mimeType === 'application/json'
    || file.mimeType === 'text/json'
    || file.name.toLowerCase().endsWith('.json');
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  let data: (T & { error?: string }) | null = null;
  try {
    data = (await response.json()) as T & { error?: string };
  } catch {
    throw new Error('Le service Drive est indisponible dans cet environnement. Utilise une prévisualisation ou la production Vercel pour tester la comparaison.');
  }

  if (!response.ok) {
    throw new Error(data?.error ?? `La requête Drive a échoué (${response.status}).`);
  }
  return data;
}

export async function listDriveJsonFiles(accessToken?: string, signal?: AbortSignal): Promise<DriveFile[]> {
  if (accessToken && DIRECT_DRIVE_FOLDER_ID) {
    const url = new URL(`${DRIVE_API_BASE}/files`);
    url.searchParams.set('q', `'${DIRECT_DRIVE_FOLDER_ID}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`);
    url.searchParams.set('pageSize', '100');
    url.searchParams.set('orderBy', 'modifiedTime desc');
    url.searchParams.set('fields', 'files(id,name,mimeType,modifiedTime,size)');
    const response = await fetch(url, { signal, cache: 'no-store', headers: { Authorization: `Bearer ${accessToken}`, 'Cache-Control': 'no-cache' } });
    const data = await readJsonResponse<DriveFilesResponse>(response);
    return (data.files ?? []).filter(isJsonFile);
  }
  const response = await fetch(`/api/drive-files?refresh=${Date.now()}`, { signal, cache: 'no-store' });
  const data = await readJsonResponse<DriveFilesResponse>(response);
  return (data.files ?? []).filter(isJsonFile);
}

export async function loadDriveJsonFile(
  fileId: string,
  signal?: AbortSignal,
  accessToken?: string,
  fileNameHint?: string,
): Promise<{ records: JsonRecord[]; warnings: string[]; skippedCount: number; nonDataCount: number; fileName: string }> {
  if (accessToken && DIRECT_DRIVE_FOLDER_ID) {
    const url = new URL(`${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}`);
    url.searchParams.set('alt', 'media');
    const response = await fetch(url, { signal, cache: 'no-store', headers: { Authorization: `Bearer ${accessToken}`, 'Cache-Control': 'no-cache' } });
    const content = await readJsonResponse<unknown>(response);
    const fileName = fileNameHint ?? 'fichier Drive';
    const parsed = parseJsonRecords(content, fileName);
    return { ...parsed, fileName };
  }
  const url = new URL('/api/drive-file', window.location.origin);
  url.searchParams.set('fileId', fileId);
  const response = await fetch(`${url.toString()}&refresh=${Date.now()}`, { signal, cache: 'no-store' });
  const data = await readJsonResponse<DriveFileContentResponse>(response);
  const fileName = data.name ?? fileNameHint ?? 'fichier Drive';
  const parsed = parseJsonRecords(data.content, fileName);
  return { ...parsed, fileName };
}
