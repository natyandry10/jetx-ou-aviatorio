interface ApiRequest {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
}

interface ApiResponse {
  setHeader(name: string, value: string): void;
  status(code: number): ApiResponse;
  json(body: unknown): void;
}

interface DriveFileResponse {
  id: string;
  name: string;
  mimeType: string;
}

interface DriveFileListResponse {
  files?: DriveFileResponse[];
}

function getDriveConfig(): { apiKey: string; folderId: string } | null {
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!apiKey || !folderId) return null;
  return { apiKey, folderId };
}

function getQueryValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function isJsonFile(file: DriveFileResponse): boolean {
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
  const fileId = getQueryValue(req.query?.fileId);
  if (!config || !fileId) {
    res.status(400).json({ error: 'La configuration Google Drive ou le fichier demandé est absent.' });
    return;
  }

  try {
    const folderFilesUrl = new URL('https://www.googleapis.com/drive/v3/files');
    folderFilesUrl.searchParams.set(
      'q',
      `'${config.folderId}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`
    );
    folderFilesUrl.searchParams.set('pageSize', '100');
    folderFilesUrl.searchParams.set('fields', 'files(id,name,mimeType)');
    folderFilesUrl.searchParams.set('key', config.apiKey);

    const folderFilesResponse = await fetch(folderFilesUrl);
    if (!folderFilesResponse.ok) {
      res.status(502).json({ error: `Google Drive a répondu avec le statut ${folderFilesResponse.status}.` });
      return;
    }

    const folderFiles = (await folderFilesResponse.json()) as DriveFileListResponse;
    const metadata = folderFiles.files?.find((file) => file.id === fileId && isJsonFile(file));
    if (!metadata) {
      res.status(403).json({ error: 'Le fichier ne se trouve pas dans le dossier Drive configuré.' });
      return;
    }

    const contentUrl = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`);
    contentUrl.searchParams.set('alt', 'media');
    contentUrl.searchParams.set('key', config.apiKey);
    const contentResponse = await fetch(contentUrl);
    if (!contentResponse.ok) {
      res.status(502).json({ error: `Le téléchargement Drive a échoué (${contentResponse.status}).` });
      return;
    }

    const content = await contentResponse.json();
    res.status(200).json({ name: metadata.name, content });
  } catch {
    res.status(502).json({ error: 'Impossible de télécharger le JSON depuis Google Drive.' });
  }
}
