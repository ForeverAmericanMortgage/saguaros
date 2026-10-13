import 'server-only';
import {ImapFlow} from 'imapflow';
import nodemailer from 'nodemailer';
import {sender} from './model';
export function mailbox(pass:string){const c=new ImapFlow({host:'imap.gmail.com',port:993,secure:true,auth:{user:sender,pass},logger:false,disableAutoIdle:true,connectionTimeout:15000,greetingTimeout:15000,socketTimeout:20000});c.on('error',()=>{});return c;}
export function transport(pass:string){return nodemailer.createTransport({host:'smtp.gmail.com',port:465,secure:true,auth:{user:sender,pass},logger:false,debug:false,connectionTimeout:15000,greetingTimeout:15000,socketTimeout:20000,disableFileAccess:true,disableUrlAccess:true});}
export async function verifyMailbox(pass:string){const c=mailbox(pass);try{await c.connect();await transport(pass).verify();}finally{c.close();}}
