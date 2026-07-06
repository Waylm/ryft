import { Directory, File, Paths } from 'expo-file-system';

const PHOTO_DIR = 'photos';

/**
 * Copy a picked image out of the volatile cache into the app's document
 * directory so it survives app restarts. Returns the persistent file:// uri.
 */
export function persistPhoto(srcUri: string): string {
  const dir = new Directory(Paths.document, PHOTO_DIR);
  if (!dir.exists) dir.create({ intermediates: true });

  const rawExt = srcUri.split('?')[0].split('.').pop();
  const ext = rawExt && rawExt.length <= 5 ? rawExt : 'jpg';
  const name = `${Date.now()}_${Math.floor(Math.random() * 1e6)}.${ext}`;

  const dest = new File(dir, name);
  new File(srcUri).copy(dest);
  return dest.uri;
}

/** Best-effort delete of a persisted photo file. */
export function deletePhotoFile(uri: string): void {
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // ignore — the DB row is the source of truth for the UI
  }
}
