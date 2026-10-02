import { NextResponse } from 'next/server';
import { allowedOrigin, pilotClient } from '../../pilot/server';
import { uuid } from '../../pilot/validation';
export const dynamic = 'force-dynamic';
const headers = {'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
const fail = (error:string,status:number)=>NextResponse.json({error},{status,headers});
export async function POST(request:Request) {
 if(!allowedOrigin(request))return fail('Request not allowed.',403);
 if(Number(request.headers.get('content-length')||0)>4*1024*1024+65536)return fail('Choose an image up to 4 MB.',413);
 try {
  const client=await pilotClient();
  const {data:{user}}=await client.auth.getUser();
  if(!user?.email_confirmed_at)return fail('Sign in to update your team logo.',401);
  const form=await request.formData();const teamId=uuid(form.get('team_id'));
  const {data:team}=await client.from('teams').select('captain_user_id').eq('id',teamId).maybeSingle();
  if(!team||team.captain_user_id!==user.id)return fail('Only the captain can update this logo.',403);
  if(form.get('remove')==='true') {
   const {error}=await client.from('team_public_logos').delete().eq('team_id',teamId);
   if(error)return fail('Could not hide your logo. Please try again.',503);
   return NextResponse.json({ok:true},{headers});
  }
  if(form.get('publish')!=='true')return fail('Confirm that you want to show this logo publicly.',400);
  let file: File | Blob | null=form.get('logo') instanceof File ? form.get('logo') as File : null;
  if(!file?.size) {
   const {data:original}=await client.from('team_brand_assets').select('object_path,content_type').eq('team_id',teamId).maybeSingle();
   if(original&&['image/png','image/jpeg'].includes(original.content_type)){const {data}=await client.storage.from('olympiad-team-logos').download(original.object_path);file=data;}
  }
  if(!file||!file.size||file.size>4*1024*1024)return fail('Choose a PNG or JPG up to 4 MB.',400);
  const bytes=Buffer.from(await file.arrayBuffer());
  const png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  if(!png&&!jpeg)return fail('Use a PNG or JPG for the website. Keep your vector file in the original logo upload.',400);
  const contentType=png?'image/png':'image/jpeg';
  const path=`${teamId}/web-${crypto.randomUUID()}.${png?'png':'jpg'}`;
  const {error:uploadError}=await client.storage.from('olympiad-team-logos').upload(path,bytes,{contentType,upsert:false});
  if(uploadError)return fail('Could not upload your web logo. Please try again.',503);
  const updated=new Date().toISOString();
  const {error}=await client.from('team_public_logos').upsert({team_id:teamId,object_path:path,content_type:contentType,updated_at:updated},{onConflict:'team_id'});
  if(error)return fail('Could not save your web logo. Please try again.',503);
  return NextResponse.json({ok:true,logo_url:`/olympiad/api/public-logo?team_id=${teamId}&v=${encodeURIComponent(updated)}`},{headers});
 } catch {return fail('Could not update your logo. Please try again.',400);}
}
export async function GET(request:Request) {
 try {
  const client=await pilotClient();const teamId=uuid(new URL(request.url).searchParams.get('team_id'));
  const {data:listed}=await client.from('team_directory').select('id').eq('id',teamId).maybeSingle();
  if(!listed) {
   const {data:{user}}=await client.auth.getUser();
   if(!user)return fail('Logo unavailable.',404);
   const {data:team}=await client.from('teams').select('captain_user_id').eq('id',teamId).maybeSingle();
   if(!team||team.captain_user_id!==user.id)return fail('Logo unavailable.',404);
  }
  const {data:logo}=await client.from('team_public_logos').select('object_path,content_type').eq('team_id',teamId).maybeSingle();
  if(!logo||!['image/png','image/jpeg'].includes(logo.content_type))return fail('Logo unavailable.',404);
  const {data:file,error}=await client.storage.from('olympiad-team-logos').download(logo.object_path);
  if(error||!file)return fail('Logo unavailable.',404);
  return new Response(await file.arrayBuffer(),{headers:{...headers,'Content-Type':logo.content_type,'Content-Security-Policy':"sandbox; default-src 'none'"}});
 } catch {return fail('Logo unavailable.',404);}
}
