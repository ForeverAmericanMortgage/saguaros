import { NextResponse } from 'next/server';
import { allowedOrigin, pilotClient } from '../../pilot/server';
import { uuid, PilotInputError } from '../../pilot/validation';
export const dynamic = 'force-dynamic';
const BUCKET = 'olympiad-team-logos';
const MAX = 4 * 1024 * 1024;
const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie, Origin' };
const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers });
function fileType(bytes: Buffer, extension: string) {
 const text = bytes.subarray(0, 4096).toString('utf8');
 if (extension === 'png' && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'image/png';
 if (['jpg','jpeg'].includes(extension) && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
 if (['pdf','ai'].includes(extension) && text.startsWith('%PDF-')) return 'application/pdf';
 if (['eps','ai'].includes(extension) && text.startsWith('%!PS')) return 'application/postscript';
 if (extension === 'svg' && /<svg[\s>]/i.test(text) && !/<script|<!ENTITY|<!DOCTYPE|<foreignObject|\bon\w+\s*=|(?:href|src)\s*=\s*["']\s*(?:https?:|\/\/|data:|javascript:)/i.test(bytes.toString('utf8'))) return 'image/svg+xml';
 return null;
}
export async function POST(request: Request) {
 if (!allowedOrigin(request)) return fail('Request not allowed.',403);
 if (Number(request.headers.get('content-length') || 0) > MAX + 65536) return fail('Choose a logo smaller than 4 MB.',413);
 try {
  const client = await pilotClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user?.email_confirmed_at) return fail('Sign in again before uploading your logo.',401);
  const form = await request.formData();
  const teamId = uuid(form.get('team_id'));
  const file = form.get('logo');
  if (!(file instanceof File) || !file.size || file.size > MAX) return fail('Choose a PNG, JPG or vector logo up to 4 MB.',400);
  const { data: team, error: teamError } = await client.from('teams').select('id,captain_user_id').eq('id',teamId).maybeSingle();
  if (teamError || !team || team.captain_user_id !== user.id) return fail('Only the team captain can upload this logo.',403);
  const filename = file.name.split(/[\\/]/).pop()!.replace(/[^a-zA-Z0-9 ._()-]/g,'_').slice(-180);
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  const bytes = Buffer.from(await file.arrayBuffer());
  const contentType = fileType(bytes,extension);
  if (!contentType) return fail('This file does not match a supported logo format. Choose PNG, JPG, SVG, PDF, EPS or AI.',400);
  const path = `${teamId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await client.storage.from(BUCKET).upload(path,bytes,{contentType,upsert:false});
  if (uploadError) return fail('Your logo could not be uploaded. Please try again.',503);
  const asset = { team_id:teamId, object_path:path, filename, content_type:contentType, size_bytes:file.size, uploaded_by:user.id, updated_at:new Date().toISOString() };
  const { error: metadataError } = await client.from('team_brand_assets').upsert(asset,{onConflict:'team_id'});
  if (metadataError) return fail('Your file uploaded but could not be attached to your team. Please try again.',503);
  return NextResponse.json({ok:true,logo:{filename,content_type:contentType,size_bytes:file.size,updated_at:asset.updated_at}},{headers});
 } catch (error) { return fail(error instanceof PilotInputError ? error.message : 'We could not upload your logo. Please try again.',400); }
}
export async function GET(request: Request) {
 try {
  const client = await pilotClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user?.email_confirmed_at) return fail('Sign in to download this logo.',401);
  const teamId = uuid(new URL(request.url).searchParams.get('team_id'));
  const { data: asset,error } = await client.from('team_brand_assets').select('object_path,filename').eq('team_id',teamId).maybeSingle();
  if (error || !asset) return fail('Logo not found or access is unavailable.',404);
  const { data: file,error: downloadError } = await client.storage.from(BUCKET).download(asset.object_path);
  if (downloadError || !file) return fail('Your logo could not be downloaded.',503);
  return new Response(await file.arrayBuffer(),{headers:{...headers,'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename="${asset.filename.replace(/["\\\r\n]/g,'_')}"`,'X-Content-Type-Options':'nosniff','Content-Security-Policy':"sandbox; default-src 'none'"}});
 } catch { return fail('Logo not found or access is unavailable.',404); }
}
