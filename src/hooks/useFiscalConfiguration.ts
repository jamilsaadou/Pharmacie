'use client';
import { useEffect, useState } from 'react';
let cache: {value:any;time:number}|null=null;let pending:Promise<any>|null=null;
async function load() { if(cache&&Date.now()-cache.time<20000)return cache.value; if(!pending)pending=fetch('/api/esecef/config').then(async r=>r.ok?await r.json():null).catch(()=>null).then(value=>{cache={value,time:Date.now()};pending=null;return value;});return pending; }
export function invalidateFiscalConfiguration(){cache=null;pending=null;window.dispatchEvent(new Event('pharmacare:config-changed'));}
export function useFiscalConfiguration() {
  const [configuration,setConfiguration]=useState<any>(null);const [loading,setLoading]=useState(true);
  useEffect(()=>{let mounted=true;const refresh=()=>{setLoading(true);void load().then(value=>{if(mounted){setConfiguration(value);setLoading(false);}});};refresh();window.addEventListener('pharmacare:config-changed',refresh);return()=>{mounted=false;window.removeEventListener('pharmacare:config-changed',refresh);};},[]);
  return {configuration,loading};
}
