interface ApiRequest {
  method?: string;
}

interface ApiResponse {
  setHeader(name: string, value: string): void;
  status(code: number): ApiResponse;
  json(body: unknown): void;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
}

interface DriveFileListResponse {
  files?: DriveFile[];
}

function getDriveConfig(): { apiKey: string; folderId: string } | null {
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!apiKey || !folderId) return null;
  return { apiKey, folderId };
}

function isJsonFile(file: DriveFile): boolean {
  return file.mimeType === 'application/json'
    || file.mimeType === 'text/json'
    || file.name.toLowerCase().endsWith('.json');
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Méthode non autorisée.' });
    return;
  }

  const config = getDriveConfig();
  if (!config) {
    res.status(500).json({ error: 'La configuration Google Drive est absente côté serveur.' });
    return;
  }

  const url = new URL('https://www.googleapis.com/drive/v3/files');
  url.searchParams.set(
    'q',
    `'${config.folderId}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`
  );
  url.searchParams.set('orderBy', 'modifiedTime desc');
  url.searchParams.set('pageSize', '100');
  url.searchParams.set('fields', 'files(id,name,mimeType,modifiedTime,size)');
  url.searchParams.set('key', config.apiKey);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      res.status(502).json({ error: `Google Drive a répondu avec le statut ${response.status}.` });
      return;
    }

    const data = (await response.json()) as DriveFileListResponse;
    const files = (data.files ?? []).filter(
      (file) => file.id && file.name && isJsonFile(file)
    );
    res.status(200).json({ files });
  } catch {
    res.status(502).json({ error: 'Impossible de contacter Google Drive.' });
  }
}
