// Upload bytes directly to private storage; the API authorizes and validates the original.
export async function uploadTeamLogo(teamId: string, file: File, onProgress: (message: string) => void) {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const vector = ['svg', 'pdf', 'eps', 'ai'].includes(extension);
  if (!vector && !['png', 'jpg', 'jpeg'].includes(extension)) throw new Error('Choose PNG, JPG, SVG, PDF, EPS or AI.');
  if (!file.size || file.size > (vector ? 20 : 4) * 1024 * 1024) throw new Error(vector ? 'Choose a vector original up to 20 MB.' : 'Choose a PNG or JPG up to 4 MB.');
  const metadata = { team_id: teamId, filename: file.name, size: file.size };
  async function request(body: object) {
    const response = await fetch('/olympiad/api/logo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Your logo could not be saved. Please retry.');
    return result;
  }
  onProgress('Preparing upload…');
  const signed = await request({ ...metadata, action: 'prepare' });
  // Illustrator files can contain PDF or PostScript. Ignore unreliable OS MIME labels.
  const signature = await file.slice(0, 5).text();
  const contentType = extension === 'ai' ? (signature === '%PDF-' ? 'application/pdf' : 'application/postscript') : ({ png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', svg: 'image/svg+xml', pdf: 'application/pdf', eps: 'application/postscript' } as Record<string, string>)[extension];
  onProgress('Uploading original…');
  const response = await fetch(signed.url, { method: 'PUT', headers: { 'Content-Type': contentType, 'x-upsert': 'false' }, body: file });
  if (!response.ok) throw new Error('The upload did not finish. Your previous logo is unchanged. Please retry.');
  onProgress('Checking and saving…');
  return request({ ...metadata, action: 'complete', path: signed.path });
}
