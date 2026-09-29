import { NextResponse } from 'next/server';
import { allowedOrigin, pilotClient, pilotConfiguration, pilotEmailAllowed, SITE_URL } from '../../pilot/server';
import { magicHeaders, validMagicPayload } from '../magic-link';

export const dynamic = 'force-dynamic';

// GET never exchanges credentials. Email scanners may load this page safely.
export async function GET() {
  const nonce = crypto.randomUUID();
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="referrer" content="no-referrer"><title>Continue to Olympiad</title><style nonce="${nonce}">body{margin:0;background:#f7f5ee;color:#123d32;font:18px system-ui,sans-serif;min-height:100dvh;display:grid;place-items:center}main{box-sizing:border-box;width:min(100%,480px);padding:32px}h1{font-size:32px;line-height:1.1}button,a{font:inherit}button{background:#123d32;color:white;border:0;border-radius:8px;padding:16px 20px;min-height:48px;cursor:pointer;width:100%}button:disabled{opacity:.6;cursor:wait}a{color:#123d32}p{line-height:1.5}small{letter-spacing:.12em}#status{min-height:3em}</style></head><body><main><small>SCOTTSDALE OLYMPIAD 2027</small><h1>Your team starts here.</h1><p>Continue to securely open your team hub. On your first visit, we’ll help you register your team.</p><button id="continue" type="button">Continue to team hub</button><p id="status" role="status" aria-live="polite"></p><a href="/#captain">Request a new sign-in link</a><noscript><p>Enable JavaScript to continue securely, then reopen the link from your email.</p></noscript></main><script nonce="${nonce}">
(function(){
  var params = new URLSearchParams(window.location.hash.slice(1));
  var token = params.get('token_hash'); var type = params.get('type');
  window.history.replaceState(null, '', window.location.pathname);
  var button = document.getElementById('continue'); var status = document.getElementById('status');
  if (!token || !/^[a-zA-Z0-9_-]{32,256}$/.test(token) || type !== 'email') {button.hidden=true;status.textContent='This link is incomplete. Request a new sign-in link below.';return;}
  button.addEventListener('click', async function(){
    button.disabled=true; status.textContent='Opening your team hub…';
    try {
      var response=await fetch(window.location.pathname,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({token_hash:token,type:'email'})});
      var data=await response.json();
      if(!response.ok){status.textContent=data.error || 'This link could not be completed. Request a new sign-in link below.';button.hidden=true;token=null;return;}
      token=null;window.location.replace('/#captain');
    } catch {status.textContent='Connection interrupted. Try Continue again. If it still fails, request a new link below.';button.disabled=false;}
  });
})();</script></body></html>`;
  return new NextResponse(html, { headers: { ...magicHeaders, 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'` } });
}

export async function POST(request: Request) {
  const fail = (error: string, status: number) => NextResponse.json({error}, {status, headers:magicHeaders});
  if (!allowedOrigin(request)) return fail('Open your sign-in link on the Olympiad website.',403);
  if (!pilotConfiguration().enabled) return fail('Captain access is not available yet. Please try again later.',503);
  if (!request.headers.get('content-type')?.includes('application/json')) return fail('This link could not be completed. Request a new sign-in link.',400);
  try {
    const reader=request.body?.getReader(); if(!reader) return fail('This link is incomplete.',400);
    const chunks:Uint8Array[]=[];let length=0;
    for(;;){const {value,done}=await reader.read();if(done)break;length+=value.byteLength;if(length>2048){await reader.cancel();return fail('This link is invalid.',400);}chunks.push(value);}
    let payload:unknown;try{payload=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return fail('This link is invalid.',400);}
    if(!validMagicPayload(payload))return fail('This link is invalid. Request a new sign-in link.',400);
    const client=await pilotClient();
    const {data,error}=await client.auth.verifyOtp({token_hash:payload.token_hash,type:'email'});
    if(error || !data.session || !data.user?.email_confirmed_at) return fail('This sign-in link has expired or was already used. Request a new link below.',400);
    if(!data.user.email || !pilotEmailAllowed(data.user.email)) {
      await client.auth.signOut({scope:'local'});
      return fail('Captain access is currently limited to the invited pilot.',403);
    }
    return NextResponse.json({ok:true,redirect:new URL('/#captain',SITE_URL).toString()},{headers:magicHeaders});
  } catch {return fail('We could not complete sign-in. Request a new link and try again.',503);}
}
