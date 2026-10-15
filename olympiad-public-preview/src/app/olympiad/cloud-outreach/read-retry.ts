// Retry only an interrupted read, never a send, a claim, or an identity/content rejection.
export async function retryMailboxRead<T>(read:()=>Promise<T>,reconnect:()=>Promise<void>):Promise<T>{
 try{return await read();}catch(error){
  const code=error&&typeof error==='object'&&'code' in error?String(error.code):'';
  if(!['ETIMEDOUT','ECONNRESET','EPIPE','NoConnection','ConnectionClosed','SocketTimeout'].includes(code))throw error;
  await reconnect();return read();
 }
}
