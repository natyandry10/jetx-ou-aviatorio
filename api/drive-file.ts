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
  id?: string;
  name?: string;
  mimeType?: string;
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

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

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

  const metadataUrl = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`);
  metadataUrl.searchParams.set('fields', 'id,name,mimeType');
  metadataUrl.searchParams.set('key', config.apiKey);

  try {
    const metadataResponse = await fetch(metadataUrl);
    if (!metadataResponse.ok) {
      res.status(502).json({ error: `Google Drive a répondu avec le statut ${metadataResponse.status}.` });
      return;
    }

    const metadata = (await metadataResponse.json()) as DriveFileResponse;
    if (metadata.mimeType !== 'application/json') {
      res.status(400).json({ error: 'Le fichier sélectionné n’est pas un fichier JSON.' });
      return;
    }

    const isInConfiguredFolder = await verifyFileParent(fileId, config);
    if (!isInConfiguredFolder) {
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
    res.status(200).json({ name: metadata.name ?? 'fichier.json', content });
  } catch {
    res.status(502).json({ error: 'Impossible de télécharger le JSON depuis Google Drive.' });
  }
}

async function verifyFileParent(fileId: string, config: { apiKey: string; folderId: string }): Promise<boolean> {
  const url = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`);
  url.searchParams.set('fields', 'parents');
  url.searchParams.set('key', config.apiKey);

  const response = await fetch(url);
  if (!response.ok) return false;
  const data = (await response.json()) as { parents?: string[] };
  return data.parents?.includes(config.folderId) ?? false;
}
