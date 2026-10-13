import 'server-only';
import {createCipheriv,createDecipheriv,createHash,randomBytes,timingSafeEqual} from 'node:crypto';
export function workerKey(){const k=process.env.OLYMPIAD_OUTREACH_WORKER_SECRET||'';if(k.length<32)throw Error('Cloud worker not configured');return k;}
function key(){return createHash('sha256').update('olympiad-mailbox-v1:'+workerKey()).digest();}
export function seal(pass:string){const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',key(),iv);const encrypted=Buffer.concat([c.update(pass,'utf8'),c.final()]);return [iv,c.getAuthTag(),encrypted].map(v=>v.toString('base64url')).join('.');}
export function unseal(value:string){const [iv,tag,data]=value.split('.').map(v=>Buffer.from(v,'base64url'));if(!iv||!tag||!data)throw Error('Invalid credential');const c=createDecipheriv('aes-256-gcm',key(),iv);c.setAuthTag(tag);return Buffer.concat([c.update(data),c.final()]).toString('utf8');}
export function workerAuthorized(request:Request){const input=request.headers.get('authorization')||'';const actual=Buffer.from(input);const expected=Buffer.from('Bearer '+workerKey());return actual.length===expected.length&&timingSafeEqual(actual,expected);}
