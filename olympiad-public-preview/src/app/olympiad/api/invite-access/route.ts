import {NextResponse} from 'next/server';
import {allowedOrigin,pilotClient} from '../../pilot/server';
export async function POST(request:Request){
 const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});
 if(!allowedOrigin(request))return reply({error:'Open your invitation on the Olympiad website.'},403);
 try{const {token}=await request.json();if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))return reply({error:'This invitation is incomplete.'},400);
 const client=await pilotClient();const {data,error}=await client.rpc('recruit_invitation_details',{p_token:token});
 if(error||!data)return reply({error:'This invitation is unavailable or expired. Contact the event team.'},400);
 const result=reply(data);result.cookies.set('olympiad-recruit-invite',token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:172800});return result;
 }catch{return reply({error:'Unable to open this invitation. Try again shortly.'},503);}
}
