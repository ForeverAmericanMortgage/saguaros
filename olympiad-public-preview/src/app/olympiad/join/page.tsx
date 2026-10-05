import type { Metadata } from 'next';
import JoinRoster from './JoinRoster';
export const metadata:Metadata={title:'Join your Olympiad team | The Saguaros',description:'Add your contact and shirt details to your team’s private Olympiad roster.',robots:{index:false,follow:false},referrer:'no-referrer'};
export default function JoinPage(){return <JoinRoster allowPreview={process.env.VERCEL_ENV === 'preview' || process.env.NODE_ENV === 'development'}/>;}
