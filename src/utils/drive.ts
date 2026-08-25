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

async function readJsonResponse<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? `La requête Drive a échoué (${response.status}).`);
  }
  return data;
}

export async function listDriveJsonFiles(signal?: AbortSignal): Promise<DriveFile[]> {
  const response = await fetch('/api/drive-files', { signal });
  const data = await readJsonResponse<DriveFilesResponse>(response);
  return data.files ?? [];
}

export async function loadDriveJsonFile(
  fileId: string,
  signal?: AbortSignal
): Promise<{ records: JsonRecord[]; warnings: string[]; skippedCount: number; fileName: string }> {
  const url = new URL('/api/drive-file', window.location.origin);
  url.searchParams.set('fileId', fileId);
  const response = await fetch(url, { signal });
  const data = await readJsonResponse<DriveFileContentResponse>(response);
  const fileName = data.name ?? 'fichier Drive';
  const parsed = parseJsonRecords(data.content, fileName);
  return { ...parsed, fileName };
}
